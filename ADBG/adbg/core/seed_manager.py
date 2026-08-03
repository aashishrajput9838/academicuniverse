"""
ADBG Seed Manager — Deterministic, Splittable Random Number Generation.

This module provides the foundational RNG infrastructure for the entire ADBG
framework. Every random decision in the pipeline — document type selection,
template choice, data fabrication, degradation parameters — flows through
SeedManager instances.

Architecture:
    The master SeedManager is created once from the user-supplied seed. For each
    document, a child SeedManager is spawned via `child()`. Children produce
    independent, provably non-overlapping random streams thanks to NumPy's
    SeedSequence.spawn() mechanism.

    Master (seed=42)
    ├── Child 0 (document 1) ── independent stream
    ├── Child 1 (document 2) ── independent stream
    ├── Child 2 (document 3) ── independent stream
    └── ...

Reproducibility Guarantee:
    Given the same seed, SeedManager will always produce the exact same sequence
    of child seeds and random values, regardless of execution order or platform.

Why NumPy over stdlib `random`:
    NumPy's SeedSequence provides mathematically guaranteed independent child
    streams via a counter-based design. stdlib's `random.Random` does not
    support safe stream splitting.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date, timedelta
from typing import Any, TypeVar

import numpy as np

T = TypeVar("T")


class SeedManager:
    """
    Deterministic, splittable random number generator.

    Wraps NumPy's Generator with SeedSequence for reproducible, independent
    child streams. All randomness in the ADBG pipeline must flow through
    SeedManager instances.

    Usage:
        >>> master = SeedManager(seed=42)
        >>> child = master.child()
        >>> child.random_int(0, 100)
        74  # Always the same for seed=42, child index=0

    Thread Safety:
        SeedManager instances are NOT thread-safe. Each thread/process should
        use its own child SeedManager.
    """

    __slots__ = ("_seed_seq", "_rng", "_child_index")

    def __init__(self, seed: int) -> None:
        """
        Create a new SeedManager from an integer seed.

        Args:
            seed: The master seed value. Must be a non-negative integer.
        """
        self._seed_seq = np.random.SeedSequence(seed)
        self._rng = np.random.default_rng(self._seed_seq)
        self._child_index = 0

    @classmethod
    def _from_seed_sequence(cls, seed_seq: np.random.SeedSequence) -> SeedManager:
        """
        Internal factory: create a SeedManager from an existing SeedSequence.

        This is used by `child()` to avoid re-hashing the seed.
        """
        instance = object.__new__(cls)
        instance._seed_seq = seed_seq
        instance._rng = np.random.default_rng(seed_seq)
        instance._child_index = 0
        return instance

    def child(self) -> SeedManager:
        """
        Spawn a deterministic child SeedManager.

        Each call to `child()` produces a new, independent RNG stream that is
        fully determined by the parent's SeedSequence and the child index.
        The child's stream will never overlap with the parent's or any sibling's.

        Returns:
            A new SeedManager with an independent random stream.
        """
        child_seq = self._seed_seq.spawn(1)[0]
        self._child_index += 1
        return SeedManager._from_seed_sequence(child_seq)

    @property
    def rng(self) -> np.random.Generator:
        """Access the underlying NumPy Generator (for advanced use)."""
        return self._rng

    @property
    def entropy(self) -> int:
        """Return the original entropy (seed) used to create this SeedManager."""
        entropy = self._seed_seq.entropy
        if isinstance(entropy, int):
            return entropy
        if isinstance(entropy, (tuple, list)) and len(entropy) > 0:
            return int(entropy[0])
        return 0

    # -------------------------------------------------------------------
    # Scalar random values
    # -------------------------------------------------------------------

    def random_float(self, low: float = 0.0, high: float = 1.0) -> float:
        """
        Generate a random float in [low, high).

        Args:
            low: Lower bound (inclusive). Default 0.0.
            high: Upper bound (exclusive). Default 1.0.

        Returns:
            A deterministic random float.
        """
        return float(self._rng.uniform(low, high))

    def random_int(self, low: int, high: int) -> int:
        """
        Generate a random integer in [low, high] (both inclusive).

        Args:
            low: Lower bound (inclusive).
            high: Upper bound (inclusive).

        Returns:
            A deterministic random integer.
        """
        return int(self._rng.integers(low, high, endpoint=True))

    def random_bool(self, probability: float = 0.5) -> bool:
        """
        Generate a random boolean with the given probability of True.

        Args:
            probability: Probability of returning True (0.0 to 1.0).

        Returns:
            A deterministic random boolean.
        """
        return bool(self._rng.random() < probability)

    # -------------------------------------------------------------------
    # Selection from sequences
    # -------------------------------------------------------------------

    def pick(self, items: Sequence[T]) -> T:
        """
        Pick a single random item from a sequence (uniform distribution).

        Args:
            items: Non-empty sequence to pick from.

        Returns:
            A single randomly selected item.

        Raises:
            ValueError: If items is empty.
        """
        if not items:
            raise ValueError("Cannot pick from an empty sequence.")
        idx = int(self._rng.integers(0, len(items)))
        return items[idx]

    def pick_weighted(self, items: Sequence[T], weights: Sequence[float]) -> T:
        """
        Pick a single item using weighted probabilities.

        Args:
            items: Non-empty sequence to pick from.
            weights: Probability weights (will be normalized to sum to 1.0).

        Returns:
            A single randomly selected item.

        Raises:
            ValueError: If items is empty or lengths don't match.
        """
        if not items:
            raise ValueError("Cannot pick from an empty sequence.")
        if len(items) != len(weights):
            raise ValueError(
                f"Items ({len(items)}) and weights ({len(weights)}) must have same length."
            )
        total = sum(weights)
        if total <= 0:
            raise ValueError("Weights must sum to a positive value.")
        normalized = [w / total for w in weights]
        idx = int(self._rng.choice(len(items), p=normalized))
        return items[idx]

    def pick_multiple(self, items: Sequence[T], count: int) -> list[T]:
        """
        Pick multiple items without replacement (uniform distribution).

        Args:
            items: Sequence to pick from.
            count: Number of items to select.

        Returns:
            A list of `count` randomly selected items (no duplicates).

        Raises:
            ValueError: If count > len(items).
        """
        if count > len(items):
            raise ValueError(
                f"Cannot pick {count} items from sequence of length {len(items)}."
            )
        indices = self._rng.choice(len(items), size=count, replace=False)
        return [items[int(i)] for i in indices]

    def shuffle(self, items: list[Any]) -> list[Any]:
        """
        Return a new list with items in random order.

        Args:
            items: List to shuffle.

        Returns:
            A new shuffled list (original is not modified).
        """
        result = list(items)
        self._rng.shuffle(result)
        return result

    # -------------------------------------------------------------------
    # Domain-specific convenience methods
    # -------------------------------------------------------------------

    def random_date(self, start_year: int, end_year: int) -> str:
        """
        Generate a random date string in ISO 8601 format (YYYY-MM-DD).

        Args:
            start_year: Earliest year (inclusive).
            end_year: Latest year (inclusive).

        Returns:
            A date string like '2024-03-15'.
        """
        start = date(start_year, 1, 1)
        end = date(end_year, 12, 31)
        delta_days = (end - start).days
        random_days = self.random_int(0, delta_days)
        result_date = start + timedelta(days=random_days)
        return result_date.isoformat()

    def child_seed_value(self) -> int:
        """
        Generate a deterministic integer seed for external RNG consumers.

        Useful when a third-party library (e.g., Faker) needs an integer seed
        rather than a NumPy Generator.

        Returns:
            A deterministic non-negative integer seed.
        """
        return self.random_int(0, 2**31 - 1)
