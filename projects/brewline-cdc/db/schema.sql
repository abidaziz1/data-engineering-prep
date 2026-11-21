-- The orders table of the shop's database, and what Debezium needs to read its changes.
CREATE TABLE orders (
    id           bigint PRIMARY KEY,
    store_id     int         NOT NULL,
    status       text        NOT NULL CHECK (status IN ('PLACED', 'SHIPPED', 'REFUNDED')),
    amount_cents bigint      NOT NULL CHECK (amount_cents > 0),
    updated_at   timestamptz NOT NULL
);

-- Debezium reads the changes of the tables of this publication, through the pgoutput plugin.
CREATE PUBLICATION dbz_publication FOR TABLE orders;

-- The role that the connector logs in with: it may read the table and open a replication slot.
CREATE ROLE debezium WITH LOGIN REPLICATION PASSWORD 'not-a-real-password';
GRANT SELECT ON orders TO debezium;
