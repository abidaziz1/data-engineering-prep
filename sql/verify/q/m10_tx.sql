-- Mission 10: single-session statements for the coding rounds. The two-session scripts are in s_tx.py.

-- @name m10.ch_transfer
-- @engines duckdb postgres sqlite
-- @setup acct
UPDATE acct SET balance = balance - 30 WHERE id = 1;
UPDATE acct SET balance = balance + 30 WHERE id = 2;
SELECT id, owner, balance FROM acct ORDER BY id;

-- @name m10.ch_incr
-- @engines duckdb postgres sqlite
-- @setup acct
UPDATE acct SET balance = balance + 10 WHERE id = 1;
SELECT balance FROM acct WHERE id = 1;

-- @name m10.ch_skip
-- @engines postgres
-- @setup jobs
SELECT id
FROM jobs
WHERE state = 'pending'
ORDER BY id
LIMIT 1
FOR UPDATE SKIP LOCKED;
