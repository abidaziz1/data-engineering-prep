# Website analytics: owner runbook

Implemented for the existing Data Engineering Prep library on **28 November 2026 (Asia/Dhaka)**. The reference is the live GitHub Pages site and its `claude/snowflake-tutorial` publishing branch. No analytics provider was added and no account was made public.

## Open the reports

- Private reports: **https://abidaziz.goatcounter.com/**. Sign in as the existing owner. This is the one account step the code cannot perform.
- Guide and campaign builder: **https://abidaziz1.github.io/data-engineering-prep/analytics/**.
- Visitor information and browser opt-out: **https://abidaziz1.github.io/data-engineering-prep/shared/analytics.html**. Every course Map also links here.

The site code `abidaziz` is already configured in `shared/js/analytics.js`. It is a public destination name, not a secret. The dashboard returned its private sign-in screen during inspection; its statistics and collection settings could not be inspected without owner authentication. A sign-in screen proves neither historical traffic nor successful receipt of new events.

## Why this provider

GoatCounter is already integrated across the library, works with static GitHub Pages, and offers the useful traffic breakdowns without another provider account or identifier. The shared teaching engine can report aggregate learning activity through its supported event API.

Native reports include pages, referring sources, campaign codes, browser, operating system, location, browser language and screen width, subject to the owner's enabled collection settings. These are not identified people, exact device models, full URLs someone browsed, or joined user-level journeys.

The integration intentionally does not add Google Analytics, a second SDK, advertising IDs, cookies, session replay or heatmaps. It also does not create a home-made public statistics API.

## Event dictionary

Page views use the canonical page path with `index.html` removed, such as `/data-engineering-prep/azure/`. Each document load produces a page-view request. GoatCounter can deduplicate visits according to its own session rules, so distinguish total page hits from provider visit estimates.

Custom events have a bounded path without a leading slash. Examples:

| Event | Definition | Interpretation |
| --- | --- | --- |
| `hub/course-opened` | Library document opened in this tab session. | Library reach signal. |
| `hub/open-azure` | The Azure library card was clicked. | Click intent; not proof that navigation finished. |
| `hub/scroll-25`, `50`, `75`, `90` | Library scroll position reached or passed that percentage. | Position, not which cards were read. |
| `azure/course-opened` | Course document opened in this tab session. | New detailed course-open metric. |
| `azure/course-started` | A numbered mission was reached. | May be a map jump, deep link or restored progress. |
| `azure/path-junior` | A chosen or restored Junior path was observed. | A visit may use more than one path. |
| `azure/mission-03` | A frame of mission 3 was displayed. | Reach, not full mission consumption. Mission 00 is orientation. |
| `azure/progress-25`, `50`, `75`, `100` | Navigation position reached or passed this fraction of the selected path. | Jumping to 100% emits the lower navigation milestones too; no preceding reading is inferred. |
| `azure/mission-03/progress-50` | Position in the selected path's mission 3 reached or passed 50%. | Mission navigation-depth signal. |
| `azure/mission-end-03` | Next advanced from the last included frame of mission 3. | Can follow a jump to that frame; not verified completion. |
| `azure/active-15s`, `60s`, `300s`, `900s`, `1800s` | Estimated course-wide active time in this tab session reached 15 seconds, 1, 5, 15 or 30 minutes. | Coarse engagement threshold, not exact time on site. |
| `azure/interaction-lab` | A lab control was used. | Does not say what was selected or whether a result was correct. |
| `azure/finish-clicked` | The final Finish button was clicked. | Navigation endpoint only. |
| `azure/finished` | Legacy Finish event retained for continuity. | Same button-click limitation; do not label full-course completion. |

Other interaction categories are `quiz`, `bug`, `order`, `decision`, `challenge-hint`, `challenge-solution`, `interview-answer`, `interview-timer`, `interview-followup`, `interview-review`, `code-copy` and `sql-run`. A code-copy event means the control was used, not that clipboard access succeeded. SQL Run is an example-result reveal in this static teaching engine, not an actual database query. Interview answer means the answer-reveal navigation was used, not that speech was recorded or evaluated.

Path-scoped versions of mission, navigation, interaction and Finish events appear under prefixes such as `azure/track-junior/`. Active-time thresholds remain course-wide, because the cumulative time can span path switches.

## Sessions, time and deduplication

The client stores event flags and numeric engagement totals in `sessionStorage` under `dep.analytics.v2`. It uses a rolling 30-minute inactivity boundary within a browser tab. Reloading or moving between courses in the same tab preserves those flags. New tabs are not a cross-device or cross-tab identity system. Browser duplication can copy an initial tab-storage snapshot. No random session or user identifier is generated by this site's code.

These tab flags are not the same as GoatCounter sessions. GoatCounter applies its own per-site visit grouping and per-event/path deduplication. Repeated client events after 30 minutes may still be grouped by the provider. Reports therefore describe observed aggregate reach and usage, not a count of known people or exact locally defined sessions.

A five-second heartbeat adds estimated active time only when the course is visible and focused and activity was observed within the previous 60 seconds. Initial page entry provides that recent-activity starting point. Pointer, key, touch and scroll activity refresh the boundary. An individual interval is capped at 10 seconds to avoid counting long suspended timers. Hidden tabs, lost focus, idle periods and unload timing can reduce the estimate. Data is sent only when a coarse threshold is crossed, not on every heartbeat.

Events are once-per-tab-session flags rather than repeated click totals. This reduces noise and traffic. Do not sum base and path-scoped events: they are intentionally overlapping views of the same behavior.

## A weekly review

1. Compare the latest seven days with the preceding seven using the dashboard's date picker. Keep page views and events separate. Introducing more event types changes a combined hits total even if traffic is unchanged.
2. Check landing pages, referring domains and campaign labels. Review geography and browser/OS/screen-width summaries where enabled. These help prioritize distribution and real-device testing.
3. Filter to one course. Compare course opens, numbered-mission reach, active thresholds and use of labs, hints and interview tools.
4. Compare mission reach inside one selected path, using the matching `track-...` prefix. Junior and wider paths differ in length and content.
5. Treat any ratio as an aggregate reach indicator. A numerator and denominator are not a joined cohort of the same visitors. Changes can also come from resumed visits, map jumps, opt-outs, blockers and provider grouping.
6. Repeated low mission reach or low engagement suggests a page to inspect. It does not alone prove that the lesson is confusing or that a visitor abandoned learning.

Ordered conversion funnels, retained-person cohorts, attribution across arbitrary visits, exact dwell time and learning mastery are outside this setup's evidence. Detailed historic behavior cannot be reconstructed from events that were never collected.

## Campaign links

Use the [browser-local link builder](../analytics/index.html) or construct a direct course URL:

```text
https://abidaziz1.github.io/data-engineering-prep/azure/?utm_source=linkedin&utm_campaign=azure-learning
```

GoatCounter's native campaign grouping uses `utm_campaign` or `campaign`, and can use `utm_source`, `ref`, `src` or `source` as the source. The integration permits these keys plus `utm_medium`. Medium is retained as a safe standard tag but is not promised as a separate native GoatCounter report dimension. `utm_content` and `utm_term` are deliberately not forwarded.

Every forwarded tag must be a 1–64 character public code, starting with a letter or digit and then using letters, digits, dots, underscores or hyphens. Never put email addresses, names, form entries or other personal information in tags. Do not put an API token or secret into a URL.

Campaign tags on a library landing are not automatically carried into a later untagged course URL. Link directly to a course when its landing needs campaign attribution. This setup does not promise source-to-completion attribution.

## Privacy boundary

- Do Not Track, Global Privacy Control and a saved `dep.notrack=1` opt-out disable tracking. `?notrack=1` saves the opt-out, and `?notrack=0` removes it; browser privacy signals still take precedence. Existing course tabs react to a cross-tab saved opt-out. Removing the preference requires reloading those tabs to resume eligible measurement.
- Localhost, loopback and `file://` browsing are excluded. The test-only `LAB_ANALYTICS.force` host override never overrides browser privacy signals or opt-out.
- No answers, selected options, grades, checklist ticks, question IDs, code, form contents or saved learning-state objects are transmitted. Hooks send only a fixed activity category.
- The provider's current `get_data()` serializer independently includes URL query text. Before queued hits are flushed, the integration wraps that serializer to replace `.q` with the strict campaign allowlist and `.r` with the referrer's origin. Cleaning the page path alone would not protect query text. URL fragments are not used as page paths.
- Screen/bot metadata and the provider's normal transport remain intact. Its own privacy policy explains server-side network metadata and visit estimation. We do not claim that no network metadata is ever processed.
- If the expected provider serializer is absent, the script fails closed and sends nothing. Load errors, blocked storage, a bounded queue or provider exceptions do not stop lessons. Queued unsent event flags are removed on a load failure so a later reload can retry them.
- The dashboard remains private. No API credentials are stored in this repository or the public pages. The owner guide and privacy page do not load the analytics SDK.

The site still stores learning progress locally for its original functionality. Measurement session flags are a separate, disclosed use of browser storage.

## Verification

The site has no runtime dependencies or build step. Tests need the repository's existing Playwright development dependency and a compatible Chromium. Either install as the root README describes, or point the optional environment variable at a local browser:

```bash
npm install
PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium node dev/analytics-test.js
PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium node dev/analytics-detail-test.js

# Read-only download of the current official provider client, for a transport check:
curl -fL https://gc.zgo.at/count.js -o /tmp/goatcounter-count.js
GOATCOUNTER_SCRIPT_PATH=/tmp/goatcounter-count.js \
  PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium \
  node dev/analytics-detail-test.js
```

Tests intercept provider requests and do not add fake traffic to the owner's account. Integration covers every course/project. Detailed tests cover tab-session boundaries, reloads, path grouping, active-time visibility/focus/idleness, opt-out and GPC, bad storage, blocked/throwing providers, queue limits, unknown events and private URL fields. The optional current-vendor check uses the real locally downloaded script while intercepting its outgoing requests, so it tests the actual serializer boundary without submitting a hit.

The owner guide and privacy controls were additionally checked at 1440px and 390px widths, including campaign generation, invalid-input behavior, no page overflow and browser preference changes. UI checks use intercepted analytics routes.

These checks establish code and outgoing-request behavior. They do **not** establish dashboard receipt, enabled collection dimensions, real historical volumes, or the accuracy of the provider's visitor estimates. Those require the owner's authenticated dashboard and real incoming traffic.

## Files and rollback

- `shared/js/analytics.js`: provider load, privacy filtering, session flags, active time, hub events and public hook API.
- `shared/js/app.js`: frame metadata and safe measurement hooks for all 27 courses, plus the Map privacy link. Analytics errors are caught independently of lesson rendering.
- `shared/analytics.html`: visitor information and preference controls.
- `analytics/index.html`: private-dashboard link, metric guide and local campaign builder.
- `dev/analytics-test.js`, `dev/analytics-detail-test.js`: intercepted integration and detailed checks.

To disable collection globally, set the site code to an empty string and publish. Retain the privacy page so visitors can manage a saved preference. To undo the feature, revert the analytics implementation commit; the old legacy event names were preserved to keep existing reports understandable. Do not change the Pages publishing source or restore a competing push workflow just for this feature: this repository currently publishes its configured branch automatically.

## Official references

- [JavaScript API](https://www.goatcounter.com/help/js)
- [Events](https://www.goatcounter.com/help/events)
- [Campaigns](https://www.goatcounter.com/help/campaigns)
- [Sessions](https://www.goatcounter.com/help/sessions)
- [Privacy and collection settings](https://www.goatcounter.com/help/privacy)
- [API and private tokens](https://www.goatcounter.com/help/api)
- [Export](https://www.goatcounter.com/help/export)
- [Current client](https://gc.zgo.at/count.js)

Read-only sources checked on 28 November 2026. The provider account's private settings and traffic were not accessed.
