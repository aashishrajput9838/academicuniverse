"""
ADBG CLI — Command-Line Interface.

Provides subcommands for dataset generation, validation, and statistics computation.
"""

from __future__ import annotations

from pathlib import Path

import click

from adbg import __version__
from adbg.core.interfaces import GenerationConfig
from adbg.core.pipeline import GenerationPipeline
from adbg.manifest.builder import ManifestVerifier
from adbg.utils.logging import setup_logging


@click.group(invoke_without_command=True)
@click.option("--version", is_flag=True, help="Show ADBG version and exit.")
@click.option(
    "--verbose", "-v",
    is_flag=True,
    default=False,
    help="Enable verbose (DEBUG) logging.",
)
@click.pass_context
def cli(ctx: click.Context, version: bool, verbose: bool) -> None:
    """Academic Document Benchmark Generator (ADBG) — Synthetic dataset generation framework."""
    import logging

    level = logging.DEBUG if verbose else logging.INFO
    setup_logging(level=level)

    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose

    if version:
        click.echo(f"ADBG v{__version__}")
        ctx.exit(0)

    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


@cli.command()
@click.option("--documents", "-n", type=int, default=10, help="Number of documents to generate.")
@click.option("--seed", "-s", type=int, default=42, help="Random seed for reproducibility.")
@click.option("--output", "-o", type=click.Path(), default="./output", help="Output directory.")
@click.option("--config", "-c", type=click.Path(exists=True), default=None, help="Path to YAML configuration file.")
@click.pass_context
def generate(
    ctx: click.Context,
    documents: int,
    seed: int,
    output: str,
    config: str | None,
) -> None:
    """Generate a synthetic academic document benchmark dataset."""
    click.echo(f"[ADBG v{__version__}] Generating {documents} documents (seed={seed})")
    click.echo(f"   Output: {output}")

    cfg = GenerationConfig(
        count=documents,
        seed=seed,
        output_dir=output,
    )

    pipeline = GenerationPipeline()
    result = pipeline.run(cfg)

    click.echo("[SUCCESS] Dataset generation complete!")
    click.echo(f"   Total Documents: {result.total_documents}")
    click.echo(f"   Duration: {result.generation_duration_seconds:.2f} seconds")
    if result.errors:
        click.echo(f"   [WARNING] Encountered {len(result.errors)} errors during generation.")


@cli.command()
@click.option(
    "--dataset", "-d",
    type=click.Path(exists=True),
    required=True,
    help="Path to dataset directory to validate.",
)
@click.pass_context
def validate(ctx: click.Context, dataset: str) -> None:
    """Validate dataset integrity (checksums, ground truth completeness)."""
    click.echo(f"[VALIDATE] Checking dataset: {dataset}")
    verifier = ManifestVerifier()
    is_valid, errors = verifier.verify_dataset(dataset)

    if is_valid:
        click.echo("[SUCCESS] Dataset verification passed! All checksums and files intact.")
    else:
        click.echo(f"[FAILED] Dataset verification failed with {len(errors)} errors:")
        for err in errors[:10]:
            click.echo(f"   - {err}")


@cli.command()
@click.option(
    "--dataset", "-d",
    type=click.Path(exists=True),
    required=True,
    help="Path to dataset directory to analyze.",
)
@click.pass_context
def stats(ctx: click.Context, dataset: str) -> None:
    """Compute and display dataset statistics."""
    click.echo(f"[STATS] Displaying statistics for: {dataset}")
    stats_path = Path(dataset) / "statistics.json"

    if stats_path.exists():
        content = stats_path.read_text(encoding="utf-8")
        click.echo(content)
    else:
        click.echo(f"[ERROR] Statistics file not found at {stats_path}")
