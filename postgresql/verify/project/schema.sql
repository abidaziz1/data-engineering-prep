-- The Brewline orders table. One row for each order, loaded every night.
CREATE TABLE orders (
    order_id    bigint        PRIMARY KEY,
    store_id    int           NOT NULL,
    customer_id int           NOT NULL,
    order_ts    timestamptz   NOT NULL,
    amount      numeric(10,2) NOT NULL,
    status      text          NOT NULL,
    note        text
);
