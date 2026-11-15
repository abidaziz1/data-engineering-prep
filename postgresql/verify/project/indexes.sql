-- Indexes for the events table (one row for each page view, click or purchase).
-- A BRIN index for a column that grows with the file: a few kilobytes instead of tens of megabytes.
CREATE INDEX events_ts_brin ON events USING brin (event_ts);
-- A partial index for the rare rows that you look up.
CREATE INDEX events_user_purchase ON events (user_id) WHERE kind = 'purchase';
-- A covering index, so that the query can be answered from the index alone.
CREATE INDEX events_user_inc ON events (user_id) INCLUDE (event_ts);
-- GIN for containment on JSONB, and an expression index for one key that is read with ->>.
CREATE INDEX events_payload_gin ON events USING gin (payload jsonb_path_ops);
CREATE INDEX events_n_expr ON events ((payload->>'n'));
