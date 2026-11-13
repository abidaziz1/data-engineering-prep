"""The same ideas in SQLAlchemy Core: an engine, a text query with bind parameters, and a transaction block."""
import sqlalchemy as sa

engine = sa.create_engine("sqlite:///:memory:")
with engine.begin() as conn:  # BEGIN ... COMMIT, or ROLLBACK when the block raises
    conn.execute(sa.text("CREATE TABLE orders (order_id TEXT PRIMARY KEY, store TEXT, total_cents INTEGER)"))
    conn.execute(sa.text("INSERT INTO orders VALUES (:id, :store, :cents)"), [
        {"id": "O-1", "store": "London", "cents": 1250}, {"id": "O-2", "store": "London", "cents": 475}, {"id": "O-3", "store": "Singapore", "cents": 820}])

with engine.connect() as conn:
    rows = conn.execute(sa.text("SELECT store, sum(total_cents) AS cents FROM orders WHERE total_cents >= :min GROUP BY store ORDER BY store"), {"min": 500}).mappings().all()
    print("rows:", [dict(r) for r in rows])
    print("column names:", list(rows[0].keys()))
print("sqlalchemy", sa.__version__)
