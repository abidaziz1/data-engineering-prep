/* Mission 3: time. Schedules, logical dates, data intervals, time zones, catchup and backfill.
   The timetable results, the cron fire times, the daylight saving cases, the catchup runs and the backfill are recorded from Apache Airflow 3.4.0 (airflow/verify/capture_af.py).
   The labs apply the rules of the timetables in JavaScript, and verify/check_widgets.js compares them with every recorded case. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CTX = G.counts('af.ctx'), CU = G.counts('af.catchup').variants, TT = G.counts('af.timetables'), MORE = G.counts('af.timetables_more'), BF = G.counts('af.backfill');
  G.expect(CU.brewline_catchup_off.run_count === 1 && CU.brewline_catchup_on.run_count === 5 && CU.brewline_catchup_on.peak_parallel_runs === 2 && CU.brewline_catchup_serial.peak_parallel_runs === 1, 'the recorded catchup runs');
  G.expect(CTX.manual.has_logical_date === false && CTX.scheduled.has_logical_date === true, 'the recorded manual run has no logical date');
  G.expect(G.cfg('scheduler.catchup_by_default') === 'False' && G.cfg('scheduler.create_cron_data_intervals') === 'False', 'catchup is off by default and cron strings do not make data intervals');
  G.expect(BF.created.length === 3 && BF.second_backfill_while_running.exit_code !== 0, 'the recorded backfill made three runs and a second one was refused');

  var CATCHUP = G.file('dags/brewline_catchup_on.py'), BACKFILL_DAG = G.file('dags/brewline_backfill_demo.py'), CTXDAG = G.file('dags/brewline_ctx.py');

  var NOW_BUG = [
    'from airflow.sdk import dag, task',
    'from datetime import date',
    'import pendulum',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=True)',
    'def brewline_daily_orders():',
    '    @task',
    '    def load():',
    '        day = date.today().isoformat()',
    '        print(f"loading orders for {day}")',
    '',
    '    load()',
    '',
    '',
    'brewline_daily_orders()'
  ].join('\n');
  var NOW_FIX = NOW_BUG.replace('    def load():\n        day = date.today().isoformat()', '    def load(ds=None):\n        day = ds').replace('from datetime import date\n', '');
  var START_BUG = [
    'from datetime import datetime',
    '',
    'from airflow.sdk import DAG',
    'from airflow.providers.standard.operators.bash import BashOperator',
    '',
    'with DAG(dag_id="brewline_hourly", schedule="@hourly", start_date=datetime.now(), catchup=False) as dag:',
    '    BashOperator(task_id="load", bash_command="echo loading {{ ds }}")'
  ].join('\n');
  var START_FIX = START_BUG.replace('start_date=datetime.now()', 'start_date=pendulum.datetime(2026, 3, 1, tz="UTC")').replace('from datetime import datetime\n', 'import pendulum\n');

  function ctxLines() {
    return [].concat(
      [{ c: 'cmd', t: '# the log of the task "show" in the scheduled run of 14 March', d: 350 }], G.plain(CTX.scheduled.show_log, { d: 60 }),
      [{ c: 'cmd', t: '# the log of the same task in a run started by hand without a logical date', d: 350 }], G.plain(CTX.manual.show_log, { d: 60 }));
  }
  function bfLines() {
    return [].concat(
      G.plain(G.text('af.backfill_dry_run'), { cmd: 'airflow backfill create --dag-id brewline_backfill_demo --from-date 2026-03-05 --to-date 2026-03-07 --dry-run', d: 25 }),
      G.plain(G.text('af.backfill_create'), { cmd: 'airflow backfill create --dag-id brewline_backfill_demo --from-date 2026-03-05 --to-date 2026-03-07 --max-active-runs 2', d: 60 }),
      [{ c: 'cmd', t: '$ airflow backfill create ... (the same command again, while the first backfill still runs)', d: 400 }, { c: 'err', t: BF.second_backfill_while_running.error, d: 80 }]);
  }

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Time: schedules, logical dates and data intervals', short: 'Time', blurb: 'The logical date, the data interval, cron and time zones, catchup and backfill', minutes: 70,
    focus: ['ing'],
    goals: [
      'Explain the **logical date**, the **data interval** and the time a run starts, and which one `ds` is.',
      'Say what a plain cron string gives you in Airflow 3 (a **trigger** timetable) and when to use a **data interval** timetable.',
      'Read a **cron expression**, including the day-of-month and day-of-week rule, and predict the next runs.',
      'Predict what happens at a **daylight saving** change.',
      'Choose **catchup** and **max_active_runs**, and run a safe **backfill**.'
    ],
    say: 'Mission 3 is time, the topic that most Airflow interviews return to. Every table of dates in this mission comes from Airflow 3.4.0: I asked its timetables for runs, I ran a scheduler with catchup on and off, and I ran a backfill. The labs apply the same rules in JavaScript, and a check compares the labs with every recorded case.',
    scenes: [
      B.talk({
        id: 'm3-talk', t: 1, src: 'rec', title: 'The times of a run',
        say: 'Every run has a few times. People mix them up, and a mix-up loads the wrong day. Press Next for each one.',
        items: [
          ['Logical date', 'A date that **names the run**. A scheduled run has one. In Airflow 3 a run started by hand can have **none**: the recording shows `logical_date = <missing>` for a manual run without it. `ds` is the logical date as `YYYY-MM-DD`.', 'The name of the run, not the moment it starts.'],
          ['Data interval', 'A **start and an end**: the slice of time that the run is about. A timetable with intervals gives each run one. With a plain cron string in Airflow 3 the start and the end are **the same moment**, because a cron string makes a trigger timetable, and the recording shows it.', 'The slice of data to process.'],
          ['Run after', 'The earliest moment the run may **start**. A timetable with an interval sets it to the end of the interval, so the run for a day starts when the day is over. A trigger timetable sets it to the fire time.', 'When the run may begin.'],
          ['A rerun reads the same data', 'If a task reads the data of `data_interval_start` to `data_interval_end` and not "now", then running it again next week gives the same result. That is the point of these dates: **repeatable runs**.', 'Dates make reruns safe. Mission 4 builds on it.'],
          ['The two defaults of Airflow 3', 'A cron string such as `0 2 * * *` makes a **CronTriggerTimetable**, as `create_cron_data_intervals` is ' + G.cfg('scheduler.create_cron_data_intervals') + ' by default. And `catchup_by_default` is ' + G.cfg('scheduler.catchup_by_default') + ', so a new DAG does not run for the days before today.', 'Both are different from Airflow 2.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm3-flow', t: 1, src: 'docs', title: 'A data interval timetable cuts time into intervals', g: 'intervals', legend: false,
        steps: [
          { say: 'This picture is for a **data interval** timetable, for example `CronDataIntervalTimetable("0 2 * * *")`. It is the model that Airflow 1 and 2 used for every cron string. Press Next to read it. The last step shows what a plain cron string does in Airflow 3.', cap: 'Three days of a daily schedule at 02:00.' },
          { say: 'The schedule cuts time into **intervals**. Interval 1 is from 1 March 02:00 to 2 March 02:00, interval 2 follows it, and so on. Each interval is a slice of data that is "complete" when the interval ends.', focus: ['iv1', 'iv2', 'iv3'], cap: 'The intervals do not overlap and leave no gap.' },
          { say: 'The run for interval 1 can start only when the interval is over, at 2 March 02:00. Airflow calls that moment **run after**. This is why the run for 1 March starts on the 2nd.', on: ['e1'], focus: ['iv1', 'r1'], cap: 'A day is processed after the day.' },
          { say: 'The **logical date** of the run is the **start** of its interval: 1 March 02:00. `ds` is `2026-03-01`. The run that starts on the 2nd carries the date of the 1st, and a task that formats `ds` gets the day that it must load.', focus: ['iv1'], tags: ['tg_ld'], cap: 'logical_date = the start of the interval.' },
          { say: 'The task reads the interval, `data_interval_start` to `data_interval_end`, and not the clock. Run it today or in a month and it reads the same slice.', focus: ['iv1', 'r1'], tags: ['tg_read'], cap: 'Read the interval, not "now".' },
          { say: 'The runs keep coming: run 2 starts when interval 2 ends, run 3 when interval 3 ends.', on: ['e2', 'e3'], focus: ['iv2', 'r2', 'iv3', 'r3'], cap: 'One run for each interval.' },
          { say: 'In Airflow 3 a plain cron string is **not** a data interval timetable. It makes a **trigger** timetable: the run starts at the fire time, its logical date is the fire time, and the start and end of its interval are that same moment. The lab on the next screens lets you compare both.', cap: 'Trigger: a point. Data interval: a slice.' }
        ]
      }),

      B.widget({ id: 'm3-w-interval', kind: 'interval', t: 1, src: 'rec', title: 'Lab: logical date, data interval and run after' }),

      B.term({
        id: 'm3-ctx', t: 1, src: 'rec', title: 'What a task sees in a scheduled run and in a manual run',
        say: 'This DAG has a task that prints the values of its run. These are the two real logs: a run made by the scheduler for 14 March, and a run that I started by hand without a logical date.',
        lines: ctxLines,
        after: 'The scheduled run has a logical date, an interval and `ds`. Its interval start and end are the same moment, because the DAG uses a plain cron string. The manual run has **no logical date and no data interval, and `ds` does not exist**. A task that does `ds[:7]` fails with an error. A task that needs a date must handle a manual run: give the trigger a logical date, or let the task read a parameter.',
        afterKind: 'tip',
        doneSay: 'In Airflow 3 a manual run is a real run without a date. Decide what your tasks do then.'
      }),

      B.cmp({
        id: 'm3-cmp', t: 1, src: 'rec', title: 'Timetables: what you can pass to schedule',
        say: 'The `schedule` argument of a DAG takes a lot of things. Press Next to compare them. The runs in the right column come from the recorded timetables, asked for the first runs after 1 March at UTC.',
        cols: ['You write', 'What it is', 'First run, from the recording'],
        hl: 1,
        rows: [
          ['`"0 2 * * *"` or `"@daily"`', 'A cron string. In Airflow 3 it makes `CronTriggerTimetable`.', 'Logical date 1 March 02:00. Starts 1 March 02:00. Interval: a point.'],
          ['`CronDataIntervalTimetable("0 2 * * *", timezone="UTC")`', 'Cron with data intervals, as in Airflow 2.', 'Logical date 1 March 02:00. Interval 1 March 02:00 to 2 March 02:00. Starts 2 March 02:00.'],
          ['`CronTriggerTimetable("0 2 * * *", timezone="UTC", interval=timedelta(days=1))`', 'Cron trigger that also carries an interval before the fire time.', 'Logical date 28 February 02:00. Interval 28 February 02:00 to 1 March 02:00. Starts 1 March 02:00.'],
          ['`timedelta(hours=6)`', 'A fixed delta. In Airflow 3 it makes `DeltaTriggerTimetable`.', 'Runs at 00:00, 06:00, 12:00. Interval: a point.'],
          ['`DeltaDataIntervalTimetable(timedelta(hours=6))`', 'A fixed delta with data intervals.', 'Logical date 00:00. Interval 00:00 to 06:00. Starts 06:00.'],
          ['`None`', 'No schedule. Run by hand, by the API or by a trigger.', 'No runs are created.'],
          ['`[Asset(...)]`', 'Run when an asset is updated (mission 5).', 'No time. An update starts a run.']
        ],
        steps: [
          { upto: 3, say: 'The first three are cron. The only difference between the first and the second is the question "is the interval a point or a slice?". The third gives a slice and starts at the fire time.' },
          { upto: 5, say: 'A delta is every N hours from the start date. The same two flavours exist.' },
          { upto: 7, say: 'No schedule and asset schedules do not use time at all. Mission 5 has the lab for assets.' }
        ]
      }),

      B.widget({ id: 'm3-w-cron', kind: 'cron', t: 1, src: 'rec', title: 'Lab: read a cron expression' }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'A DAG uses `CronDataIntervalTimetable("0 2 * * *")`. The run that starts at 2 March 02:00 has which logical date?',
        opts: [
          { t: '2 March 02:00', fb: 'That is when it starts. The logical date is the start of the interval.' },
          { t: '1 March 02:00', fb: '' },
          { t: '3 March 02:00', fb: 'That is the end of the next interval.' },
          { t: 'It has none', fb: 'A scheduled run of this timetable has one.' }
        ],
        ok: 1, why: 'The logical date is the start of the data interval, 1 March 02:00. The run starts at the end of the interval, 2 March 02:00. The lab showed the same rows for this timetable.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'A DAG has `schedule="0 2 * * *"` in Airflow 3 and nothing else about the timetable. For the run that starts at 2 March 02:00, what is `ds`?',
        opts: [
          { t: '2026-03-01', fb: 'That is the answer for a data interval timetable.' },
          { t: '2026-03-02', fb: '' },
          { t: '2026-03-03', fb: 'ds is never the date after the start.' },
          { t: 'ds is empty', fb: 'A scheduled run has a logical date, so `ds` exists.' }
        ],
        ok: 1, why: 'A cron string makes a trigger timetable. The logical date is the fire time, so `ds` is the day it starts. If the task must load the day before, read `data_interval_start` of a timetable with an interval, or use `macros.ds_add(ds, -1)`.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'You create a DAG with a start date four days ago, `catchup=True`, and unpause it. How many runs does the scheduler make for a daily schedule?',
        opts: [
          { t: 'One', fb: 'That is what catchup off gives.' },
          { t: 'Five, one for each day from the start date up to today', fb: '' },
          { t: 'Four, one for each day before today', fb: 'The run for today is created too, because the fire time at midnight has passed.' },
          { t: 'None until the next midnight', fb: 'Catchup creates the missed runs now.' }
        ],
        ok: 1, why: 'The recording made 5 runs for a start date four days back with catchup on. With catchup off it made ' + CU.brewline_catchup_off.run_count + ' run, for the latest slot only. In Airflow 3 catchup is off by default.'
      }),

      B.quiz({
        id: 'm3-q4', t: 1,
        q: 'A catchup DAG has `max_active_runs=2` and five runs to make. What did the recording show?',
        opts: [
          { t: 'All five ran at the same time', fb: 'max_active_runs caps the runs of one DAG that are active at once.' },
          { t: 'At most 2 ran at the same time, and the rest waited', fb: '' },
          { t: 'Only 2 runs were made in total', fb: 'The limit is on parallel runs, not on the number of runs.' },
          { t: 'The runs ran one by one in any case', fb: 'That happens with `max_active_runs=1`.' }
        ],
        ok: 1, why: 'The recorded peak was ' + CU.brewline_catchup_on.peak_parallel_runs + ' runs at once with max_active_runs 2, and ' + CU.brewline_catchup_serial.peak_parallel_runs + ' with max_active_runs 1. The default is ' + G.cfg('core.max_active_runs_per_dag') + '.'
      }),

      B.widget({ id: 'm3-w-catchup', kind: 'catchup', t: 1, src: 'rec', title: 'Lab: catchup, max_active_runs and backfill' }),

      B.code({
        id: 'm3-code-catchup', t: 1, src: 'rec', title: 'A DAG that catches up', file: 'brewline_catchup_on.py', lang: 'python', code: CATCHUP,
        steps: [
          { say: 'This is the file behind the recorded catchup runs. The start date is four days before the day of the recording.', lines: null },
          { say: '`start_date` is the first date the DAG may run for. `catchup=True` tells the scheduler to create a run for every slot since then. `max_active_runs=2` lets two of them run at the same time.', lines: G.span(CATCHUP, /dag_id=/, /max_active_runs/) },
          { say: 'The task sleeps for three seconds, so that runs overlap long enough to count them. `{{ ds }}` is the logical date of each run.', lines: G.span(CATCHUP, /BashOperator\(/, /BashOperator\(/) }
        ],
        note: 'The recorded runs were ' + CU.brewline_catchup_on.runs.map(function (r) { return r.logical_date.slice(0, 10); }).join(', ') + ', all with state success.'
      }),

      B.term({
        id: 'm3-bf', t: 1, src: 'rec', title: 'A backfill: the dry run, the run, and a refusal',
        say: 'A **backfill** creates runs for a date range that you choose, for a DAG that has catchup off. These are the three real commands. The first only lists what it would do. The second creates the runs. The third tries to start another backfill for the same DAG while the first one is still running.',
        lines: bfLines,
        after: 'The dry run lists three runs, one for each day of the window 5 to 7 March. The real call created three runs, and the scheduler ran them. Airflow allows **one running backfill per DAG**, and the second call was refused. After the first backfill completed, a call with `--reprocess-behavior none` created no new run, because the runs already existed.',
        afterKind: 'tip',
        doneSay: 'Always do the dry run first. A backfill is a loop of real runs.'
      }),

      B.code({
        id: 'm3-code-bf', t: 2, src: 'rec', title: 'The DAG behind the backfill', file: 'brewline_backfill_demo.py', lang: 'python', code: BACKFILL_DAG,
        steps: [
          { say: 'A daily load with `catchup=False`. The DAG makes one run a day from now on. The older days are filled by a backfill, on purpose and in a range that you choose.', lines: null },
          { say: 'The recorded backfill with `--reprocess-behavior completed` ran the three finished runs again: the task of each run went from try ' + BF.tries_after_none.join(', ') + ' to try ' + BF.tries_after_completed.join(', ') + '. With `none` an existing run is left alone. By the 3.4.0 source, `failed` reruns only the failed runs, and a run that is still in flight is never touched.', lines: null }
        ]
      }),

      B.quiz({
        id: 'm3-q5', t: 2,
        q: 'A backfill over 10 days is running. Somebody starts a second backfill for the same DAG for another range. What does Airflow 3.4 do?',
        opts: [
          { t: 'It runs both at the same time', fb: 'The recording shows that it did not.' },
          { t: 'It refuses the second one: only one backfill per DAG can be running', fb: '' },
          { t: 'It cancels the first backfill', fb: 'Nothing cancels the first one.' },
          { t: 'It merges the ranges', fb: 'There is no merge.' }
        ],
        ok: 1, why: 'The recorded error was "' + BF.second_backfill_while_running.error.replace(/^airflow\.models\.backfill\./, '') + '". Wait until the running backfill completes, or pause it.'
      }),

      B.quiz({
        id: 'm3-q6', t: 2,
        q: 'You trigger a run by hand, in the UI, without choosing a logical date. A task does `datetime.strptime(ds, "%Y-%m-%d")`. What happens in Airflow 3?',
        opts: [
          { t: 'It uses today\'s date', fb: 'A manual run does not borrow today\'s date for `ds`.' },
          { t: 'The task fails, because `ds` is missing for a run without a logical date', fb: '' },
          { t: 'It uses the start date of the DAG', fb: 'No value is filled in from the start date.' },
          { t: 'The run is rejected', fb: 'Airflow accepts a manual run without a logical date.' }
        ],
        ok: 1, why: 'The recording shows `ds = <missing>` and a task argument `ds = None` for a manual run without a date. Either give the run a logical date when you trigger it, or write the task so that it reads a parameter and falls back to a rule you choose.'
      }),

      B.quiz({
        id: 'm3-q7', t: 2,
        q: 'The cron expression `0 0 13 * 5` is on a DAG. When does it run?',
        opts: [
          { t: 'Only on Friday the 13th', fb: 'That is a common wish. Cron does not do it.' },
          { t: 'On every 13th of the month and on every Friday', fb: '' },
          { t: 'On the 13th, but only if it is a Friday, otherwise on the next Friday', fb: 'There is no such rule.' },
          { t: 'On every Friday, and the 13th is ignored', fb: 'Both fields count.' }
        ],
        ok: 1, why: 'When both the day of the month and the day of the week are restricted, a day matches if **either** one does. The cron lab computed it, and its logic matched Airflow\'s own fire times for ' + Object.keys(G.counts('af.cron').exprs).length + ' recorded expressions. For "the first Monday" use `0 12 1-7 * 1` for the candidate days and check the weekday in the task.'
      }),

      B.widget({ id: 'm3-w-dst', kind: 'dst', t: 2, src: 'rec', title: 'Lab: time zones and the days the clock changes' }),

      B.quiz({
        id: 'm3-q8', t: 2,
        q: 'In New York the clocks go forward on 8 March 2026: 02:00 does not exist that day. A DAG has `CronTriggerTimetable("0 2 * * *", timezone="America/New_York")`. What did Airflow 3.4 do on 8 March?',
        opts: [
          { t: 'It skipped the day', fb: 'The recording shows a run.' },
          { t: 'It ran at 03:00 local time, the same moment as 02:00 standard time, and the next run came 23 hours later', fb: '' },
          { t: 'It ran twice', fb: 'That is the autumn case for some expressions.' },
          { t: 'It failed with an error', fb: 'The timetable returned a time.' }
        ],
        ok: 1, why: 'The recording shows fire times of 07:00 UTC on 7 and 8 March, and 06:00 UTC on 9 March: the gaps between runs were 24, 24 and 23 hours. A job that must not move should run in UTC, or at a time that is not near the change.'
      }),

      B.cmp({
        id: 'm3-more', t: 2, src: 'rec', title: 'Two more timetables: events and several cron strings',
        say: 'You are not limited to one cron string. Press Next. Both of these were recorded.',
        cols: ['Timetable', 'What it does', 'Runs from the recording'],
        hl: 1,
        rows: [
          ['`EventsTimetable([...dates...])`', 'Runs at the times you list, such as holidays or release dates.', MORE.events.runs.map(function (r) { return r.logical_date.slice(0, 16); }).slice(0, 3).join(', ')],
          ['`MultipleCronTriggerTimetable("0 1 * * *", "0 13 * * 1", timezone="UTC")`', 'Runs at the times of several cron strings together.', MORE.multiple_cron.runs.map(function (r) { return r.logical_date.slice(5, 16); }).slice(0, 5).join(', ')]
        ],
        steps: [
          { upto: 1, say: 'An events timetable has no pattern. You list the moments. Use it for dates that a calendar decides.' },
          { upto: 2, say: 'The second one fires every day at 01:00 and also on Mondays at 13:00. The Monday 16 March run list contains both times, in order.' }
        ]
      }),

      B.cmp({
        id: 'm3-delta', t: 3, src: 'rec', title: 'Extra: a delta timetable with a manual run',
        say: 'Press Next. A delta timetable runs every N hours from the start date. The recorded runs for 6 hours, and what a manual run at 15:30 infers, show the difference between the two flavours again.',
        cols: ['Timetable', 'First runs from 1 March 00:00', 'A manual run started at 14 March 15:30'],
        hl: 2,
        rows: [
          ['`DeltaTriggerTimetable(timedelta(hours=6))`', TT.delta_trigger_6h.runs.map(function (r) { return r.logical_date.slice(11, 16); }).slice(0, 3).join(', ') + ' (each is a point)', 'A point at 15:30'],
          ['`DeltaDataIntervalTimetable(timedelta(hours=6))`', TT.delta_interval_6h.runs.slice(0, 3).map(function (r) { return r.interval_start.slice(11, 16) + ' to ' + r.interval_end.slice(11, 16); }).join(', '), 'The 6 hours before the click: ' + TT.delta_interval_6h.manual[1].interval_start.slice(11, 16) + ' to ' + TT.delta_interval_6h.manual[1].interval_end.slice(11, 16)]
        ],
        steps: [
          { upto: 2, say: 'A manual run needs an interval too, so the timetable **infers** one. A data interval delta looks back one delta from the click.' }
        ]
      }),

      B.bug({
        id: 'm3-bug1', t: 1, q: 'This task should load the orders of the logical date. When you run the DAG again for 3 March, it loads the wrong day. Click the line that is wrong.',
        file: 'brewline_daily_orders.py', lang: 'python', code: NOW_BUG, bad: [G.at(NOW_BUG, /date\.today/)],
        hint: 'What does the clock say when you run an old day today?',
        why: 'The line reads the clock, so every rerun loads the day it runs on. The logical date is a parameter of the run: `ds` gives it. A rerun, a retry and a backfill then load the same day as the first run did.',
        fix: NOW_FIX,
        cheer: 'Never use "now" in a task that must be repeatable.'
      }),

      B.bug({
        id: 'm3-bug2', t: 2, q: 'This DAG should run every hour. Its start date is wrong. Click the line.',
        file: 'brewline_hourly.py', lang: 'python', code: START_BUG, bad: [G.at(START_BUG, /start_date=datetime\.now/)],
        hint: 'What is the start date the next time the file is parsed?',
        why: '`datetime.now()` gives a different start date every time the DAG processor parses the file. The scheduler keeps computing intervals from a moving point, so runs are skipped or never start. Use a fixed date in the past. The Airflow documentation says the same.',
        fix: START_FIX,
        cheer: 'A start date is a fixed fact, not a calculation.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put a safe backfill of 30 days in order.',
        items: [
          'Make sure that every task of the DAG is safe to run again for a past date',
          'Run the dry run and read the list of runs',
          'Choose the reprocess behaviour: none, failed or completed',
          'Set `--max-active-runs` so that the warehouse can take it',
          'Create the backfill and watch the first runs',
          'Check the results, then confirm that the backfill is complete before you start another'
        ],
        why: 'A backfill is a loop of real runs, so the tasks must be repeatable first (mission 4). The dry run shows what will happen. The limit protects the systems that your tasks call, and Airflow lets only one backfill run per DAG.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'rec', title: 'Decision: which timetable for the nightly Brewline load?',
        scenario: 'The nightly load must read the **24 hours that ended at 02:00**. Engineers also trigger it by hand in the middle of the day, and a manual run must read the **same aligned window** as the scheduled one: from 02:00 the day before to 02:00 today. Which schedule do you use?',
        opts: [
          { t: '`schedule="0 2 * * *"`, a plain cron string', d: 'The simplest line.', lose: 'In Airflow 3 it gives a trigger timetable: the interval is a point. A task has no window to read, and a manual run has no window either.' },
          { t: '`CronDataIntervalTimetable("0 2 * * *")`', d: 'Each run has the interval from 02:00 to 02:00. A manual run at 15:30 infers the last complete interval, and the recording shows 13 March 02:00 to 14 March 02:00.' },
          { t: '`CronTriggerTimetable("0 2 * * *", interval=timedelta(days=1))`', d: 'Scheduled runs get the same interval.', lose: 'A manual run at 15:30 infers a sliding window: 13 March 15:30 to 14 March 15:30, as the recording shows. It overlaps two aligned days and the load would copy rows twice.' }
        ],
        pick: 1,
        why: 'For aligned windows that survive manual runs, a data interval timetable infers the last complete interval. The trigger timetable with an interval is right for schedules where the window is "the time before the run", whenever it happens.',
        when: 'Choose the trigger timetable with an interval when the window really is "the last 24 hours before this run" and an overlap is harmless.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: 2,160 runs and a warehouse on its knees', time: '10:12',
        alert: '**At 10:05 an engineer unpaused `brewline_orders_hourly`, a new hourly DAG with `start_date` three months ago and `catchup=True`. The scheduler created hundreds of runs. The warehouse queue is full and the nightly reports are late.**',
        clues: ['An hourly schedule over 90 days is 2,160 slots (90 x 24)', 'The DAG has no `max_active_runs`, so the default of ' + G.cfg('core.max_active_runs_per_dag') + ' applies', 'Each run starts a heavy query'],
        opts: [
          { t: 'Pause the DAG, then set `catchup=False` or a recent `start_date`, set `max_active_runs`, and run the old days later as a controlled backfill', fb: '' },
          { t: 'Restart the scheduler', fb: 'The runs already exist in the database. A restart does not remove them.' },
          { t: 'Raise `parallelism` so that all runs finish faster', fb: 'That floods the warehouse more.' },
          { t: 'Delete the DAG file', fb: 'The runs and their data stay, and Airflow marks the DAG stale. You lose the way to control it.' }
        ],
        best: 0,
        why: 'With catchup on, Airflow makes a run for every missed slot. The recording shows five runs for a start date four days back, and the number grows with the schedule. `max_active_runs` limits how many run at once, and a backfill is the right tool for old days because you choose the range, the reprocess behaviour and the limit.',
        checks: [
          ['Stop the flood', 'Pause the DAG first. Queued runs stay queued, and running ones finish.'],
          ['Fix the cause', 'Choose a start date that matches what you want, and set `catchup=False` if you do not want old days. Set `max_active_runs` to what the warehouse can take.'],
          ['Old days', 'Do a dry run of a backfill for the range you really need, then create it with `--max-active-runs`.']
        ],
        tell: 'I paused the DAG, fixed the start date and the catchup setting, set max_active_runs from what the warehouse could take, and backfilled the days we actually needed with a dry run first.',
        prevent: 'Review start_date and catchup in code review, and keep `catchup_by_default` at its Airflow 3 default of off.'
      }),

      B.qa({
        id: 'qa-logical', t: 1, tag: 'Airflow', secs: 75,
        q: 'What is the logical date of a run, and why does a daily run for 1 March start on 2 March?',
        pts: ['A date that names the run, not the moment it starts', 'With a data interval timetable it is the start of the interval', 'The run starts when the interval ends', 'In Airflow 3 a cron string is a trigger timetable: the run starts at the logical date'],
        short: 'The logical date names the run. With a data interval timetable it is the **start** of the interval that the run is about. A daily run for 1 March covers 1 March 02:00 to 2 March 02:00, and it can start only when that day is over, so it starts on 2 March. The task reads the interval, so a rerun a week later loads the same day.\n\nIn Airflow 3 there is one more case. A plain cron string makes a trigger timetable: the run starts at the fire time, its logical date is the fire time, and the interval start and end are the same moment. If a task needs "the day before", I either use a timetable with an interval or subtract a day from `ds`.\n\nAnd a manual run can have no logical date at all, so I write tasks that cope with that.',
        fu: [['What is ds?', 'The logical date as YYYY-MM-DD.'], ['What is run after?', 'The earliest moment the run may start.']],
        trap: 'Saying that the logical date is when the run starts. It is when the interval starts.',
        real: 'Describe a pipeline of yours that is processed after its day, and which date its tasks use.'
      }),

      B.qa({
        id: 'qa-interval', t: 1, tag: 'Airflow', secs: 60,
        q: 'What is a data interval, and why does it make reruns safe?',
        pts: ['A start and an end of the slice of data a run is about', 'Tasks read the interval, not the clock', 'The same run gives the same slice every time', 'In Airflow 3 trigger timetables have no slice'],
        short: 'A data interval is the start and the end of the slice of time that a run is about. Airflow gives it to the task as `data_interval_start` and `data_interval_end`. If the task reads exactly that slice and not "now", then a retry, a rerun or a backfill reads the same rows as the first run, and the result is the same. That is what makes reruns safe.\n\nNot every timetable has a slice. In Airflow 3 a plain cron string makes a trigger timetable, where start and end are the same moment, so for a windowed load I choose a data interval timetable or a trigger timetable with an interval. I check what a manual run gets, because the timetable infers its interval from the time of the click.',
        fu: [['What if the source adds rows late?', 'Read a wider window or use a watermark and an upsert. Mission 4.']],
        trap: 'Using datetime.now() in a task. A rerun then loads the day it runs on.',
        real: 'Say which date your tasks filter on, and what a rerun does today.'
      }),

      B.qa({
        id: 'qa-catchup', t: 1, tag: 'Airflow', secs: 75,
        q: 'What are catchup and backfill, and how do they differ?',
        pts: ['Catchup: the scheduler makes runs for missed slots since the start date', 'Backfill: you ask for a date range, on purpose', 'max_active_runs caps parallel runs', 'Airflow 3: catchup off by default, backfills run by the scheduler'],
        short: 'Catchup is automatic. When a DAG with catchup on is unpaused, the scheduler creates a run for every slot between the start date and now. In Airflow 3 it is off by default, because a new DAG with an old start date used to flood the system. In my recording a start date four days back made five runs with catchup on and one without.\n\nA backfill is deliberate. You ask for a date range, with a dry run first, and choose what to do about existing runs: none, failed or completed. The runs are created through the API and run by the scheduler, and only one backfill per DAG can run at a time.\n\nIn both cases `max_active_runs` caps how many runs go at once, and the tasks must be safe to repeat.',
        fu: [['Which would you use to reload last month after a bug fix?', 'A backfill with `completed`, a dry run, and a low max-active-runs.']],
        trap: 'Leaving catchup on by habit for a DAG with an old start date.',
        real: 'Describe the last time you reloaded old days and how you limited the load.'
      }),

      B.qa({
        id: 'qa-cron', t: 2, tag: 'Airflow', secs: 75,
        q: 'What traps do you watch for in cron schedules?',
        pts: ['Day of month and day of week: either one matches', 'Trigger or data interval timetable', 'Time zones and daylight saving', 'Manual runs may have no logical date'],
        short: 'Four traps. First, when both the day of the month and the day of the week are set, a day matches if either one does, so `0 0 13 * 5` runs on every Friday and on every 13th. For "first Monday" I run on days 1 to 7 and check the weekday in the task.\n\nSecond, a plain cron string in Airflow 3 is a trigger timetable, so there is no data interval. If I need a window, I choose a data interval timetable or add an interval, and I look at what a manual run infers.\n\nThird, time zones. A schedule in a local zone follows the wall clock. In my recording, in New York a 02:00 job fired at 03:00 on the day the clocks went forward, and the gap to the next run was 23 hours. I run jobs in UTC unless the business needs local time.\n\nFourth, a manual run without a logical date has no `ds`.',
        fu: [['How do you test a cron expression?', 'Ask Airflow or a library for the next fire times, as the lab does, and read the first five.']],
        trap: 'Assuming that cron fields are ANDed. For days they are ORed.',
        real: 'Name a schedule in your team that depends on a time zone, and what happens at the clock change.'
      }),

      B.qa({
        id: 'qa-bf', t: 2, tag: 'Operations', secs: 90,
        q: 'You have to reload 90 days of one DAG after a bug fix. How do you do it safely?',
        pts: ['Idempotent tasks first', 'Dry run', 'Reprocess behaviour and max-active-runs', 'One backfill at a time, watch and verify'],
        short: 'First I check that the tasks can run again for a past date and give the same result: they read the data interval and write with a delete and insert or an upsert. If not, a backfill would duplicate data.\n\nThen I run the backfill command with `--dry-run` and read the list of runs. I choose the reprocess behaviour: `completed` if the finished runs must be redone, `failed` if only the failed ones, `none` if I only want the missing days. I set `--max-active-runs` from what the target systems can take, and I may use reverse order if the newest data matters most.\n\nI create the backfill, watch the first runs, and check row counts against the source. Only one backfill per DAG can run at a time, so I wait for it to complete before starting the next range.',
        fu: [['What if the DAG has depends_on_past?', 'The 3.4.0 source refuses a backfill with behaviour none for such a DAG, and refuses reverse order. You choose failed or completed, and run it forward.']],
        trap: 'Clearing 90 runs in the UI. That starts them all at once, with no limit and no record of the range.',
        real: 'Describe a reload you did and how you checked the result.'
      }),

      B.qa({
        id: 'qa-tz', t: 2, tag: 'Airflow', secs: 60,
        q: 'How do you handle time zones and daylight saving in Airflow?',
        pts: ['The default is UTC', 'A local time zone follows the wall clock', 'Spring: a missing hour moves the run. Autumn: a repeated hour', 'Choose UTC for jobs that must not move'],
        short: 'Airflow stores times in UTC, and the default time zone setting is UTC. When I need a schedule in a local zone, I set the time zone on the timetable or on the DAG, and then the cron string follows the wall clock.\n\nThat has consequences at the two changes. In my recording a New York job set for 02:00 fired at 03:00 on the day the clocks went forward, so the gap to the next run was 23 hours. A job set for 01:30 in the autumn fired once, and the gap was 25 hours. I keep jobs that feed other systems in UTC, and use a local zone only for a schedule that a person reads on a clock, such as a morning report.',
        fu: [['How do you test it?', 'Ask the timetable for the next runs around the change, as the lab does.']],
        trap: 'Using a local zone for everything and finding out in March.',
        real: 'Say which time zone your schedules use and why.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Interval Reader', color: '#FDE68A',
        pts: [
          'The **logical date** names a run. A **data interval** is a start and an end. **Run after** is the earliest start. `ds` is the logical date as text.',
          'A cron string in Airflow 3 is a **trigger** timetable: the interval is a point. Use **CronDataIntervalTimetable** or an `interval` for a window.',
          'Cron: if both **day of month and day of week** are set, either one matches. In a local time zone the wall clock rules, and the clock changes move runs.',
          '**Catchup** makes the missed runs automatically and is off by default. A **backfill** is a deliberate range with a dry run. `max_active_runs` limits parallel runs.',
          'A manual run can have **no logical date**. Read the interval, never the clock.'
        ],
        lines: [
          'I can tell which date a task should use.',
          'I can predict the next runs of a schedule.',
          'I can run a backfill safely.'
        ]
      })
    ]
  });
})();
