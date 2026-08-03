"""
Tests for ADBG Click CLI commands.
"""

from click.testing import CliRunner

from adbg.cli.main import cli


def test_cli_version() -> None:
    runner = CliRunner()
    result = runner.invoke(cli, ["--version"])
    assert result.exit_code == 0
    assert "ADBG v1.0.0" in result.output


def test_cli_help() -> None:
    runner = CliRunner()
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "generate" in result.output
    assert "validate" in result.output
    assert "stats" in result.output


def test_cli_generate_and_validate_and_stats(tmp_path) -> None:
    out = tmp_path / "cli_dataset"
    runner = CliRunner()

    gen_res = runner.invoke(cli, ["generate", "-n", "2", "-s", "42", "-o", str(out)])
    assert gen_res.exit_code == 0
    assert "[SUCCESS] Dataset generation complete!" in gen_res.output

    val_res = runner.invoke(cli, ["validate", "-d", str(out)])
    assert val_res.exit_code == 0
    assert "[SUCCESS] Dataset verification passed!" in val_res.output

    stats_res = runner.invoke(cli, ["stats", "-d", str(out)])
    assert stats_res.exit_code == 0
    assert "total_documents" in stats_res.output
