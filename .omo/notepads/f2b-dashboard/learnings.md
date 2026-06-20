# f2b-dashboard Learnings

## Task 2: Project Scaffolding (2026-06-19)

### What was done
- Created complete directory structure: `bin/`, `web/`, `web/css/`, `web/js/`, `web/i18n/`, `web/data/`
- Created `config.js` with all required configuration fields
- Created empty placeholder JSON files: `dashboard.json`, `geo-cache.json`
- Created `.gitignore` excluding data files, temp files, and evidence directory

### Config fields (all present):
- `logPath: '/var/log/fail2ban.log'`
- `refreshInterval: 300000` (5 minutes in ms)
- `dataPath: 'data/'`
- `maxRotatedFiles: 10`
- `geoApiUrl: 'http://ip-api.com/json/'`
- `geoApiDelay: 1.4` (seconds)

### Notes
- Greenfield project, no existing patterns to follow
- All JSON files validated with `jq empty` - parse correctly as `{}`
- No npm, no build step, zero dependencies per plan requirements

## Task 4: i18n System (2026-06-19)

### What was done
- Created `web/i18n/en.json` - 91 English translation strings
- Created `web/i18n/zh.json` - 91 Traditional Chinese (繁體中文) translation strings
- Created `web/js/i18n.js` - lightweight i18n module with:
  - `initI18n()` - initializes i18n, loads saved language from localStorage
  - `setLanguage(lang)` - switches language and updates DOM
  - `t(key)` - translates nested keys (e.g., `t('stats.totalAttacks')`)
  - `toggleLanguage()` - cycles EN → 中 → EN
  - `getCurrentLang()` - returns current language code

### Translation Categories (all 19 top-level keys)
- dashboard, sections, stats, timeRange, eventTypes, theme, language
- refresh, errors, time, table, jailConfig, footer, buttons
- map, heatmap, logList, perJail, charts

### Key i18n.js Features
- Loads translation JSON via fetch() with cache-busting
- localStorage key: `f2b-lang`
- Default language: English (no browser auto-detect per spec)
- Falls back to English if key missing or translation fails
- Updates all `data-i18n` attributes on language change
- Dispatches `i18n:languageChanged` custom event for components

### Verification
- `jq . web/i18n/en.json` ✓ VALID
- `jq . web/i18n/zh.json` ✓ VALID
- Both files have exactly 91 translation strings ✓
- All nested keys match perfectly ✓
- `node --check web/js/i18n.js` ✓ Syntax OK

### Notes
- Traditional Chinese only (繁體), no Simplified Chinese (简体)
- No heavy i18n library - pure vanilla JS implementation
- No browser language auto-detect - manual toggle only
# Task 3 — HTML Structure + CSS Theme System: Design Decisions

## Aesthetic Direction
- **Tone**: Industrial/utilitarian meets luxury/refined — dark security dashboard
- **Default theme**: Dark (cool blue-gray tones, not pure black)
- **Accent**: Cyan/sky blue (#38bdf8) — security/monitoring feel
- **Typography**: System font stack only (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif)

## CSS Architecture
- **theme.css**: All CSS custom properties (dark default, light via `[data-theme="light"]`)
- **style.css**: Mobile-first responsive layout, BEM-like naming
- Theme toggle: `data-theme` attribute on `<html>`, persisted via localStorage (JS in app.js)
- Smooth 0.3s ease transition for theme changes, excluded for ECharts containers

## Responsive Breakpoints
- Mobile (<768px): Single column, stacked stats cards, compact chart heights
- Tablet (768px+): 2-column grid, 2x2 stats cards
- Desktop (1024px+): 3-column grid, 4-column stats, full-width timeline/map/logs
- Large (1280px+): 4-column grid, taller chart containers

## Grid Layout Strategy
- Stats cards: separate grid (1→2→4 columns)
- Dashboard sections: main grid with full-width spans for timeline, map, and logs
- Cards use consistent border-radius (14px), subtle shadows, hover states

## Chart Colors
- SSHd: Red (#f87171 dark / #dc2626 light)
- Asterisk: Amber (#fbbf24 dark / #d97706 light)
- Total: Cyan (#38bdf8 dark / #0284c7 light)

## i18n Strategy
- All visible text uses `data-i18n` attributes with dot-notation keys
- Placeholder text in English as default
- Language toggle button: 🌐 icon, cycles EN→中→EN

## Known Decisions
- Theme toggle JS NOT included in HTML (goes in app.js per task requirement)
- No OS theme preference detection (manual toggle only per task requirement)
- No animated data transitions (0.3s theme transition only per task requirement)

## Task 8: Timeline Area Chart (2026-06-19)

### What was done
- Added `renderTimelineChart(containerId, data, timeRange)` to `web/js/charts.js`
- Added helper functions: `hexToRgba()`, `areaGradient()`, `isDarkTheme()`, `filterTimelineByTimeRange()`
- Added `charts.total` i18n key to both `en.json` ("Total") and `zh.json` ("總計")
- Updated theme/i18n change handlers to also re-render timeline chart

### Key implementation details
- **Chart type**: Smooth area chart (ECharts `type: 'line'` + `areaStyle` with `LinearGradient`)
- **3 series**: sshd (red `--chart-sshd`), asterisk (amber `--chart-asterisk`), total (cyan `--chart-total`)
- **X-axis**: `type: 'time'` with locale-aware date formatting
- **Y-axis**: Attack count with k-formatting for values ≥ 1000
- **dataZoom**: Slider (bottom) + inside (mouse wheel) for interactive zoom
- **Time range filtering**: `filterTimelineByTimeRange()` supports '24h', '7d', 'all'
- **Time gaps**: `connectNulls: false` — null values create line breaks, not interpolation
- **Theme awareness**: Reads CSS custom properties at render time; MutationObserver on `data-theme` triggers re-render
- **i18n**: Listens for `i18n:languageChanged` event; all labels/tooltips use `t()` function
- **Responsive**: Debounced window resize handler calls `chart.resize()` on all instances
- **No animations**: `animation: false` — instant updates, no transitions on data changes
- **Tooltip**: Theme-aware (dark/light background), shows date + per-series count with colored dots

### Pattern: Theme-aware chart colors
- `getChartColors()` reads CSS custom properties at render time, so theme changes are automatically reflected on next render
- `isDarkTheme()` checks `data-theme` attribute for conditional styling (tooltip bg, dataZoom bg)
- `hexToRgba()` converts hex colors from CSS vars to rgba for ECharts gradient fills

### Pattern: Chart re-render on theme/i18n change
- `_timelineRenderParams` stores last render args for re-render without caller involvement
- `refreshChartsOnThemeChange()` re-renders both trend and timeline charts
- MutationObserver watches `data-theme` on `<html>` for theme toggle
- `i18n:languageChanged` custom event triggers re-render for label updates

## Task 9: Trend Chart (2026-06-19)

### What was done
- Created `web/js/charts.js` with `renderTrendChart(containerId, data, timeRange)` function
- Stacked bar chart: sshd (bottom, red) + asterisk (top, amber) = total
- 7-day simple moving average line overlay (cyan)
- Time range filtering: '24h', '7d', 'all'
- Responsive resize via debounced window resize handler
- Theme-aware: reads CSS custom properties at render time
- i18n: all labels, tooltips, legend use `t()` function
- Tooltip shows date, per-jail breakdown, total, and moving average
- Integrated into `app.js`: renders on data fetch, theme change, and language change

### Key Architecture Decisions
- IIFE pattern matching app.js style
- Chart instance registry (`chartInstances`) for reuse and resize
- `getChartInstance(id)` creates or returns existing instance
- `refreshChartsOnThemeChange(data)` exposed for app.js theme toggle
- `animation: false` per spec (no animation on data update)
- Moving average returns null for first 6 data points (insufficient window)
- X-axis labels auto-rotate 45° and show MM-DD format when >14 dates
- Y-axis auto-formats large numbers (e.g., 5.5k, 10k)

### i18n Keys Used
- `charts.sshd` → "SSH" / "SSH"
- `charts.asterisk` → "Asterisk" / "Asterisk"
- `charts.movingAverage` → "7-day Average" / "7日平均"
- `charts.date` → "Date" / "日期"
- `charts.count` → "Count" / "次數"
- `table.total` → "Total" / "總計"
- `errors.noData` → "No data available" / "暫無資料"

### Verification
- `node --check web/js/charts.js` ✓ Syntax OK
- `node --check web/js/app.js` ✓ Syntax OK (after integration edits)

## Task 6: Stats Cards Component (2026-06-19)

### What was done
- Created `web/js/app.js` with full app initialization and stats cards rendering
- `renderStatsCards(data)` reads `data.summary` and updates 4 card values
- Trend indicators (▲/▼) compare current vs previous data from localStorage
- Theme toggle (dark/light) persisted in localStorage, icon switches ☾/☀
- Language toggle wired to i18n's `toggleLanguage()`
- Auto-refresh via `#refresh-interval` select (1m/5m/10m/off)
- Footer timestamp updates with relative time ("just now", "5 minutes ago")

### Key Implementation Details
- IIFE pattern, no global pollution except explicit `window.*` exports
- `STATS_CARDS` array maps HTML IDs to summary keys and i18n keys
- Trend logic: reads `f2b-stats-prev` from localStorage, compares with current, shows ▲ (danger/red) or ▼ (success/green)
- Null/missing data: shows "--" for values, empty string for trends
- `toLocaleString()` for number formatting (50693 → "50,693")
- `fetchAndRender()` uses `CONFIG.dataPath + 'dashboard.json'` with cache-busting
- `i18n:languageChanged` event listener re-renders stats and timestamp on language switch

### localStorage Keys
- `f2b-theme` — "dark" or "light"
- `f2b-lang` — "en" or "zh" (managed by i18n.js)
- `f2b-stats-prev` — JSON snapshot of last seen summary values

### Verification
- `node --check web/js/app.js` ✓ Syntax OK
- Playwright browser test: all 4 cards render correct values (50,693 / 45 / 1,508 / 2)
- Trend indicators: ▲ 10,693 (red), ▼ 5 (green), ▲ 108 (red), empty (no change)
- Theme toggle: dark ↔ light works, persisted in localStorage
- Language toggle: EN ↔ 繁體中文 works, labels update, data persists
- Null handling: null data → early return, null values → "--"
- dashboard.json restored to `{}` after testing

## Task: GeoIP Lookup Script (2026-06-19)

### What was done
- Created `bin/f2b-geoip.sh` — complete Bash geo-lookup script using IP-API free tier
- Reads unique IPs from `dashboard.json` topIPs array
- Maintains local cache in `geo-cache.json` (object keyed by IP)
- Updates `dashboard.json` topIPs entries with geo data from cache

### Key Features
- **Private IP detection**: skips 10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x, ::1, fd00::/8 — labels as "Internal/Private"
- **IPv6 detection**: skips all IPv6 addresses — labels as "IPv6 — Geo unavailable"
- **Rate limiting**: 1.4-second delay between API calls (45 req/min compliance)
- **Error handling**: HTTP non-200, invalid JSON, timeout — all mark IP as "Unknown" and continue
- **Atomic writes**: temp file + mv for both cache and dashboard updates
- **Progress output**: `Looking up IP: X/Y (IP)` with per-IP status
- **Arguments**: `f2b-geoip.sh [dashboard_json_path] [geo_cache_path]` with sensible defaults
- **LANG=C**: consistent string processing

### Cache Schema
```json
{
  "1.2.3.4": {
    "ip": "1.2.3.4",
    "country": "United States",
    "city": "Ashburn",
    "lat": 39.03,
    "lon": -77.5,
    "timestamp": "2026-06-19T10:09:55Z"
  }
}
```

### Verification
- `shellcheck bin/f2b-geoip.sh` ✓ PASSES (v0.10.0, zero warnings)
- `bash -n bin/f2b-geoip.sh` ✓ Syntax OK
- Tested with mixed IPs (public IPv4, private IPv4, IPv6) ✓ All handled correctly
- Tested caching: second run makes 0 API calls ✓ Works
- Tested against `sample-dashboard.json` (20 IPs) ✓ All enriched successfully

### Dependencies
- `curl` (with --max-time 10 for timeout handling)
- `jq` (for JSON parsing and atomic updates)
- `sleep` (for rate limit compliance)

### Notes
- IP-API free tier: HTTP only, no IPv6 geo support, 45 req/min limit
- No batch API used (requires paid license)
- No bundled GeoIP database (pure API + cache approach)
- Script does not crash on any error — always continues to next IP

## Task 18: Error Handling + Edge Cases (2026-06-20)

### What was done
- Created `web/js/utils.js` with shared utilities moved from `charts.js`:
  - `escapeHtml()`, `getCountryFlag()`, `formatNumber()`, `debounce()`, `isDarkTheme()`, `hexToRgba()`
  - New error handling utilities: `showErrorBanner()`, `hideErrorBanner()`, `isValidDashboardData()`
- Updated `web/js/charts.js` to remove duplicate local definitions; relies on `window.*` globals from utils.js
- Updated `web/js/app.js` with robust error handling:
  - Graceful fallbacks for all utils.js functions (defensive if utils.js fails to load)
  - Specific fetch error messages: network error, 404, 5xx
  - JSON parse error catching with banner
  - `isValidDashboardData()` validation before rendering
  - Empty data sections show "no data available" instead of crashing
  - Keeps last good `currentData` on error
- Updated `bin/f2b-parse.sh`:
  - Dependency checks for `jq` and `awk` at startup
  - `LC_ALL=C` added alongside `LANG=C`
  - Empty/missing log files now output valid JSON with zero counts instead of exiting with error
  - Corrupted/malformed lines are validated with timestamp regex and skipped silently, counted in `meta.skippedLines`
  - `meta` section now includes: `lastUpdated`, `logFiles`, `totalLines`, `skippedLines`, `parseErrors`
  - Atomic writes preserved (tmp + mv)
- Updated `bin/f2b-geoip.sh`:
  - Dependency check for `curl` with suggestion message
  - HTTP 429 rate limit detection: marks IP as "Rate Limited" with warning
  - Corrupted `geo-cache.json` is deleted and rebuilt from scratch
  - `--dry-run` option shows planned actions without making API calls or writing files

### Verification Results
- `shellcheck bin/f2b-parse.sh bin/f2b-geoip.sh` ✓ PASSES (exit 0, zero warnings)
- `bash -n bin/f2b-parse.sh bin/f2b-geoip.sh` ✓ Syntax OK
- `node --check web/js/{app,charts,utils}.js` ✓ Syntax OK
- Empty log test: outputs valid JSON with all-zero counts and empty arrays ✓
- Corrupted log test: 6 lines total, 2 skipped, 4 parsed correctly ✓
- GeoIP dry-run test: shows planned API calls without network activity ✓
- Corrupted cache test: detects invalid JSON, deletes file, continues ✓

### Evidence Files
- `.omo/evidence/task-18-shellcheck.txt`
- `.omo/evidence/task-18-bash-syntax.txt`
- `.omo/evidence/task-18-js-syntax.txt`
- `.omo/evidence/task-18-empty-log.json`
- `.omo/evidence/task-18-empty-log-run.txt`
- `.omo/evidence/task-18-corrupted-lines.txt`
- `.omo/evidence/task-18-geoip-dry-run.txt`
- `.omo/evidence/task-18-bad-cache.txt`

## Task 5: f2b-parse.sh Log Parser (2026-06-19)

### What was done
- Created `bin/f2b-parse.sh` — complete Bash log parser using awk for heavy lifting
- Outputs `web/data/dashboard.json` with all 9 schema sections
- Handles all event types: Found, Ban, Unban, Restore Ban, Ignore, AlreadyBanned, Flush, DNS Lookup

### Key Implementation Details
- **Performance**: Pre-computes day-of-week for unique dates in bash before awk runs (avoids 50K+ `date` calls)
- **Hour extraction**: Uses `substr($2, 1, 2)` directly in awk instead of external commands
- **JSON output**: Generated directly from awk with insertion sort for arrays (~1500 IPs sorted in <1s)
- **Locking**: `flock -n /tmp/f2b-parse.lock` prevents concurrent runs
- **Atomic writes**: Writes to `.tmp.$$` then `mv` to final path
- **Cleanup**: `trap` removes temp files on exit or error
- **Shellcheck**: Passes cleanly (one SC2207 disable for safe newline-split array assignment)

### Verification Results
- `shellcheck bin/f2b-parse.sh` ✓ PASSES (exit 0)
- `jq empty web/data/dashboard.json` ✓ VALID JSON
- Parsed counts match actual log data:
  - totalAttacks: 50,693
  - totalBans: 2,009
  - totalUnbans: 2,112
  - restoredBans: 133
  - repeatAttacks: 304
  - ignored: 941
  - uniqueIPs: 1,537
- Timeline: 427 hourly entries
- topIPs: 20 entries (sorted by count desc)
- recentLogs: exactly 100 entries (most recent first)
- heatmap: 7×24 grid + hourly/weekly aggregates
- perJail: complete with banTime, findtime, maxRetry, attackTrend, hourlyDistribution, topIPs

### Gotchas
- `json_str()` awk function required careful backslash+quote escaping: `gsub(/"/, "\\\"", s)`
- `mapfile` broke filename handling because `sort` output joins filenames with spaces; reverted to `IFS=$'\n'` array assignment
- Sample `dashboard.json` had synthetic per-jail distributions (e.g., restoredBans split sshd:89/asterisk:44 vs actual logs sshd:46/asterisk:87); totals matched perfectly
- No private IPs or IPv6 in top 20, but handling logic is correct and verified

## Task 17: Install Script + Cron Setup (2026-06-20)

### What was done
- Created `install.sh` - comprehensive installer with dependency checks, cron setup, directory creation
- Created `uninstall.sh` - removes cron job, offers to clean data files

### install.sh Features
- Bash 4+ version check
- Dependency checks: `curl`, `awk`, `jq` with distro-specific install hints
- Creates `web/data/` directory if needed
- Makes `bin/f2b-parse.sh` and `bin/f2b-geoip.sh` executable
- Installs cron job with `flock` locking to prevent concurrent runs
- Supports `--cron-interval=N` argument (default: 5 minutes)
- Extracts log path from `config.js` for use in cron
- Warns if crontab not available
- Prints next steps with manual run commands

### uninstall.sh Features
- Removes cron job by filtering out lines containing script paths
- Removes stale `/tmp/f2b-parse.lock` if present
- Interactively asks about removing data files (dashboard.json, geo-cache.json)
- Preserves bin/, web/, config.js (does NOT remove source files)

### Shellcheck Compliance
- Both scripts use `set -euo pipefail` and `LANG=C`
- SC2155 (declare/assign separately) suppressed via `# shellcheck disable=SC2155` because the pattern is safe for `basename "$0"` and `dirname "$0"` which never fail
- Both scripts pass `shellcheck` with zero warnings

### Cross-distro Compatibility
- Uses `command -v` instead of `which` for tool detection
- Suggests install commands for: apt, yum, apk, pacman
- No direct package manager invocations
- Works with both user crontab and system cron

### Verification Results
- `shellcheck install.sh uninstall.sh` ✓ PASSES (zero warnings)
- `bash -n install.sh && bash -n uninstall.sh` ✓ Syntax OK
- `./install.sh --cron-interval=10` ✓ Works, installs cron with 10-min interval
- `./uninstall.sh` ✓ Works, removes cron job correctly
- Evidence saved to `.omo/evidence/task-17-*.txt`

### Cron Command Structure
```
flock -n /tmp/f2b-parse.lock /path/to/bin/f2b-parse.sh LOG_PATH DATA_DIR && /path/to/bin/f2b-geoip.sh DATA_DIR/dashboard.json DATA_DIR/geo-cache.json
```

### Notes
- The `flock` in cron is redundant with the flock built into f2b-parse.sh itself, but provides protection at the cron-level entry point
- Lock file path `/tmp/f2b-parse.lock` is hardcoded (same as parser script)
- Parser script already handles LOG_PATH and DATA_DIR args, so cron just passes them through

## Task 16: Auto-Refresh System + Time Range Selector (2026-06-20)

### What was done
- Added time range selector UI (`<select id="time-range">`) in header next to refresh interval
- Added error banner (`<div id="error-banner">`) between header and main content
- Added time range state management: `currentTimeRange` variable, localStorage key `f2b-time-range`, default 'all'
- Added `onTimeRangeChanged()` handler that updates state, persists to localStorage, re-renders timeline/trend/heatmap
- Added `showErrorBanner()` / `hideErrorBanner()` functions using i18n key `errors.dataUnavailable`
- Added `renderTimelineChart()` call in `fetchAndRender()` (was missing!)
- Added `renderHeatmap()` call in `fetchAndRender()` (was missing!)
- Changed `renderTrendChart()` to use `currentTimeRange` instead of hardcoded 'all'
- Added timeline and heatmap re-renders in `onLanguageChanged()`
- Updated i18n keys: `timeRange.24h`, `timeRange.7d`, `timeRange.all`, `timeRange.label`
- Added CSS for `.time-range-selector` (mirrors `.refresh-selector` pattern) and `.error-banner`

### Key Implementation Details
- Time range options: '24h' (Last 24h), '7d' (Last 7 days), 'all' (All time)
- localStorage key `f2b-time-range` persists selection across sessions
- Error banner shows on fetch failure, hides on success; uses `data-i18n` for i18n
- `renderHeatmap('chart-heatmap', data)` passes full dashboard data (function accesses `data.heatmap.grid`)
- `refreshChartsOnThemeChange()` in charts.js uses `_timelineRenderParams.timeRange` for timeline (correct), but hardcoded 'all' for trend chart — app.js re-renders trend with correct timeRange after theme change via the existing MutationObserver flow
- CSS follows existing BEM-like naming: `.time-range-selector__label`, `.time-range-selector__select`

### localStorage Keys (updated)
- `f2b-theme` — "dark" or "light"
- `f2b-lang` — "en" or "zh"
- `f2b-stats-prev` — JSON snapshot of last seen summary values
- `f2b-time-range` — "24h", "7d", or "all" (NEW)

