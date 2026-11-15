/* Mission 4: data and volumes. Every Postgres on these screens was a real postgres container, with 5,000 rows. */
(function () {
  var B = LAB.b, G = LAB.get;
  var VM = G.table('volumes.matrix'), AN = G.counts('volumes.anonymous'), BD = G.counts('volumes.bind'), PM = G.counts('volumes.perms'), BK = G.counts('volumes.backup'), N = G.counts('volumes.rows_before').rows;
  var n = G.n;
  var cell = function (way, col) { return VM.rows.filter(function (r) { return r[0] === way; })[0][col]; };
  G.expect(cell('no volume flag', 1) === String(N) && cell('no volume flag', 2) === 'no table', 'with no flag the rows survive a restart and not a remove');
  G.expect(cell('named volume', 2) === String(N) && cell('bind mount of a host folder', 2) === String(N), 'a named volume and a bind mount keep the rows');
  G.expect(cell('tmpfs (memory)', 1) === 'no table', 'tmpfs loses the table at the first restart');
  G.expect(AN.dangling_volumes_left_by_rm === 1 && AN.mounts === 'volume /var/lib/postgresql/data', 'the image declares a volume and rm leaves it behind');
  G.expect(PM.file_owner_written_by_root_in_container === '0:0' && PM.non_root_write_rc !== 0, 'a root container writes root-owned files and a non-root one cannot write there');
  var ownerUid = BD.owner_of_pg_version_on_host.split(' ')[0], ownerMode = BD.owner_of_pg_version_on_host.split(' ')[1];

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Data and volumes', short: 'Data', blurb: 'Where a container writes, and what survives docker rm', minutes: 15,
    focus: ['mart', 'raw'],
    goals: [
      'Say where the data of a container goes: **writable layer, volume, bind mount, tmpfs**.',
      'Predict what **survives** a stop, a remove and a recreate.',
      'Explain **file ownership** on a bind mount.',
      'Decide when a database belongs in a container, and when it does not.'
    ],
    say: 'Brewline wants a Postgres for tests, and somebody removes the container on Friday. Whether the data is still there on Monday depends on one flag. We start Postgres five ways, load 5,000 orders each time, and see what is left.',
    scenes: [
      B.flow({
        id: 'm4-where', t: 1, src: 'docs', title: 'Four places to write', g: 'data', legend: true,
        steps: [
          { say: 'A Postgres container writes its data files all the time. Where do they land? There are four answers. Press Next.', focus: ['cont', 'wl', 'vol', 'bind', 'tmp'], cap: 'One container, four possible places.' },
          { say: 'Step 1. The **writable layer** of the container. This is where files go when you give no instruction. It is part of the container and goes with `docker rm`.', on: ['e1'], focus: ['cont', 'wl'], tags: ['tg_wl'], cap: 'Gone with the container.' },
          { say: 'Step 2. A **named volume**. Docker creates and manages a folder on the host and mounts it in the container. It has its own life. `docker rm` leaves it alone.', on: ['e2'], focus: ['cont', 'vol'], tags: ['tg_vol'], cap: 'Docker manages it, and it stays.' },
          { say: 'Step 3. A **bind mount**: a folder of the host that you name. The files are yours, in a path you chose. Nothing is created or removed for you.', on: ['e3'], focus: ['cont', 'bind'], tags: ['tg_bind'], cap: 'A host folder, mounted.' },
          { say: 'Step 4. **tmpfs**: memory. Fast, and gone when the container stops. Useful for scratch files that must not reach a disk.', on: ['e4'], focus: ['cont', 'tmp'], tags: ['tg_tmp'], cap: 'Memory only.' }
        ]
      }),

      B.term({
        id: 'm4-lost', t: 1, src: 'rec', title: 'The database that vanished',
        say: 'I started Postgres with no volume flag, loaded ' + n(N) + ' orders, restarted it, removed it, and started a new one. The results below are what the recorder read after each step.',
        lines: function () {
          return G.term([
            ['docker run -d --name db -e POSTGRES_PASSWORD=... postgres:16-alpine', '(the id of the container)'],
            ['docker exec db psql -U postgres -d brewline -c "CREATE TABLE orders AS ..."', 'SELECT ' + n(N)],
            ['docker stop db && docker start db', 'db'],
            ['docker exec db psql -U postgres -d brewline -tAc "SELECT count(*) FROM orders"', cell('no volume flag', 1)],
            ['docker rm -f db && docker run -d --name db2 ... postgres:16-alpine', '(the id of the new container)'],
            ['docker exec db2 psql -U postgres -d brewline -tAc "SELECT count(*) FROM orders"', 'ERROR:  relation "orders" does not exist']
          ]);
        },
        after: 'A stop and a start kept the **' + n(N) + '** rows. A **remove** did not. And yet the first container had a volume: the Postgres image declares one for its data directory, so Docker made an **anonymous volume** even though no flag asked for it. The new container got a new, empty one. The old one is still on the disk: after `docker rm` the recorder found **' + AN.dangling_volumes_left_by_rm + ' dangling volume**.',
        afterKind: 'warn',
        doneSay: 'No flag means no name, and no name means nobody finds the data again.'
      }),

      B.widget({ id: 'm4-lab', kind: 'vol', t: 1, src: 'rec', title: 'Lab: what survives?' }),

      B.cmp({
        id: 'm4-mounts', t: 1, src: 'docs', title: 'Volume, bind mount or tmpfs',
        say: 'The three ways to keep data outside the writable layer, side by side. Press Next.',
        cols: ['', 'Named volume', 'Bind mount', 'tmpfs'],
        hl: 0,
        rows: [
          ['Flag', '`-v pgdata:/var/lib/postgresql/data`', '`-v /srv/pg:/var/lib/postgresql/data`', '`--tmpfs /var/lib/postgresql/data`'],
          ['Who creates it', 'Docker, on first use.', 'You. The folder must exist for a bind mount with `-v`.', 'Docker, in memory.'],
          ['Where it lives', 'Under the Docker data folder, which you do not edit by hand.', 'The path that you gave.', 'In memory of the host.'],
          ['After `docker rm`', 'Stays.', 'Stays.', 'Gone.'],
          ['Best for', 'Data of a service: a database in a test stack, a cache.', 'Files you edit on the host: code in development, input files for a job.', 'Scratch files that must not touch a disk.']
        ],
        steps: [
          { upto: 3, say: 'Creation and place. A volume is managed for you. A bind mount is whatever you point at.' },
          { upto: 5, say: 'Lifetime and use. Volumes and bind mounts survive, tmpfs does not. Pick the one whose owner you want to be.' }
        ]
      }),

      B.rows({
        id: 'm4-owner', t: 1, src: 'rec', title: 'Who owns the files on a bind mount',
        steps: [
          {
            say: 'I started Postgres with a bind mount and looked at the files on the host.',
            tabs: [{ layer: 'RECORDED', name: 'The data directory of Postgres, on the host', c: 'raw', cols: ['what I looked at', 'result'], rows: [['files in the host folder', BD.files_in_host_dir], ['owner and mode of `PG_VERSION`', ownerUid + ' with mode ' + ownerMode]], trk: 0 }],
            notes: ['The files belong to user ID **' + ownerUid + '**, the postgres user inside the image, and have mode **' + ownerMode + '**. On the host that number may be nobody, or another person. You need to be that user, or root, to read the folder.']
          },
          {
            say: 'The same happens in the other direction. A container that runs as root writes files that are owned by root on the host.',
            tabs: [{ layer: 'RECORDED', name: 'Writing into a bind mount', c: 'raw', cols: ['who writes', 'result'], rows: [['a container as root', 'the file is owned by ' + PM.file_owner_written_by_root_in_container], ['a container as user 1000:1000', PM.non_root_write_error]], trk: 0 }],
            notes: ['A job that writes its output into a bind mount as root leaves root-owned files that your user cannot delete. A job as an ordinary user cannot write into a folder that belongs to root. Choose the user on purpose, and match it with the folder.']
          }
        ]
      }),

      B.term({
        id: 'm4-backup', t: 2, src: 'rec', title: 'Copy a volume out with a throwaway container',
        say: 'There is no `docker volume copy`. The usual way is a short-lived container that mounts the volume and the target folder.',
        lines: function () {
          return G.term([
            ['docker run --rm -v pgdata:/data:ro -v "$PWD":/backup alpine tar czf /backup/pgdata.tgz -C /data .', ''],
            ['docker run --rm -v pgdata:/data alpine sh -c \'ls /data | wc -l\'', String(BK.files_in_volume)],
            ['ls -l pgdata.tgz', BK.tar_bytes ? '(a file of more than 1 kB, created)' : '(empty)']
          ]);
        },
        after: 'The volume is mounted **read-only** (`:ro`), so the backup cannot change it. The volume holds **' + BK.files_in_volume + '** entries. Copying the files of a database that is running can give a backup that is not consistent. For Postgres, use `pg_dump`, or stop the container first (from documentation).',
        afterKind: 'warn',
        doneSay: 'A volume is just a folder. A container can mount it and copy it.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'A CI job starts a Postgres for tests. On Friday the team enabled a cleanup step that removes the container every night, and on Monday the test data was gone. Click the line that is the problem.',
        file: 'start_test_db.sh', lang: 'bash', code: '#!/bin/sh\ndocker rm -f testdb 2>/dev/null\ndocker run -d --name testdb \\\n  -e POSTGRES_PASSWORD=brewline-dev \\\n  postgres:16-alpine\n',
        bad: [3],
        hint: 'Which flag tells Docker where the data should live and what it is called?',
        why: 'The `docker run` has no `-v`. The image still gets an anonymous volume, and `docker rm` leaves it behind with no name. The next container starts empty. Give the data a **named volume**, or accept that this database is disposable and load it again in the job.',
        fix: '#!/bin/sh\ndocker rm -f testdb 2>/dev/null\ndocker run -d --name testdb \\\n  -e POSTGRES_PASSWORD=brewline-dev \\\n  -v testdb-data:/var/lib/postgresql/data \\\n  postgres:16-alpine\n',
        cheer: 'Name the volume, and the data has an owner.'
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'You start `postgres:16-alpine` with no `-v` flag, load data, and run `docker stop` and `docker start`. Is the data there?',
        opts: [
          { t: 'Yes', fb: '' },
          { t: 'No, because there is no volume', fb: 'The image declares a volume for its data directory, so an anonymous volume exists.' },
          { t: 'Only the last table', fb: 'Data is kept as a whole.' },
          { t: 'It depends on the host', fb: 'This behaves the same on every host.' }
        ],
        ok: 0, why: 'In the recording the rows survived the restart (' + cell('no volume flag', 1) + '). What they did not survive was `docker rm`.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'The same container is now removed with `docker rm`, and a new one starts with the same command. What does the new one see?',
        opts: [
          { t: 'The old data, because the volume has the same path', fb: 'An anonymous volume has a random name. A new container gets a new one.' },
          { t: 'An empty database, while the old data sits in a volume with no name', fb: '' },
          { t: 'An error, because the old data is in the way', fb: 'Docker does not know about it.' },
          { t: 'The old data, because Docker remembers the image', fb: 'An image holds no data of the container.' }
        ],
        ok: 1, why: 'The recording: "' + cell('no volume flag', 2) + '" in the new container, and ' + AN.dangling_volumes_left_by_rm + ' dangling volume left on the disk.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'Which way of storing the data directory loses it when the container only stops and starts again?',
        opts: [
          { t: 'A named volume', fb: '' },
          { t: 'A bind mount', fb: '' },
          { t: 'tmpfs', fb: '' },
          { t: 'The anonymous volume of the image', fb: '' }
        ],
        ok: 2, why: 'tmpfs is memory. The recording shows "' + cell('tmpfs (memory)', 1) + '" after a restart. The other three kept the ' + n(N) + ' rows.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put the steps of a safe local Postgres for development in order.',
        items: [
          'docker volume create pgdata',
          'docker run -d --name db -v pgdata:/var/lib/postgresql/data postgres:16-alpine',
          'Wait until the server accepts connections',
          'Load the data',
          'docker stop db, then docker start db',
          'Check that the row count is the same'
        ],
        why: 'The volume exists before the container needs it, and the check at the end proves that it kept the data. In the recording a named volume kept all ' + n(N) + ' rows through a stop, a start and a remove.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: where does the job write its output?',
        scenario: 'The loader job writes a Parquet file of 2 GB each night. It runs as a container started by a scheduler on one of several workers. Other jobs read the file in the morning.',
        opts: [
          { t: 'Into the writable layer of the container, at `/tmp`', d: 'Nothing to configure.', lose: 'The file is gone when the container is removed, and the next job runs on another worker anyway.' },
          { t: 'Into a volume on the worker', d: 'The file survives the container.', lose: 'The volume lives on one machine. A job on another worker cannot read it, and a replaced worker loses it.' },
          { t: 'To shared storage that every worker can reach: an object store such as S3 or GCS, or a database', d: 'The output has an address that does not depend on a machine.' }
        ],
        pick: 2,
        why: 'Jobs should be disposable and the data should not be. A volume ties data to a host, which breaks as soon as there is more than one worker. Use local storage for scratch space and for tests, and shared storage for results.',
        when: 'Use a volume or bind mount for a single-machine setup, a development stack, or a cache that can be rebuilt.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: the test database is empty on Monday', time: '08:50',
        alert: '**The integration tests fail with "relation orders does not exist".** The test database has been running on a shared build host. Somebody redeployed it on Friday.',
        clues: ['The container was removed and started again with the same `docker run` command', '`docker volume ls -f dangling=true` lists one volume with a long random name', 'The command has no `-v` flag'],
        opts: [
          { t: 'Mount the dangling volume in a new container to recover the data, then add a named volume to the command', fb: '' },
          { t: 'Run `docker volume prune` to clean up the unused volume', fb: 'That deletes the only copy of the old data.' },
          { t: 'Restart the container', fb: 'The container is new and empty. The data is in another volume.' },
          { t: 'Reinstall Docker', fb: 'The data is on the disk. Docker is fine.' }
        ],
        best: 0,
        why: 'The recording shows the mechanism: the image declared a volume, `docker rm` left it behind (' + AN.dangling_volumes_left_by_rm + ' dangling volume), and the new container got a new one. The old data can be mounted by its volume name. Do not prune before you have looked.',
        checks: [
          ['List the volumes', '`docker volume ls -f dangling=true` shows volumes that no container uses.'],
          ['Look inside', 'Mount it read-only in a throwaway container and list the files.'],
          ['Recover', 'Start Postgres with that volume mounted and dump the tables with `pg_dump`.'],
          ['Prevent', 'Name the volume in the command or the compose file.']
        ],
        tell: 'The test database was empty because the container was recreated without a named volume, so Postgres started on a new anonymous volume. The old data was still on the disk in a dangling volume. I mounted it, took a dump, and changed the command to use a named volume.',
        prevent: ['Always **name** the data volume', 'Do not prune volumes without looking', 'Treat a database in a container as disposable unless the volume is backed up']
      }),

      B.qa({
        id: 'qa-volumes', t: 1, tag: 'Docker', secs: 75,
        q: 'What happens to the data when a container is removed, and how do you keep it?',
        pts: ['The writable layer goes with the container', 'Volumes and bind mounts are outside it and stay', 'Name the volume so you can find it', 'tmpfs is gone when the container stops'],
        short: 'A container writes into its own writable layer, and that layer is deleted with `docker rm`. To keep data, mount a volume or a bind mount, because both live outside the container. I prefer a named volume for the data of a service, so that it has a name and I can find it. One trap: some images, such as Postgres, declare a volume for their data directory. With no flag, Docker makes an anonymous volume, so the data survives a stop and a start. In the recording it did, ' + n(N) + ' rows. But `docker rm` left it behind with a random name, and the new container started empty.',
        fu: [['What is tmpfs for?', 'Scratch files that must stay in memory. It is gone when the container stops.'], ['How do you back up a volume?', 'Mount it read-only in a throwaway container and tar it, or use the database tool, such as pg_dump.']],
        trap: 'Saying that data in a container is always lost on restart. A restart keeps it. A remove does not, unless it is in a volume.',
        real: 'Say how you stored the data of a database in a container.'
      }),

      B.qa({
        id: 'qa-bind', t: 2, tag: 'Docker', secs: 60,
        q: 'What is the difference between a volume and a bind mount, and what goes wrong with file ownership?',
        pts: ['A volume is created and managed by Docker', 'A bind mount is a host path that you choose', 'Files are owned by the user ID that wrote them', 'Match the container user with the folder owner'],
        short: 'A named volume is created and managed by Docker under its own folder, and a bind mount is a path on the host that I choose. Ownership is by user ID, not by name. In the recording the Postgres files on a bind mount belonged to user ' + ownerUid + ' with mode ' + ownerMode + ', and a container running as root wrote a file owned by ' + PM.file_owner_written_by_root_in_container + ' on the host. A container running as user 1000 could not write into a root-owned folder: "' + PM.non_root_write_error + '". So I decide which user the container runs as, and I make the folder match.',
        fu: [['When do you use a bind mount?', 'For files you edit or provide from the host, such as code in development or an input folder.'], ['Why not run as root to avoid the problem?', 'Root in the container is root on the bind-mounted files, and it widens what a flaw can do. Mission 9 returns to this.']],
        trap: 'Using `chmod 777` on a folder to make a permission error go away.',
        real: 'Describe a permission error on a mounted folder and how you fixed it.'
      }),

      B.qa({
        id: 'qa-dbcontainer', t: 2, tag: 'Docker', secs: 75,
        q: 'Would you run a production database in a container?',
        pts: ['Fine for development, tests and CI: disposable, fast, identical', 'Production data needs backups, upgrades, monitoring and failover', 'A managed database service does that work for you', 'If you do run one, use a named volume or a host path, backups, and tested restores'],
        short: 'For development and CI I use containers for databases all the time, because every test run can start from a clean, identical Postgres. For production I would normally use a managed database. The data must survive, so it needs backups, tested restores, upgrades, monitoring and failover, and a managed service does those for me. If I had to run Postgres in a container, I would use a named volume or a host path, take backups with pg_dump or the database tools, and not rely on the volume alone. The recording shows why: with no volume flag the data disappeared from the new container after a remove.',
        fu: [['How do you upgrade a Postgres version in a container?', 'The data directory belongs to a major version. You dump and restore, or use the upgrade tool, and you do not just change the image tag (from documentation).'], ['What is a good use in production?', 'Stateless jobs, and services whose state lives somewhere else.']],
        trap: 'Saying "containers are not for databases" with no reason, or "it works the same" with no mention of data.',
        real: 'Say where your team runs its databases.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Data Keeper', color: '#BFDBFE',
        pts: [
          'A container writes into a **writable layer** that goes with `docker rm`.',
          'A **named volume** or a **bind mount** stays. **tmpfs** is gone when the container stops.',
          'With no flag, Postgres still got an **anonymous volume**: the rows survived a restart (' + n(N) + ') and not a remove, which left **' + AN.dangling_volumes_left_by_rm + ' dangling volume**.',
          'Files on a bind mount belong to a **user ID**: ' + ownerUid + ' for Postgres, ' + PM.file_owner_written_by_root_in_container + ' for a root container.',
          'Jobs are disposable. Keep results in **shared storage**.'
        ],
        lines: [
          'I can predict what survives a remove.',
          'I name my volumes.',
          'I know when a database belongs in a container.'
        ]
      })
    ]
  });
})();
