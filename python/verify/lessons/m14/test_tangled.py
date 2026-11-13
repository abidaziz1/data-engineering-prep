import sqlite3

from tangled import run


def test_run_writes_the_daily_totals(tmp_path, capsys):
    source = tmp_path / "orders.csv"
    source.write_text(
        "order_id,store,status,ordered_at,total_cents\n"
        "O-1, london ,paid,2026-03-14T08:15:00,1250\n"
        "O-2,London,refunded,2026-03-14T09:00:00,475\n"
        "O-3,London,paid,2026-03-14T10:30:00,820\n"
        "O-4,Singapore,paid,2026-03-15T01:00:00,1990\n"
    )
    db = tmp_path / "out.db"
    run(source, db)
    rows = sqlite3.connect(db).execute("SELECT store, day, cents FROM daily ORDER BY store, day").fetchall()
    assert rows == [("London", "2026-03-14", 2070), ("Singapore", "2026-03-15", 1990)]
    assert "wrote 2 rows" in capsys.readouterr().out
