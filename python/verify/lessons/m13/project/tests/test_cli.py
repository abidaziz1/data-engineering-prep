from pathlib import Path

from typer.testing import CliRunner

from brewline_loader.cli import app

runner = CliRunner()


def orders_file(folder: Path, rows: int) -> Path:
    path = folder / "orders.csv"
    path.write_text("order_id,total_cents\n" + "".join(f"O-{n},{100 + n}\n" for n in range(rows)))
    return path


def test_dry_run_prints_the_plan(tmp_path: Path) -> None:
    result = runner.invoke(app, [str(orders_file(tmp_path, 3)), "--day", "2026-03-14", "--dry-run"])
    assert result.exit_code == 0
    assert "dry run: would load 3 rows" in result.output


def test_a_bad_date_is_a_usage_error(tmp_path: Path) -> None:
    result = runner.invoke(app, [str(orders_file(tmp_path, 3)), "--day", "14-03-2026"])
    assert result.exit_code == 2


def test_an_empty_file_fails(tmp_path: Path) -> None:
    result = runner.invoke(app, [str(orders_file(tmp_path, 0)), "--day", "2026-03-14"])
    assert result.exit_code == 1
