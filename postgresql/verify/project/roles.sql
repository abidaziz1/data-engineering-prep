-- A read-only role for analysts, and what a new table needs.
CREATE ROLE analyst LOGIN PASSWORD 'change-me';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analyst;

-- Row level security: an analyst sees one store.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_five ON orders FOR SELECT TO analyst USING (store_id = 5);
