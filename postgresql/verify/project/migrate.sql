-- A migration that cannot hold up the traffic: give up after three seconds, and run it again later.
SET lock_timeout = '3s';
ALTER TABLE orders ADD COLUMN channel text;
