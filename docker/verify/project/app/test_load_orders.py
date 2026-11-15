from load_orders import read_rows


def test_read_rows_types(tmp_path):
    p = tmp_path / "orders.csv"
    p.write_text("order_id,store_id,order_date,amount\n7,s03,2026-03-02,12.50\n")
    assert read_rows(str(p)) == [(7, "s03", "2026-03-02", "12.50")]


def test_read_rows_empty(tmp_path):
    p = tmp_path / "orders.csv"
    p.write_text("order_id,store_id,order_date,amount\n")
    assert read_rows(str(p)) == []
