window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "br.delete_unmerged": {
   "rc": 1
  },
  "br.ref": {
   "content_is_the_commit_id": true,
   "file_bytes": 41,
   "id_chars": 40
  },
  "cf.abort": {
   "head_same": true,
   "rc": 0,
   "status_clean": true
  },
  "cf.after": {
   "markers_left": false,
   "merge_commit": 1
  },
  "cf.diff_check": {
   "rc": 2
  },
  "cf.merge": {
   "rc": 1
  },
  "cf.rate_markers": {
   "loader_reads_it": false
  },
  "cf.rebase": {
   "in_progress": true,
   "rc": 1
  },
  "cf.stages": {
   "stage_numbers": [
    "1",
    "2",
    "3"
   ],
   "unmerged_entries": 3
  },
  "cf.theirs": {
   "has_avg": true,
   "has_max": false
  },
  "data.clones": {
   "blobless": {
    "commits": 7,
    "file_there": true,
    "kib": 178,
    "rc": 0,
    "shallow": "false"
   },
   "depth1": {
    "commits": 1,
    "file_there": true,
    "kib": 175,
    "rc": 0,
    "shallow": "true"
   },
   "full": {
    "commits": 7,
    "file_there": true,
    "kib": 898,
    "rc": 0,
    "shallow": "false"
   }
  },
  "data.sizes": {
   "append": {
    "after_gc_kib": 188,
    "file_bytes": 525136,
    "loose_kib": 1343,
    "loose_objects": 28,
    "times_the_file": 0.37,
    "versions": 7
   },
   "rewrite": {
    "after_gc_kib": 899,
    "file_bytes": 525136,
    "loose_kib": 1346,
    "loose_objects": 28,
    "times_the_file": 1.75,
    "versions": 7
   }
  },
  "ff": {
   "head_is_feature": true,
   "parents_of_head": 1
  },
  "fx": {
   "commits_after": 3,
   "commits_before": 4,
   "dag_has_the_fix": true
  },
  "hist": {
   "bad_commit": "68730c6",
   "bad_position": 12,
   "commits": 16
  },
  "hist.bisect": {
   "commits_between": 15,
   "found": "68730c6",
   "is_the_bad_commit": true,
   "rc": 0,
   "steps": 4
  },
  "hist.bisect_tests": {
   "commits": 16,
   "start": [
    [
     "bad",
     16
    ],
    [
     "good",
     1
    ]
   ],
   "tests": [
    [
     "good",
     8
    ],
    [
     "bad",
     12
    ],
    [
     "good",
     10
    ],
    [
     "good",
     11
    ]
   ]
  },
  "hist.pick": {
   "copy": "3009f62",
   "different_id": true,
   "original": "cd3738e",
   "same_subject": true,
   "subject": "Add a weekly total"
  },
  "hist.stash": {
   "clean_after_push": true
  },
  "hist.worktree": {
   "branch_checked_out_twice": true,
   "folders": 2
  },
  "hk.clone": {
   "hooks_in_the_clone": [],
   "samples": 14,
   "the_original_has_pre_commit": true
  },
  "hk.no_verify": {
   "commits": 2,
   "rc": 0
  },
  "hk.path": {
   "value": ".githooks"
  },
  "hk.refused": {
   "commits": 1,
   "rc": 1
  },
  "ign.tracked": {
   "check_ignore_no_index_rc": 0,
   "check_ignore_rc": 1,
   "status": "M old.log",
   "status_after_commit": "(clean)",
   "status_after_rm_cached": "D  old.log",
   "still_shows_as_modified": true
  },
  "int.lost": {
   "object_present": true,
   "object_present_after_gc": false
  },
  "int.pack": {
   "delta_objects": 6,
   "max_chain": 1,
   "objects": 28,
   "packs": 1
  },
  "int.sha1": {
   "id_chars": 40
  },
  "int.sha256": {
   "id_chars": 64,
   "ok": true
  },
  "int.shallow": {
   "commits_after_unshallow": 16,
   "commits_with_depth_3": 3
  },
  "int.sparse": {
   "files_on_disk": 3,
   "on_disk": [
    "README.md",
    "loader/load_orders.py",
    "loader/tax_rate.txt"
   ],
   "tracked_files": 18
  },
  "int.types": {
   "blob": 7,
   "commit": 7,
   "tree": 14
  },
  "leak.after_gc": {
   "old_blob_still_in_the_repository": false
  },
  "leak.before": {
   "commits": 4,
   "file_in_head": false,
   "found_in_history": 2,
   "show_old": true
  },
  "leak.rewrite": {
   "commit_ids_changed": true,
   "commits": 4,
   "found_in_history": 0,
   "old_blob_still_in_the_repository": true,
   "rc": 0
  },
  "lfs": {
   "file_bytes": 409600,
   "git_objects_bytes": 476,
   "lfs_store_bytes": 409600,
   "pointer_bytes": 131,
   "pointer_lines": 3
  },
  "mg": {
   "commits": 6,
   "feature_ids_unchanged": true,
   "parents": 2
  },
  "mr.ids": {
   "A": "e90f432",
   "B": "098ade4",
   "F1": "47a31e7",
   "F1r": "91da3dd",
   "F2": "1fc4315",
   "F2r": "045cb49",
   "M": "e131836",
   "M1": "cb8d980"
  },
  "nb": {
   "cells": 40,
   "diff_after_rerun": "1 file changed, 79 insertions(+), 79 deletions(-)",
   "lines_changed_after_rerun": 158,
   "source_lines_changed_between_runs": 0
  },
  "obj.dedupe": {
   "blobs_after_adding_a_copy": 4,
   "blobs_before": 4,
   "files_in_the_tree": 5,
   "same_id": true
  },
  "obj.one_byte": {
   "before": "87c37fc",
   "new_rate_blob": "e961155",
   "old_rate_blob": "164d8ca"
  },
  "obj.same_blob": {
   "equal": true,
   "hash_object": "87c37fc",
   "in_the_tree": "87c37fc"
  },
  "obj.types": {
   "blob": "blob",
   "blob_id": "87c37fc",
   "commit": "commit",
   "commit_id": "e90f432",
   "id_length": 40,
   "tree": "tree",
   "tree_id": "81c0641"
  },
  "rb": {
   "author_date_kept": true,
   "commits": 5,
   "ids_changed": true,
   "merge_commits": 0
  },
  "rm.force": {
   "omar_commit_still_on_remote": true,
   "omar_tip": "88b0de4",
   "rc": 0,
   "remote_main_is_maya": true
  },
  "rm.force_with_lease": {
   "rc": 1,
   "refused": true
  },
  "rm.pull_merge": {
   "merge_commits": 1
  },
  "rm.pull_plain": {
   "rc": 128
  },
  "rm.pull_rebase": {
   "commits": 3,
   "merge_commits": 0
  },
  "rm.push_amended": {
   "rc": 1
  },
  "rm.push_rejected": {
   "rc": 1
  },
  "rm.tracking": {
   "remote_ref_file_exists": true
  },
  "sq": {
   "commits": 4,
   "merge_commits": 0
  },
  "tag.push": {
   "after_follow_tags": [
    "v1.1.0"
   ],
   "after_plain_push": []
  },
  "tag.shallow": {
   "commits": 1,
   "rc": 128,
   "tags_in_the_clone": []
  },
  "tag.types": {
   "annotated": "tag",
   "lightweight": "commit"
  },
  "tag.unshallow": {
   "rc": 0,
   "tags_in_the_clone": [
    "v1.1.0"
   ]
  },
  "un.amend": {
   "commits": 3,
   "id_after": "fa7fa1c",
   "id_before": "1f55e69",
   "subject": "Raise the tax rate to 0.085"
  },
  "un.deleted": {
   "file_back": true
  },
  "un.lost": {
   "file_after_reset": "0.08",
   "log_after_reset": 1,
   "lost_id": "1f55e69"
  },
  "un.recovered": {
   "file_after_recovery": "0.09",
   "head_is_the_lost_commit": true,
   "log_after_recovery": 3
  },
  "un.restore": {
   "file_back": true
  },
  "un.source": {
   "head_moved": false,
   "rate_in_file": "0.08"
  }
 },
 "files": {
  ".gitattributes": "*.parquet filter=lfs diff=lfs merge=lfs -text\n",
  ".github/workflows/check.yml": "name: check\non:\n  pull_request:\n  push:\n    branches: [main]\njobs:\n  check:\n    runs-on: ubuntu-24.04\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n      - name: Run the checks\n        run: sh checks/check.sh\n",
  ".gitignore": "# data that is rebuilt, and files that never belong in git\ndata/*.csv\n*.log\n.env\n__pycache__/\n",
  "README.md": "# Brewline data\n\nThe orders pipeline of Brewline: a loader, a model and a nightly schedule.\n",
  "checks/check.sh": "#!/bin/sh\n# The nightly check: the tax rate must be a plausible rate (at most 0.25).\nrate=$(cat loader/tax_rate.txt)\nif awk \"BEGIN { exit !($rate > 0.25) }\"; then\n  echo \"check failed: tax rate $rate is not plausible\"\n  exit 1\nfi\necho \"check passed: tax rate $rate\"\n",
  "conflict/resolved.sql": "select\n    order_date,\n    store_id,\n    count(*) as orders,\n    sum(amount) as revenue,\n    avg(amount) as avg_amount,\n    max(amount) as max_amount\nfrom raw_orders\ngroup by 1, 2\n",
  "dags/nightly.py": "from datetime import datetime\n\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.bash import BashOperator\n\nwith DAG(\"nightly_orders\", schedule=\"0 2 * * *\", start_date=datetime(2026, 3, 1), catchup=False):\n    BashOperator(task_id=\"load\", bash_command=\"python loader/load_orders.py data/orders.csv\")\n",
  "hooks/pre-commit": "#!/bin/sh\n# Refuse a commit that adds something that looks like an access key.\nif git diff --cached -U0 | grep -E '^\\+.*(AKIA[0-9A-Z]{8,}|token *= *[A-Za-z0-9]{16,})' >/dev/null; then\n  echo \"pre-commit: this commit adds something that looks like a secret. Remove it and try again.\"\n  exit 1\nfi\n",
  "loader/load_orders.py": "\"\"\"Load one file of Brewline orders into Postgres. Running it twice does no harm.\"\"\"\nimport csv\nimport os\nimport sys\n\nTAX_RATE = float(open(os.path.join(os.path.dirname(__file__), \"tax_rate.txt\")).read())\n\n\ndef read_rows(path):\n    with open(path, newline=\"\") as f:\n        return [(int(r[\"order_id\"]), r[\"store_id\"], round(float(r[\"amount\"]) * (1 + TAX_RATE), 2)) for r in csv.DictReader(f)]\n\n\nif __name__ == \"__main__\":\n    print(len(read_rows(sys.argv[1])), \"rows\")\n",
  "loader/tax_rate.txt": "0.08\n",
  "models/orders_daily.sql": "select\n    order_date,\n    store_id,\n    count(*) as orders,\n    sum(amount) as revenue\nfrom raw_orders\ngroup by 1, 2\n",
  "notebooks/explore_cell.json": "{\n \"cell_type\": \"code\",\n \"execution_count\": 1,\n \"metadata\": {},\n \"source\": [\n  \"print(0)\"\n ],\n \"outputs\": [\n  {\n   \"name\": \"stdout\",\n   \"output_type\": \"stream\",\n   \"text\": [\n    \"0\\n\"\n   ]\n  }\n ]\n}\n"
 },
 "meta": {
  "git": "2.43.0",
  "git_lfs": "3.4.1",
  "os": "Linux x86_64",
  "recorded_on": "2026-11-15"
 },
 "tables": {
  "areas.steps": {
   "cols": [
    "step",
    "command",
    "working tree",
    "index",
    "last commit",
    "git status --short"
   ],
   "rows": [
    [
     "the file as committed",
     "",
     "87c37fc",
     "87c37fc",
     "87c37fc",
     "(clean)"
    ],
    [
     "edit the file",
     "(an editor)",
     "6b97d6f",
     "87c37fc",
     "87c37fc",
     " M models/orders_daily.sql"
    ],
    [
     "stage it",
     "git add",
     "6b97d6f",
     "6b97d6f",
     "87c37fc",
     "M  models/orders_daily.sql"
    ],
    [
     "edit it again",
     "(an editor)",
     "afe0ac1",
     "6b97d6f",
     "87c37fc",
     "MM models/orders_daily.sql"
    ],
    [
     "stage it again",
     "git add",
     "afe0ac1",
     "afe0ac1",
     "87c37fc",
     "M  models/orders_daily.sql"
    ],
    [
     "commit",
     "git commit",
     "afe0ac1",
     "afe0ac1",
     "afe0ac1",
     "(clean)"
    ]
   ]
  },
  "data.clones": {
   "cols": [
    "clone",
    "size of .git (KiB)",
    "commits in the history",
    "the file is there"
   ],
   "rows": [
    [
     "git clone",
     898,
     7,
     "yes"
    ],
    [
     "git clone --depth 1",
     175,
     1,
     "yes"
    ],
    [
     "git clone --filter=blob:none",
     178,
     7,
     "yes"
    ]
   ]
  },
  "data.sizes": {
   "cols": [
    "how the file changes",
    "size of one version (KiB)",
    "versions",
    ".git before gc (KiB)",
    ".git after gc (KiB)",
    "after gc, in times one version"
   ],
   "rows": [
    [
     "append 500 rows each time",
     513,
     7,
     1343,
     188,
     0.37
    ],
    [
     "re-sorted whole file each time",
     513,
     7,
     1346,
     899,
     1.75
    ]
   ]
  },
  "mr.ids": {
   "cols": [
    "commit",
    "message",
    "id before",
    "after a merge",
    "after a rebase"
   ],
   "rows": [
    [
     "F1",
     "Add the nightly check",
     "47a31e7",
     "47a31e7",
     "91da3dd"
    ],
    [
     "F2",
     "Document the check",
     "1fc4315",
     "1fc4315",
     "045cb49"
    ],
    [
     "M",
     "the merge commit",
     "-",
     "e131836",
     "-"
    ]
   ]
  },
  "un.reset": {
   "cols": [
    "command",
    "HEAD",
    "rate in the last commit",
    "rate in the index",
    "rate in the file",
    "commits in the history"
   ],
   "rows": [
    [
     "start",
     "1f55e69",
     "0.09",
     "0.09",
     "0.09",
     3
    ],
    [
     "git reset --soft HEAD~1",
     "098ade4",
     "0.08",
     "0.09",
     "0.09",
     2
    ],
    [
     "git reset --mixed HEAD~1",
     "098ade4",
     "0.08",
     "0.08",
     "0.09",
     2
    ],
    [
     "git reset --hard HEAD~1",
     "098ade4",
     "0.08",
     "0.08",
     "0.08",
     2
    ],
    [
     "git revert HEAD",
     "c0b4ab5",
     "0.08",
     "0.08",
     "0.08",
     4
    ]
   ]
  }
 },
 "text": {
  "br.branch_list": "  feature 1fc4315 Document the check\n* main    098ade4 Add the nightly DAG",
  "br.delete": "Deleted branch feature (was 1fc4315).",
  "br.delete_unmerged": "error: the branch 'feature' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D feature'",
  "br.graph_before": "* 1fc4315 (feature) Document the check\n* 47a31e7 Add the nightly check\n* 098ade4 (HEAD -> main) Add the nightly DAG\n* e90f432 Add the loader and the daily model",
  "br.head": "ref: refs/heads/main",
  "br.ref_file": "1fc4315fb3352e8492a866cc63480ae5989b420c",
  "cf.diff": "diff --cc models/orders_daily.sql\nindex b6b0a64,6b97d6f..0000000\n--- a/models/orders_daily.sql\n+++ b/models/orders_daily.sql\n@@@ -3,6 -3,6 +3,10 @@@ selec\n      store_id,\n      count(*) as orders,\n      sum(amount) as revenue,\n++<<<<<<< HEAD\n +    max(amount) as max_amount\n++=======\n+     avg(amount) as avg_amount\n++>>>>>>> avg\n  from raw_orders\n  group by 1, 2",
  "cf.diff_check": "models/orders_daily.sql:6: leftover conflict marker\nmodels/orders_daily.sql:8: leftover conflict marker\nmodels/orders_daily.sql:10: leftover conflict marker",
  "cf.graph": "*   979a5c2 (HEAD -> main) Merge branch 'avg'\n|\\\n| * 0974297 (avg) Add the average amount\n* | 178f9f7 Add the maximum amount\n|/\n* e90f432 Add the loader and the daily model",
  "cf.ls_unmerged": "100644 87c37fc68a64b982524e8c13cab87fa7726c6abb 1\tmodels/orders_daily.sql\n100644 b6b0a641ec2d52af7c0c0a0c3566d4776b2c7232 2\tmodels/orders_daily.sql\n100644 6b97d6ff9a8efe691a739eec3705d5cab50b91d0 3\tmodels/orders_daily.sql",
  "cf.markers": "select\n    order_date,\n    store_id,\n    count(*) as orders,\n    sum(amount) as revenue,\n<<<<<<< HEAD\n    max(amount) as max_amount\n=======\n    avg(amount) as avg_amount\n>>>>>>> avg\nfrom raw_orders\ngroup by 1, 2",
  "cf.merge": "Auto-merging models/orders_daily.sql\nCONFLICT (content): Merge conflict in models/orders_daily.sql\nAutomatic merge failed; fix conflicts and then commit the result.",
  "cf.rate_error": "ValueError: could not convert string to float: '<<<<<<< HEAD\\n0.07\\n=======\\n0.09\\n>>>>>>> sales-tax\\n'",
  "cf.rate_markers": "<<<<<<< HEAD\n0.07\n=======\n0.09\n>>>>>>> sales-tax",
  "cf.rate_merge": "Auto-merging loader/tax_rate.txt\nCONFLICT (content): Merge conflict in loader/tax_rate.txt\nAutomatic merge failed; fix conflicts and then commit the result.",
  "cf.rebase": "Auto-merging models/orders_daily.sql\nCONFLICT (content): Merge conflict in models/orders_daily.sql\nerror: could not apply 0974297... Add the average amount\nhint: Resolve all conflicts manually, mark them as resolved with\nhint: \"git add/rm <conflicted_files>\", then run \"git rebase --continue\".\nhint: You can instead skip this commit: run \"git rebase --skip\".\nhint: To abort and get back to the state before \"git rebase\", run \"git rebase --abort\".\nCould not apply 0974297... Add the average amount",
  "cf.rebase_markers": "select\n    order_date,\n    store_id,\n    count(*) as orders,\n    sum(amount) as revenue,\n<<<<<<< HEAD\n    max(amount) as max_amount\n=======\n    avg(amount) as avg_amount\n>>>>>>> 0974297 (Add the average amount)\nfrom raw_orders\ngroup by 1, 2",
  "cf.status": "UU models/orders_daily.sql",
  "cf.status_long": "On branch main\nYou have unmerged paths.\n  (fix conflicts and run \"git commit\")\n  (use \"git merge --abort\" to abort the merge)\n\nUnmerged paths:\n  (use \"git add <file>...\" to mark resolution)\n\tboth modified:   models/orders_daily.sql\n\nno changes added to commit (use \"git add\" and/or \"git commit -a\")",
  "cf.status_resolved": "M  models/orders_daily.sql",
  "data.depth_status": "is shallow: true",
  "ff.graph": "* 1fc4315 (HEAD -> main, feature) Document the check\n* 47a31e7 Add the nightly check\n* 098ade4 Add the nightly DAG\n* e90f432 Add the loader and the daily model",
  "ff.merge": "Updating 098ade4..1fc4315\nFast-forward\n README.md       | 1 +\n checks/check.sh | 8 ++++++++\n 2 files changed, 9 insertions(+)\n create mode 100644 checks/check.sh",
  "fx.log_after": "1f1d5a3 Add the check\n4cee8d9 Add the nightly DAG\ne90f432 Add the loader and the daily model",
  "fx.log_before": "7ec1f16 fixup! Add the nightly DAG\n904452e Add the check\n098ade4 Add the nightly DAG\ne90f432 Add the loader and the daily model",
  "fx.rebase": "Successfully rebased and updated refs/heads/main.",
  "hist.bisect_run": "running 'sh' 'checks/check.sh'\nBisecting: 3 revisions left to test after this (roughly 2 steps)\n[68730c61161c3535f473392d1e603984a7f963c5] Raise the tax rate to 0.8 (a typo)\nrunning 'sh' 'checks/check.sh'\nBisecting: 1 revision left to test after this (roughly 1 step)\n[821c7a59705646514e01d66b8cad3b690dfc1db2] Add a daily total\nrunning 'sh' 'checks/check.sh'\nBisecting: 0 revisions left to test after this (roughly 0 steps)\n[51608ed2138327156973305c14e8af9333b24fec] Fix a typo\nrunning 'sh' 'checks/check.sh'\n68730c61161c3535f473392d1e603984a7f963c5 is the first bad commit\ncommit 68730c61161c3535f473392d1e603984a7f963c5\nAuthor: Omar Diaz <omar@brewline.example>\nDate:   Mon Mar 2 16:24:00 2026 +0000\n\n    Raise the tax rate to 0.8 (a typo)\n\n loader/tax_rate.txt | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)\nbisect found first bad commit",
  "hist.blame": "68730c61 1) 0.8",
  "hist.blame_model": "^76cc6a5 (Maya Brewer 2026-03-02 1) select\n^76cc6a5 (Maya Brewer 2026-03-02 2)     order_date,\n^76cc6a5 (Maya Brewer 2026-03-02 3)     store_id,\n^76cc6a5 (Maya Brewer 2026-03-02 4)     count(*) as orders,",
  "hist.log": "c09630d Document the check\n5858f8b Add a monthly total\n1a74362 Reword the readme\ncd3738e Add a weekly total\n68730c6 Raise the tax rate to 0.8 (a typo)\n51608ed Fix a typo\n821c7a5 Add a daily total\nfd01b8a Raise the tax rate to 0.09",
  "hist.log_S": "68730c6 Raise the tax rate to 0.8 (a typo)",
  "hist.log_path": "68730c6 Raise the tax rate to 0.8 (a typo)\nfd01b8a Raise the tax rate to 0.09\n76cc6a5 Add the loader, the model and the check",
  "hist.log_stat": "c09630d Maya Brewer: Document the check\n\n notes/n16.txt | 1 +\n 1 file changed, 1 insertion(+)\n5858f8b Omar Diaz: Add a monthly total\n\n notes/n15.txt | 1 +\n 1 file changed, 1 insertion(+)\n1a74362 Maya Brewer: Reword the readme\n\n notes/n14.txt | 1 +\n 1 file changed, 1 insertion(+)",
  "hist.shortlog": "    11\tMaya Brewer\n     5\tOmar Diaz",
  "hist.stash_list": "stash@{0}: On main: half done readme",
  "hist.stash_pop": "On branch main\nChanges not staged for commit:\n  (use \"git add <file>...\" to update what will be committed)\n  (use \"git restore <file>...\" to discard changes in working directory)\n\tmodified:   README.md\n\nno changes added to commit (use \"git add\" and/or \"git commit -a\")\nDropped refs/stash@{0} (553deeb2651e1d40c2f8baf706e2c4c673c5353f)",
  "hist.stash_push": "Saved working directory and index state On main: half done readme",
  "hist.worktree_list": "~/hist         c09630d [main]\n~/hist_hotfix  c09630d [hotfix]",
  "hist.worktree_twice": "fatal: 'hotfix' is already used by worktree at '~/hist_hotfix'",
  "hk.refused": "pre-commit: this commit adds something that looks like a secret. Remove it and try again.",
  "ign.check": ".gitignore:2:data/*.csv\tdata/orders.csv",
  "ign.status": "?? .gitignore",
  "ign.status_ignored": "?? .gitignore\n!! data/\n!! run.log",
  "int.count_objects": "count: 0\nsize: 0\nin-pack: 28\npacks: 1\nsize-pack: 160\nprune-packable: 0\ngarbage: 0\nsize-garbage: 0",
  "int.fsck": "unreachable commit 25ff3e4916c95d99d7417fa709160b0c4cbf40f7\nunreachable blob 8ba3a16384aacc37d01564b28401755ce8053f51\nunreachable tree 3b365687defe23e4cfb1e9ec6e55fbec263e3449",
  "int.rev_list_count": "16",
  "int.verify_tail": "non delta: 22 objects\nchain length = 1: 6 objects\n~/big_append/.git/objects/pack/pack-7a5789b7a53d870f2230b4d03bf4d05ba511c9bd.pack: ok",
  "leak.filter_branch": "WARNING: git-filter-branch has a glut of gotchas generating mangled history\n\t rewrites.  Hit Ctrl-C before proceeding to abort, then use an\n\t alternative filtering tool such as 'git filter-repo'\n\t (https://github.com/newren/git-filter-repo/) instead.  See the\n\t filter-branch manual page for more details; to squelch this warning,\n\t set FILTER_BRANCH_SQUELCH_WARNING=1.\nProceeding with filter-branch...\n\n\nRewrite e90f432bd91a9df99f38298ea0e355183f5cad0b (1/4) (0 seconds passed, remaining 0 predicted)\nRewrite 2a13658360c6e85ad8d6c7ea8ccf750c4c7c609a (2/4) (0 seconds passed, remaining 0 predicted)\nRewrite 23c6070eee8a691eec0fa5bed8de9d7270e7e75b (3/4) (0 seconds passed, remaining 0 predicted)\nRewrite 1ffceb245222a693b8348d6425ed907a771d2baf (4/4) (0 seconds passed, remaining 0 predicted)\nRef 'refs/heads/main' was rewritten",
  "leak.log_S": "1ffceb2 Remove the settings file\n2a13658 Add local settings",
  "leak.show": "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nDB_PASSWORD=brewline-dev",
  "lfs.ls_files": "063c283392 * data/orders.parquet",
  "lfs.pointer": "version https://git-lfs.github.com/spec/v1\noid sha256:063c2833924492554c80ad697a2f6474e3b68e3912bd19de60d318fcfe1c59cf\nsize 409600",
  "lfs.track": "Listing tracked patterns\n    *.parquet (.gitattributes)\nListing excluded patterns",
  "mg.cat_head": "tree b52d54aa638a7e418ac34f52e7c966cf1b7c2ded\nparent cb8d98017f319efb7c1e48b9665c15cb510958e9\nparent 1fc4315fb3352e8492a866cc63480ae5989b420c\nauthor Maya Brewer <maya@brewline.example> 1772455320 +0000\ncommitter Maya Brewer <maya@brewline.example> 1772455320 +0000\n\nMerge branch 'feature'",
  "mg.graph": "*   e131836 (HEAD -> main) Merge branch 'feature'\n|\\\n| * 1fc4315 (feature) Document the check\n| * 47a31e7 Add the nightly check\n* | cb8d980 Rename orders to order_count\n|/\n* 098ade4 Add the nightly DAG\n* e90f432 Add the loader and the daily model",
  "mg.merge": "Merge made by the 'ort' strategy.\n README.md       | 1 +\n checks/check.sh | 8 ++++++++\n 2 files changed, 9 insertions(+)\n create mode 100644 checks/check.sh",
  "obj.cat_blob": "select\n    order_date,\n    store_id,\n    count(*) as orders,\n    sum(amount) as revenue\nfrom raw_orders\ngroup by 1, 2",
  "obj.cat_commit": "tree 81c0641b51ebd2c7e7eedc276594c9271e12f821\nauthor Maya Brewer <maya@brewline.example> 1772444220 +0000\ncommitter Maya Brewer <maya@brewline.example> 1772444220 +0000\n\nAdd the loader and the daily model",
  "obj.cat_tree": "100644 blob 01974e00644dac807bf6dc96dde933277a4eb633\tREADME.md\n040000 tree bbc0d56e18d958ba9a92cdb589af6d2016f4274c\tloader\n040000 tree 6d08bcd3fc0d9b56d82e1ae06b36f7f53467020a\tmodels",
  "obj.commit_out": "[main (root-commit) e90f432] Add the loader and the daily model\n 4 files changed, 26 insertions(+)\n create mode 100644 README.md\n create mode 100644 loader/load_orders.py\n create mode 100644 loader/tax_rate.txt\n create mode 100644 models/orders_daily.sql",
  "obj.diff": "diff --git a/models/orders_daily.sql b/models/orders_daily.sql\nindex afe0ac1..acd8270 100644\n--- a/models/orders_daily.sql\n+++ b/models/orders_daily.sql\n@@ -5,5 +5,5 @@ select\n     sum(amount) as revenue,\n     avg(amount) as avg_amount,\n     max(amount) as max_amount\n-from raw_orders\n+from raw_orders -- the source\n group by 1, 2",
  "obj.diff_staged": "diff --git a/README.md b/README.md\nindex 01974e0..746cb48 100644\n--- a/README.md\n+++ b/README.md\n@@ -1,3 +1,4 @@\n # Brewline data\n\n The orders pipeline of Brewline: a loader, a model and a nightly schedule.\n+Run the check before you push.",
  "obj.log": "e90f432 Add the loader and the daily model",
  "obj.ls_files": "100644 01974e00644dac807bf6dc96dde933277a4eb633 0\tREADME.md\n100644 ee91998b419030157c92222a7ab30520db177e13 0\tloader/load_orders.py\n100644 164d8ca33ce25104b11f6788fdf4cae1b6e356fd 0\tloader/tax_rate.txt\n100644 87c37fc68a64b982524e8c13cab87fa7726c6abb 0\tmodels/orders_daily.sql",
  "obj.status_long": "On branch main\nChanges to be committed:\n  (use \"git restore --staged <file>...\" to unstage)\n\tmodified:   README.md\n\nChanges not staged for commit:\n  (use \"git add <file>...\" to update what will be committed)\n  (use \"git restore <file>...\" to discard changes in working directory)\n\tmodified:   models/orders_daily.sql",
  "obj.status_staged": "A  README.md\nA  loader/load_orders.py\nA  loader/tax_rate.txt\nA  models/orders_daily.sql",
  "obj.status_untracked": "?? README.md\n?? loader/\n?? models/",
  "rb.ff_merge": "Updating cb8d980..045cb49\nFast-forward\n README.md       | 1 +\n checks/check.sh | 8 ++++++++\n 2 files changed, 9 insertions(+)\n create mode 100644 checks/check.sh",
  "rb.graph": "* 045cb49 (HEAD -> feature) Document the check\n* 91da3dd Add the nightly check\n* cb8d980 (main) Rename orders to order_count\n* 098ade4 Add the nightly DAG\n* e90f432 Add the loader and the daily model",
  "rb.rebase": "Successfully rebased and updated refs/heads/feature.",
  "rm.branch_vv": "* main e90f432 [origin/main] Add the loader and the daily model",
  "rm.clone": "Cloning into '~/omar'...\ndone.",
  "rm.config": "[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n\tlogallrefupdates = true\n[remote \"origin\"]\n\turl = ~/origin.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n[branch \"main\"]\n\tremote = origin\n\tmerge = refs/heads/main",
  "rm.force": "To ~/origin.git\n + 88b0de4...333d17d main -> main (forced update)",
  "rm.force_with_lease": "To ~/origin.git\n ! [rejected]        main -> main (stale info)\nerror: failed to push some refs to '~/origin.git'",
  "rm.graph_diverged": "* 34d8931 (HEAD -> main) Add a contact line\n| * 1deee73 (origin/main) Add the nightly DAG\n|/\n* e90f432 Add the loader and the daily model",
  "rm.graph_rebased": "* 89ff718 (HEAD -> main) Add a contact line\n* 1deee73 (origin/main) Add the nightly DAG\n* e90f432 Add the loader and the daily model",
  "rm.ls_remote": "89ff71877da4347a492d85088b22483017dd1441\tHEAD\n89ff71877da4347a492d85088b22483017dd1441\trefs/heads/main",
  "rm.pull_ff": "Updating 1deee73..89ff718\nFast-forward\n README.md | 1 +\n 1 file changed, 1 insertion(+)",
  "rm.pull_merge": "Merge made by the 'ort' strategy.\n dags/nightly.py | 7 +++++++\n 1 file changed, 7 insertions(+)\n create mode 100644 dags/nightly.py",
  "rm.pull_plain": "hint: You have divergent branches and need to specify how to reconcile them.\nhint: You can do so by running one of the following commands sometime before\nhint: your next pull:\nhint:\nhint:   git config pull.rebase false  # merge\nhint:   git config pull.rebase true   # rebase\nhint:   git config pull.ff only       # fast-forward only\nhint:\nhint: You can replace \"git config\" with \"git config --global\" to set a default\nhint: preference for all repositories. You can also pass --rebase, --no-rebase,\nhint: or --ff-only on the command line to override the configured default per\nhint: invocation.\nfatal: Need to specify how to reconcile divergent branches.",
  "rm.pull_rebase": "Successfully rebased and updated refs/heads/main.",
  "rm.push_amended": "To ~/origin.git\n ! [rejected]        main -> main (non-fast-forward)\nerror: failed to push some refs to '~/origin.git'\nhint: Updates were rejected because the tip of your current branch is behind\nhint: its remote counterpart. If you want to integrate the remote changes,\nhint: use 'git pull' before pushing again.\nhint: See the 'Note about fast-forwards' in 'git push --help' for details.",
  "rm.push_first": "branch 'main' set up to track 'origin/main'.\nTo ~/origin.git\n * [new branch]      main -> main",
  "rm.push_ok": "To ~/origin.git\n   1deee73..89ff718  main -> main",
  "rm.push_rejected": "To ~/origin.git\n ! [rejected]        main -> main (fetch first)\nerror: failed to push some refs to '~/origin.git'\nhint: Updates were rejected because the remote contains work that you do not\nhint: have locally. This is usually caused by another repository pushing to\nhint: the same ref. If you want to integrate the remote changes, use\nhint: 'git pull' before pushing again.\nhint: See the 'Note about fast-forwards' in 'git push --help' for details.",
  "rm.remote_ref": "333d17d0c70ebf64bdccf30735eecca41b631acd",
  "rm.remote_v": "origin\t~/origin.git (fetch)\norigin\t~/origin.git (push)",
  "rm.status_behind": "## main...origin/main [behind 1]",
  "rm.status_diverged": "## main...origin/main [ahead 1, behind 1]",
  "rm.status_diverged_long": "On branch main\nYour branch and 'origin/main' have diverged,\nand have 1 and 1 different commits each, respectively.\n  (use \"git pull\" if you want to integrate the remote branch with yours)\n\nnothing to commit, working tree clean",
  "sq.graph": "* faba94e (HEAD -> main) Add and document the nightly check\n* cb8d980 Rename orders to order_count\n* 098ade4 Add the nightly DAG\n* e90f432 Add the loader and the daily model",
  "sq.merge": "Squash commit -- not updating HEAD\nAutomatic merge went well; stopped before committing as requested",
  "tag.describe": "v1.1.0-2-ga591c12",
  "tag.describe_full": "v1.1.0-2-ga591c12",
  "tag.describe_shallow": "fatal: No names found, cannot describe anything.",
  "tag.describe_tag": "v1.1.0-1-gbe0d38f",
  "tag.list": "v1.0.0\nv1.1.0",
  "tag.show_annotated": "tag v1.1.0\nTagger: Maya Brewer <maya@brewline.example>\nDate:   Mon Mar 2 10:51:00 2026 +0000\n\nRelease 1.1.0: the nightly DAG\n\ncommit 098ade4ef38f24d56a0cf670aa01bfbfdc5fdd62\nAuthor: Maya Brewer <maya@brewline.example>\nDate:   Mon Mar 2 10:14:00 2026 +0000\n\n    Add the nightly DAG",
  "un.clean_f": "Removing scratch/\nRemoving scratch2.txt",
  "un.clean_n": "Would remove scratch/\nWould remove scratch2.txt",
  "un.deleted_status": " D README.md",
  "un.fsck": "unreachable tree 08f4e9dce80b5e6fb842a1b9ca090c59d258cc24\nunreachable blob e961155a533da266d773bcaefcf735ba87405b57\nunreachable commit 098ade4ef38f24d56a0cf670aa01bfbfdc5fdd62\nunreachable tree 2e05b77d9b93b6b3c9470fc6f6a5b25f13058d73\nunreachable tree 177abac09e0f6589aac953808f413c4ccb5a319b\nunreachable blob 76e7dfcd65acbc1e26880b91be10fd47c2e67f25\nunreachable tree fbe2acf9808d5d0f22f893b1d5aca456d92981c6\nunreachable commit 1f55e690829e5d56fdb149fa51260a2eece5d947",
  "un.log": "1f55e69 Raise the tax rate to 0.09\n098ade4 Add the nightly DAG\ne90f432 Add the loader and the daily model",
  "un.reflog": "e90f432 HEAD@{0}: reset: moving to HEAD~2\n1f55e69 HEAD@{1}: commit: Raise the tax rate to 0.09\n098ade4 HEAD@{2}: commit: Add the nightly DAG\ne90f432 HEAD@{3}: commit (initial): Add the loader and the daily model",
  "un.revert": "[main c0b4ab5] Revert \"Raise the tax rate to 0.09\"\n Date: Mon Mar 2 14:33:00 2026 +0000\n 1 file changed, 1 insertion(+), 1 deletion(-)",
  "un.revert_log": "c0b4ab5 Revert \"Raise the tax rate to 0.09\"\n1f55e69 Raise the tax rate to 0.09\n098ade4 Add the nightly DAG\ne90f432 Add the loader and the daily model",
  "un.status_after_restore": "(clean)",
  "un.status_after_unstage": " M README.md",
  "un.status_staged": "M  README.md"
 }
};
