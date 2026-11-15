-- Events, one partition for each month. The primary key must contain the partition key.
CREATE TABLE ev (
    event_id bigint      NOT NULL,
    event_ts timestamptz NOT NULL,
    user_id  int,
    kind     text,
    PRIMARY KEY (event_id, event_ts)
) PARTITION BY RANGE (event_ts);

CREATE TABLE ev_2026_03 PARTITION OF ev FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE ev_2026_04 PARTITION OF ev FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE ev_default PARTITION OF ev DEFAULT;

-- Retention: detach, then drop. No DELETE, no dead rows.
ALTER TABLE ev DETACH PARTITION ev_2026_03;
DROP TABLE ev_2026_03;
