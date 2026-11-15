#!/bin/sh
# A logical dump, a physical backup, and a restore to a named point in time.
set -e
pg_dump -Fc -f brewline.dump brewline
pg_basebackup -D /backup/base -X stream -c fast
pg_verifybackup /backup/base
# To recover: copy /backup/base to a new data directory, then in postgresql.conf
#   restore_command = 'cp /archive/%f %p'
#   recovery_target_name = 'before_mistake'
#   recovery_target_action = 'promote'
# create an empty file called recovery.signal, and start the server.
