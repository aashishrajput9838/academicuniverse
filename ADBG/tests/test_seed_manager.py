"""
Tests for ADBG SeedManager — Deterministic RNG verification.

These tests verify the core reproducibility guarantee: the same seed
must always produce the exact same sequence of random values, child
seeds, and selections, regardless of platform or Python version.
"""

from __future__ import annotations

import re

import pytest

from adbg.core.seed_manager import SeedManager


class TestSeedManagerDeterminism:
    """Verify that identical seeds produce identical outputs."""

    def test_same_seed_same_floats(self, seed_42: SeedManager) -> None:
        """Two SeedManagers with seed=42 must produce identical float sequences."""
        other = SeedManager(seed=42)

        for _ in range(100):
            assert seed_42.random_float() == other.random_float()

    def test_same_seed_same_ints(self, seed_42: SeedManager) -> None:
        """Two SeedManagers with seed=42 must produce identical int sequences."""
        other = SeedManager(seed=42)

        for _ in range(100):
            assert seed_42.random_int(0, 1000) == other.random_int(0, 1000)

    def test_same_seed_same_picks(self, seed_42: SeedManager) -> None:
        """Two SeedManagers with seed=42 must select the same items."""
        other = SeedManager(seed=42)
        items = ["alpha", "beta", "gamma", "delta", "epsilon"]

        for _ in range(50):
            assert seed_42.pick(items) == other.pick(items)

    def test_different_seeds_different_outputs(self) -> None:
        """Different seeds must produce different random sequences."""
        a = SeedManager(seed=42)
        b = SeedManager(seed=99)

        # Sample 20 floats from each — expect at least one difference
        floats_a = [a.random_float() for _ in range(20)]
        floats_b = [b.random_float() for _ in range(20)]

        assert floats_a != floats_b

    def test_child_determinism(self, seed_42: SeedManager) -> None:
        """Children spawned from the same parent must be deterministic."""
        other = SeedManager(seed=42)

        child_a = seed_42.child()
        child_b = other.child()

        for _ in range(50):
            assert child_a.random_float() == child_b.random_float()

    def test_child_independence(self, seed_42: SeedManager) -> None:
        """
        Parent and child must produce independent streams.

        After spawning a child, the parent's stream should not be
        affected by operations on the child.
        """
        parent_copy = SeedManager(seed=42)

        # Spawn child from seed_42 and consume from child
        child = seed_42.child()
        _ = [child.random_float() for _ in range(100)]

        # Spawn child from copy too (to advance its spawn counter)
        _ = parent_copy.child()

        # Parent streams should still be synchronized
        for _ in range(50):
            assert seed_42.random_float() == parent_copy.random_float()

    def test_sibling_independence(self, seed_42: SeedManager) -> None:
        """Two children from the same parent must have different streams."""
        child_1 = seed_42.child()
        child_2 = seed_42.child()

        floats_1 = [child_1.random_float() for _ in range(20)]
        floats_2 = [child_2.random_float() for _ in range(20)]

        assert floats_1 != floats_2


class TestSeedManagerScalarMethods:
    """Test individual scalar random value methods."""

    def test_random_float_range(self, seed_42: SeedManager) -> None:
        """random_float() must respect the [low, high) bounds."""
        for _ in range(200):
            val = seed_42.random_float(low=2.0, high=5.0)
            assert 2.0 <= val < 5.0

    def test_random_int_range(self, seed_42: SeedManager) -> None:
        """random_int() must respect the [low, high] bounds (inclusive)."""
        for _ in range(200):
            val = seed_42.random_int(low=10, high=20)
            assert 10 <= val <= 20

    def test_random_int_single_value(self, seed_42: SeedManager) -> None:
        """random_int(n, n) must always return n."""
        for _ in range(20):
            assert seed_42.random_int(7, 7) == 7

    def test_random_bool_always_true(self) -> None:
        """random_bool(1.0) must always return True."""
        sm = SeedManager(seed=0)
        for _ in range(50):
            assert sm.random_bool(probability=1.0) is True

    def test_random_bool_always_false(self) -> None:
        """random_bool(0.0) must always return False."""
        sm = SeedManager(seed=0)
        for _ in range(50):
            assert sm.random_bool(probability=0.0) is False


class TestSeedManagerSelectionMethods:
    """Test sequence selection methods."""

    def test_pick_from_single_item(self, seed_42: SeedManager) -> None:
        """Picking from a single-item list must return that item."""
        assert seed_42.pick(["only"]) == "only"

    def test_pick_empty_raises(self, seed_42: SeedManager) -> None:
        """Picking from empty sequence must raise ValueError."""
        with pytest.raises(ValueError, match="empty"):
            seed_42.pick([])

    def test_pick_weighted_distribution(self) -> None:
        """pick_weighted should respect the weight distribution."""
        sm = SeedManager(seed=42)
        items = ["rare", "common"]
        weights = [0.01, 0.99]

        counts = {"rare": 0, "common": 0}
        for _ in range(1000):
            choice = sm.pick_weighted(items, weights)
            counts[choice] += 1

        # 'common' should be selected far more often
        assert counts["common"] > counts["rare"] * 5

    def test_pick_weighted_mismatched_lengths(self, seed_42: SeedManager) -> None:
        """Mismatched items and weights must raise ValueError."""
        with pytest.raises(ValueError, match="same length"):
            seed_42.pick_weighted(["a", "b"], [0.5])

    def test_pick_multiple_no_replacement(self, seed_42: SeedManager) -> None:
        """pick_multiple must return unique items (no replacement)."""
        items = list(range(20))
        selected = seed_42.pick_multiple(items, 10)

        assert len(selected) == 10
        assert len(set(selected)) == 10  # All unique

    def test_pick_multiple_too_many_raises(self, seed_42: SeedManager) -> None:
        """Requesting more items than available must raise ValueError."""
        with pytest.raises(ValueError, match="Cannot pick"):
            seed_42.pick_multiple([1, 2, 3], 5)

    def test_shuffle_preserves_elements(self, seed_42: SeedManager) -> None:
        """Shuffled list must contain exactly the same elements."""
        original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        shuffled = seed_42.shuffle(original)

        assert sorted(shuffled) == sorted(original)
        assert original == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]  # Original unchanged

    def test_shuffle_deterministic(self) -> None:
        """Same seed must produce same shuffle order."""
        items = list(range(20))

        a = SeedManager(seed=42).shuffle(items)
        b = SeedManager(seed=42).shuffle(items)

        assert a == b


class TestSeedManagerDomainMethods:
    """Test domain-specific convenience methods."""

    def test_random_date_format(self, seed_42: SeedManager) -> None:
        """random_date must return ISO 8601 format (YYYY-MM-DD)."""
        date_str = seed_42.random_date(2020, 2025)
        assert re.match(r"^\d{4}-\d{2}-\d{2}$", date_str)

    def test_random_date_range(self, seed_42: SeedManager) -> None:
        """random_date must fall within the specified year range."""
        for _ in range(100):
            date_str = seed_42.random_date(2022, 2024)
            year = int(date_str[:4])
            assert 2022 <= year <= 2024

    def test_child_seed_value_range(self, seed_42: SeedManager) -> None:
        """child_seed_value must return a non-negative 31-bit integer."""
        for _ in range(50):
            val = seed_42.child_seed_value()
            assert 0 <= val <= 2**31 - 1

    def test_entropy_property(self) -> None:
        """entropy should return the original seed."""
        sm = SeedManager(seed=12345)
        assert sm.entropy == 12345
