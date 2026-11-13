"""A command line for the nightly load. typer builds the options, the help text and the checks from the function signature."""
from datetime import date
from pathlib import Path
from typing import Annotated

import typer

app = typer.Typer(add_completion=False, help="Load one day of orders.")


@app.command()
def load(
    source: Annotated[Path, typer.Argument(exists=True, dir_okay=False, help="The CSV file of orders.")],
    day: Annotated[date, typer.Option(help="The business day, as YYYY-MM-DD.")],
    batch_size: Annotated[int, typer.Option(min=1, help="Rows for each commit.")] = 1000,
    dry_run: Annotated[bool, typer.Option(help="Check the file and print the plan. Write nothing.")] = False,
):
    rows = sum(1 for _ in source.open()) - 1  # the first line is the header
    plan = f"{rows} rows from {source.name} for {day}, in batches of {batch_size}"
    if dry_run:
        typer.echo(f"dry run: would load {plan}")
        raise typer.Exit(0)
    if rows == 0:
        typer.echo("the file has no rows", err=True)
        raise typer.Exit(1)
    typer.echo(f"loaded {plan}")


if __name__ == "__main__":
    app()
