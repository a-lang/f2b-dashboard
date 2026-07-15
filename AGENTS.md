# f2b-dashboard — Agent Guide

## Project Nature

Pure static dashboard — zero backend, zero npm, zero build step. Edit files and reload browser. No test framework.

The repository ships a landing page (`website/index.html`) for project introduction and installation guidance, separate from the `dashboard/`.

## Architecture

- `bin/f2b-parse.sh` reads `fail2ban.log` (inc. rotated `.1`, `.2`, ...), outputs `dashboard/data/dashboard.json`
- `bin/f2b-geoip.sh` enriches `dashboard.json` with GeoIP via IP-API (cached in `geo-cache.json`, 45 req/min limit)
- Script self-locks via `flock`; cron runs both with `&&` to prevent overlap
- Browser polls `dashboard.json` at `CONFIG.refreshInterval` (default 5 min)
- Deployed by `git clone` to `/opt/f2b-dashboard`
- `website/index.html` serves as the landing page; `dashboard/index.html` is the actual dashboard

## Frontend

### Dashboard (`dashboard/`)

| File                       | Role                                                     |
| -------------------------- | -------------------------------------------------------- |
| `dashboard/index.html`     | Single page, all sections                                |
| `dashboard/css/theme.css`  | Dark/light CSS variables (`data-theme` attr on `<html>`) |
| `dashboard/css/style.css`  | Layout & components                                      |
| `dashboard/js/app.js`      | App controller, data fetch, state                        |
| `dashboard/js/charts.js`   | All ECharts rendering (~1580 lines)                      |
| `dashboard/js/config.js`   | `CONFIG` object: logPath, refreshInterval, etc.          |
| `dashboard/js/i18n.js`     | i18n: `data-i18n` attrs → `textContent` (NOT innerHTML)  |
| `dashboard/js/utils.js`    | Utility functions                                        |
| `dashboard/data/world.json`| 988KB GeoJSON for ECharts world map                      |

### Landing Page (`website/`)

| File                         | Role                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| `website/index.html`         | Landing page: project intro and installation guide         |
| `website/css/landing.css`    | Layout, components, dark/light variables                   |
| `website/js/landing.js`      | Theme/language toggles, mobile nav, scroll effects         |
| `website/js/i18n.js`         | Lightweight i18n module for the landing page               |
| `website/i18n/{en,zh}.json`  | Landing page translations                                  |
| `website/js/hero-log-stream.js` | Hero background: canvas-based animated fail2ban log stream |


## i18n — Easy to Miss

- Translates via `data-i18n="section.key"` → sets `textContent` (not `innerHTML`)
- **HTML entities like `&copy;` won't render** — use raw Unicode `©` instead
- Cache-bust: `fetch('i18n/en.json?t=${Date.now()}')`
- Language stored in `localStorage` key `f2b-lang`
- Language switch emits `i18n:languageChanged` event on `document`
- Translations in `dashboard/i18n/{en,zh}.json`

### Landing Page i18n

- Same `data-i18n` → `textContent` rule applies
- Files: `website/js/i18n.js` and `website/i18n/{en,zh}.json`
- Language stored in `localStorage` key `f2b-landing-lang`
- Language switch emits `landing:i18nChanged` event on `document`
- Toggle button label: **EN** for English, **中** for Chinese

## Time Range Selector Behavior

- Only affects **Attack Timeline** and **Attack Trends**
- Per-Jail Report always shows all-time data

## Key Conventions

- **Commits**: English, conventional prefix (`feat:`, `fix:`, etc.)
- **Jail**: kept in English, never translated to Chinese
- **No `install.sh`/`uninstall.sh`** — removed, manual commands in README
- **Validation**: `python3 -m json.tool` for JSON, ShellCheck for `.sh`, HTML via `html.parser`
- **ECharts**: loaded from CDN (`<script>` tag), colors from CSS custom properties (`--chart-*`)
- **GeoIP API**: free IP-API tier — 45 req/min, 1.4s delay between requests

## Git

- `logs/` dir (sample logs) excluded via `.gitignore`
- `dashboard/data/dashboard.json` and `dashboard/data/geo-cache.json` excluded (runtime-generated)
- `.playwright-cli/` excluded (playwright-cli session directory)
- Force-push accepted (young repo, single contributor)

## Git Workflow

- Do NOT run `git commit`, `git push`, `git amend`, `git rebase`, or any other mutating git operation without explicit user confirmation in the current conversation.
- After making code changes, always show a summary of the diff and ask "是否要 commit？" before committing.
- Approval of a plan or "OK" does NOT imply approval to commit.
