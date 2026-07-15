🌐 English | [繁體中文](README.md)

# Fail2Ban Live Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/a-lang/f2b-dashboard.svg)](https://github.com/a-lang/f2b-dashboard)

Lightweight, zero-backend [Fail2Ban](https://github.com/fail2ban/fail2ban) attack intelligence dashboard. Built with Bash scripts, Cron scheduling, and a static HTML/JavaScript frontend. Parses local `fail2ban.log` into aggregated JSON data and visualizes it with interactive charts.

## 🏗️ Overview

[Fail2Ban](https://github.com/fail2ban/fail2ban) Live Dashboard turns raw Fail2Ban logs into actionable insights — no backend server, Node.js runtime, or database required. The architecture is intentionally simple:

- **Bash scripts** parse and aggregate log data
- **Cron** schedules periodic data updates
- **Static HTML/JS** renders the dashboard in any modern browser
- **ECharts** powers all visualizations (loaded from CDN)

This makes deployment trivial on any Linux distribution with minimal dependencies.

## ✨ Features

### Dashboard Panels

1. **Stat Cards** — Key metrics at a glance: total attacks, active bans, unique IPs, active Jails
2. **Attack Timeline** — Smooth area chart showing attack frequency over time, filterable by Jail
3. **Attack Trends** — Stacked bar chart with a 7-day moving average
4. **World Map** — Choropleth map showing geographic distribution of attack sources
5. **Top Attacking IPs** — Ranked table with geolocation, Jail assignment, and ban status
6. **Jail Statistics** — Donut chart showing attack share per Jail
7. **Attack Heatmap** — Hour × weekday matrix revealing attack time patterns
8. **Recent Logs** — Last 100 log entries with basic text filtering
9. **Per-Jail Report** — Detailed analysis for each Jail, collapsible sections

### Other Capabilities

- **Bilingual UI** — English and Traditional Chinese for all labels, hints, and messages
- **Dark/Light Theme** — One-click toggle, persisted in `localStorage`
- **Configurable Auto-Refresh** — 1 min, 5 min, 10 min, or off
- **Time Range Selector** — Filters Attack Timeline and Attack Trends: last 24h, last 7d, or all time
- **Mobile Responsive** — Single-column on phones, multi-column grid on tablets and desktops
- **Graceful Error Handling** — Fallback states for missing, corrupt, or loading data

### Screenshots

![Stat Cards](assets/screenshot-1.png)

![Attack Timeline & Trends](assets/screenshot-2.png)

![World Map](assets/screenshot-3.png)

![Attack Heatmap](assets/screenshot-4.png)

![Per-Jail Report](assets/screenshot-5.png)

## 📋 Requirements

- Bash 4+
- `curl`
- `awk` (gawk or mawk)
- `jq`
- Web server to serve static files (nginx, apache2, Caddy, or `python3 -m http.server`)

Supported distributions: Debian/Ubuntu, CentOS/RHEL, Alpine, Arch.

## 🚀 Installation

```bash
sudo git clone https://github.com/a-lang/f2b-dashboard.git /opt/f2b-dashboard
cd /opt/f2b-dashboard
```

### Initial Setup

```bash
mkdir -p dashboard/data
chmod +x bin/f2b-parse.sh bin/f2b-geoip.sh

# Install cron job (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/f2b-dashboard/bin/f2b-parse.sh /var/log/fail2ban.log /opt/f2b-dashboard/dashboard/data && /opt/f2b-dashboard/bin/f2b-geoip.sh /opt/f2b-dashboard/dashboard/data/dashboard.json /opt/f2b-dashboard/dashboard/data/geo-cache.json") | crontab -
```

After installation, serve the `/opt/f2b-dashboard/dashboard/` directory with any web server and open the dashboard in a browser.

## 📖 Usage

### Parsing Logs

```bash
bin/f2b-parse.sh [OPTIONS] [LOG_PATH] [OUTPUT_DIR]
```

| Argument | Description | Default |
|----------|-------------|---------|
| `LOG_PATH` | Path to fail2ban.log | `/var/log/fail2ban.log` |
| `OUTPUT_DIR` | Output directory for dashboard.json | `dashboard/data` |

| Option | Description |
|--------|-------------|
| `-h`, `--help` | Show this help message |

```bash
bin/f2b-parse.sh                           # Use defaults
bin/f2b-parse.sh /var/log/fail2ban.log     # Custom log path
bin/f2b-parse.sh /var/log/fail2ban.log ./data  # Custom path and output dir
```

Reads Fail2Ban log files (including rotated logs `.1`, `.2`, etc.) and outputs `dashboard.json`. Handles all event types: Found, Ban, Unban, Restore Ban, Ignore, already banned, and DNS Lookup events. Skips `.gz` compressed logs.

### GeoIP Lookup

```bash
bin/f2b-geoip.sh [OPTIONS] [DASHBOARD_JSON] [GEO_CACHE_JSON]
```

| Argument | Description | Default |
|----------|-------------|---------|
| `DASHBOARD_JSON` | Path to dashboard.json | `dashboard/data/dashboard.json` |
| `GEO_CACHE_JSON` | Path to geo-cache.json | `dashboard/data/geo-cache.json` |

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview without making API calls |
| `-h`, `--help` | Show this help message |

```bash
bin/f2b-geoip.sh                           # Use defaults
bin/f2b-geoip.sh --dry-run                 # Preview mode, no API calls
bin/f2b-geoip.sh /path/to/dashboard.json   # Custom path
```

Queries [IP-API](http://ip-api.com) for geolocation data on unique public IPs. Maintains a local `geo-cache.json` to avoid redundant API requests. Respects the free tier limit of 45 requests per minute. Private IPs and IPv6 addresses are skipped and marked appropriately.

### Cron Schedule

By default, the cron job runs every 5 minutes:

```
*/5 * * * * /opt/f2b-dashboard/bin/f2b-parse.sh /var/log/fail2ban.log /opt/f2b-dashboard/dashboard/data && /opt/f2b-dashboard/bin/f2b-geoip.sh /opt/f2b-dashboard/dashboard/data/dashboard.json /opt/f2b-dashboard/dashboard/data/geo-cache.json
```

To change the interval, edit `*/5` in the crontab entry.

### Viewing the Dashboard

Serve the `/opt/f2b-dashboard/dashboard/` directory and open in a browser.

#### Python (quick test only, for local/internal network use)

```bash
python3 -m http.server 8080 --directory /opt/f2b-dashboard/web
# http://localhost:8080
```

> Note: Python's built-in server is not suitable for production — no security headers, no TLS.

## ⚙️ Configuration

Edit `dashboard/js/config.js` in the project root to customize settings:

| Field | Default | Description |
|-------|---------|-------------|
| `logPath` | `/var/log/fail2ban.log` | Active Fail2Ban log file path |
| `refreshInterval` | `300000` | Frontend poll interval (ms, default 5 min) |
| `dataPath` | `data/` | Relative path to data directory within `dashboard/` |
| `maxRotatedFiles` | `10` | Maximum rotated logs to process (`.1`, `.2`, etc.) |
| `geoApiUrl` | `http://ip-api.com/json/` | GeoIP API base URL |
| `geoApiDelay` | `1.4` | Seconds between API requests (free tier: 45/min) |

## 📁 File Structure

```
.
├── bin/
│   ├── f2b-parse.sh      # Log parser and aggregation script
│   └── f2b-geoip.sh      # GeoIP lookup with caching
├── dashboard/
│   ├── index.html        # Single-page dashboard
│   ├── css/
│   │   ├── theme.css     # Dark/light CSS variables
│   │   └── style.css     # Layout and component styles
│   ├── js/
│   │   ├── app.js        # Application controller
│   │   ├── charts.js     # ECharts rendering logic
│   │   ├── i18n.js       # Internationalization module
│   │   ├── utils.js      # Utility functions
│   │   └── config.js     # User configuration
│   ├── i18n/
│   │   ├── en.json       # English translations
│   │   └── zh.json       # Traditional Chinese translations
│   └── data/
│       ├── dashboard.json    # Generated aggregated data
│       └── geo-cache.json    # GeoIP cache
├── website/
│   ├── index.html        # Project landing page
│   ├── css/
│   │   └── landing.css   # Landing page styles
│   ├── js/
│   │   ├── i18n.js       # Landing page i18n module
│   │   ├── hero-log-stream.js  # Hero background animation
│   │   └── landing.js    # Landing page main script
│   └── i18n/
│       ├── en.json       # English translations
│       └── zh.json       # Traditional Chinese translations
├── README.md           # This file (Chinese)
└── README.en.md        # This file (English)
```

## 🔗 Architecture

```
fail2ban.log ──┐
fail2ban.log.1─┼──► f2b-parse.sh ──► dashboard.json ──┐
fail2ban.log.2─┘                                      ├──► Browser
                                                      │
                    f2b-geoip.sh ◄── IP-API (HTTP) ──┘
                           │
                           ▼
                     geo-cache.json
```

1. **f2b-parse.sh** reads `fail2ban.log` and rotated files, aggregates events, and writes `dashboard.json` atomically (write to temp file, then rename).
2. **f2b-geoip.sh** reads unique IPs from `dashboard.json`, queries IP-API for uncached public IPs, and injects geolocation data back into `dashboard.json`.
3. **Cron** runs both scripts at the configured interval, using `flock` to prevent overlapping execution.
4. **Browser** polls `dashboard.json` at the interval set in `dashboard/js/config.js`.
5. **ECharts** renders all charts directly from the JSON data with no additional transformation.

## 🔧 Troubleshooting

<details>
<summary>Missing jq, curl, or awk</summary>
<br>

Make sure `curl`, `awk`, and `jq` are installed. Distribution-specific install commands:

- Debian/Ubuntu: `sudo apt install curl gawk jq`
- CentOS/RHEL: `sudo yum install curl gawk jq`
- Alpine: `sudo apk add curl gawk jq`
- Arch: `sudo pacman -S curl gawk jq`

</details>

<details>
<summary>Log File Permission Denied</summary>
<br>

The cron job runs as the installing user. Ensure that user has read access to `/var/log/fail2ban.log` and its rotated files. You may need to add the user to the `adm` or `log` group.

</details>

<details>
<summary>CORS Issues When Serving the Dashboard</summary>
<br>

If you see CORS errors in the browser console, make sure your web server allows same-origin `GET` requests. Most static file servers handle this by default. Opening `index.html` via the `file://` protocol may cause modern browsers to block `fetch` requests — always serve the `dashboard/` directory over HTTP.

</details>

<details>
<summary>IP-API Rate Limiting</summary>
<br>

The free tier allows 45 requests per minute. The script enforces a 1.4-second delay between requests. If you see "Unknown" geolocations, wait a few minutes for the cron schedule to catch up. Cached IPs are not re-queried.

</details>

<details>
<summary>Dashboard Blank (No Log Data)</summary>
<br>

If the dashboard loads but shows "--" or "Loading data...", check:

- Fail2Ban is actually logging to the path set in `dashboard/js/config.js`
- The cron job is running (`crontab -l`)
- `dashboard/data/dashboard.json` exists and is valid JSON (`jq . dashboard/data/dashboard.json`)
- At least one manual parse has been run:
  ```bash
  bin/f2b-parse.sh /var/log/fail2ban.log dashboard/data
  bin/f2b-geoip.sh dashboard/data/dashboard.json dashboard/data/geo-cache.json
  ```

</details>

## 🗑️ Uninstall

```bash
# Remove cron job
crontab -l 2>/dev/null | grep -v "f2b-parse.sh" | grep -v "f2b-geoip.sh" | grep -v "^# f2b-dashboard" | crontab -

# Clean up lock file
rm -f /tmp/f2b-parse.lock

# Optionally delete data files
rm -f /opt/f2b-dashboard/dashboard/data/dashboard.json
rm -f /opt/f2b-dashboard/dashboard/data/geo-cache.json
```

## ⚖️ License

MIT

## 🤝 Contributing

Contributions from the community are welcome! For suggestions or issues, please visit [GitHub Issues](https://github.com/a-lang/f2b-dashboard/issues).

## 🙏 Acknowledgments

This project is built upon the excellent work of:

- [Fail2Ban](https://github.com/fail2ban/fail2ban) — Log parsing and banning engine
- [ECharts](https://echarts.apache.org/) — Interactive chart visualization
- [IP-API](http://ip-api.com) — GeoIP geolocation service

---

**⭐ Find this project helpful? Give it a star to show your support!**
