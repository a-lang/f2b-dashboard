# Dashboard JSON Schema

## Overview

This document defines the complete schema for `dashboard.json` — the single aggregated data file output by the Bash parser (`f2b-parse.sh`) and consumed by the frontend JavaScript.

## File Location

```
web/data/dashboard.json
```

## Top-Level Structure

```json
{
  "meta": { ... },
  "summary": { ... },
  "timeline": [ ... ],
  "topIPs": [ ... ],
  "jails": { ... },
  "heatmap": { ... },
  "trends": [ ... ],
  "recentLogs": [ ... ],
  "perJail": { ... }
}
```

---

## Section: `meta`

Metadata about the data itself (when generated, time range covered, etc.)

| Field | Type | Description |
|-------|------|-------------|
| `generatedAt` | string (ISO 8601) | Timestamp when JSON was generated |
| `timeRangeStart` | string (ISO 8601) | Earliest log timestamp in dataset |
| `timeRangeEnd` | string (ISO 8601) | Latest log timestamp in dataset |
| `logFilesProcessed` | array of strings | List of log files parsed |
| `parserVersion` | string | Version of f2b-parse.sh that generated this |

---

## Section: `summary`

High-level attack statistics for the entire dataset.

| Field | Type | Description |
|-------|------|-------------|
| `totalAttacks` | integer | Total "Found" events across all jails |
| `totalBans` | integer | Total "Ban" events (new bans only, excludes Restore Ban) |
| `totalUnbans` | integer | Total "Unban" events (excludes Flush tickets) |
| `activeBans` | integer | Current number of IPs under ban (Ban - Unban, approximate) |
| `restoredBans` | integer | Total "Restore Ban" events |
| `repeatAttacks` | integer | Total "already banned" events |
| `ignored` | integer | Total "Ignore" events |
| `uniqueIPs` | integer | Count of distinct attacking IP addresses |
| `activeJails` | integer | Number of active fail2ban jails |
| `topAttacker` | object | { ip, count, jail } for the most active attacker |

---

## Section: `timeline`

Hourly attack counts over the dataset period. Used for the timeline/area chart.

**Type:** Array of objects, sorted by timestamp ascending.

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string (ISO 8601) | Hourly timestamp (e.g., "2026-06-01T10:00:00Z") |
| `sshd` | integer | Found events for sshd jail in this hour |
| `asterisk` | integer | Found events for asterisk jail in this hour |
| `total` | integer | Total Found events in this hour |

**Example:**
```json
[
  { "timestamp": "2026-06-01T10:00:00Z", "sshd": 15, "asterisk": 42, "total": 57 },
  { "timestamp": "2026-06-01T11:00:00Z", "sshd": 8, "asterisk": 35, "total": 43 }
]
```

---

## Section: `topIPs`

Top attacking IP addresses with attack counts, geo data, and current status.

**Type:** Array of objects, sorted by `count` descending.

| Field | Type | Description |
|-------|------|-------------|
| `ip` | string | IP address |
| `count` | integer | Total "Found" events for this IP |
| `jail` | string | Primary jail this IP targeted |
| `country` | string | Country name from GeoIP lookup, or special label |
| `city` | string | City name from GeoIP lookup, or null |
| `lat` | number | Latitude from GeoIP lookup, or null |
| `lon` | number | Longitude from GeoIP lookup, or null |
| `lastSeen` | string (ISO 8601) | Timestamp of most recent event for this IP |
| `isBanned` | boolean | Whether this IP is currently banned |
| `banCount` | integer | Number of times this IP was banned |
| `isPrivate` | boolean | true if IP is private (10.x, 172.16-31.x, 192.168.x) |
| `isIPv6` | boolean | true if IP is IPv6 address |

**Special Labels for `country`:**
- `"Internal/Private"` — Private IP range
- `"IPv6"` — IPv6 address (geo unavailable)
- `"Unknown"` — GeoIP lookup failed

---

## Section: `jails`

Aggregate statistics per jail.

**Type:** Object with jail names as keys.

| Field | Type | Description |
|-------|------|-------------|
| `<jailName>` | object | Statistics for this jail |
| `<jailName>.attacks` | integer | Total Found events |
| `<jailName>.bans` | integer | Total Ban events |
| `<jailName>.unbans` | integer | Total Unban events |
| `<jailName>.restoredBans` | integer | Total Restore Ban events |
| `<jailName>.ignored` | integer | Total Ignore events |
| `<jailName>.uniqueIPs` | integer | Unique IPs targeting this jail |
| `<jailName>.topIP` | string | IP with highest count for this jail |
| `<jailName>.topIPCount` | integer | Count for top IP |

**Example:**
```json
{
  "sshd": { "attacks": 12453, "bans": 892, "unbans": 876, "restoredBans": 142, "ignored": 12, "uniqueIPs": 156, "topIP": "45.130.127.41", "topIPCount": 234 },
  "asterisk": { "attacks": 32189, "bans": 2156, "unbans": 2098, "restoredBans": 389, "ignored": 89, "uniqueIPs": 67, "topIP": "165.227.124.92", "topIPCount": 2802 }
}
```

---

## Section: `heatmap`

Attack frequency by hour of day and day of week. Used for the heatmap chart.

**Type:** Object with two sub-objects: `hourly` and `weekly`.

### `heatmap.hourly`

Average attacks per hour (0-23).

```json
{
  "hourly": {
    "0": 12, "1": 8, "2": 6, "3": 5, "4": 4, "5": 5,
    "6": 9, "7": 18, "8": 25, "9": 32, "10": 38, "11": 42,
    "12": 45, "13": 48, "14": 52, "15": 55, "16": 51, "17": 47,
    "18": 43, "19": 38, "20": 35, "21": 28, "22": 20, "23": 15
  }
}
```

### `heatmap.weekly`

Average attacks per day of week (0=Sunday, 6=Saturday).

```json
{
  "weekly": {
    "0": 285, "1": 342, "2": 356, "3": 348, "4": 351, "5": 312, "6": 298 }
}
```

### `heatmap.grid`

Full 7-day × 24-hour matrix for heatmap visualization. Each cell contains attack count.

```json
{
  "grid": [
    [12, 8, 6, 5, 4, 5, 9, 18, 25, 32, 38, 42, 45, 48, 52, 55, 51, 47, 43, 38, 35, 28, 20, 15],
    [15, 10, 7, 5, 4, 6, 10, 20, 28, 35, 41, 46, 50, 53, 57, 60, 55, 50, 45, 40, 36, 29, 22, 16],
    ... (7 rows total, one per day of week)
  ]
}
```

**Note:** `grid[row][col]` where `row` is day of week (0-6) and `col` is hour (0-23).

---

## Section: `trends`

Daily attack counts for trend/bar chart.

**Type:** Array of objects, sorted by date ascending.

| Field | Type | Description |
|-------|------|-------------|
| `date` | string (YYYY-MM-DD) | Date |
| `sshd` | integer | Found events for sshd on this date |
| `asterisk` | integer | Found events for asterisk on this date |
| `total` | integer | Total Found events on this date |
| `bans` | integer | New bans on this date |
| `unbans` | integer | Unbans on this date |

---

## Section: `recentLogs`

Last 100 attack events for the log list display.

**Type:** Array of objects, sorted by timestamp descending (most recent first).

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string (ISO 8601) | When the event occurred |
| `type` | string | Event type: "Found", "Ban", "Unban", "RestoreBan", "Ignore", "AlreadyBanned" |
| `ip` | string | IP address involved |
| `jail` | string | Jail name (e.g., "sshd", "asterisk") |
| `message` | string | Original log message (optional, for detail) |

---

## Section: `perJail`

Detailed breakdown for each jail, used for per-jail service reports.

**Type:** Object with jail names as keys.

| Field | Type | Description |
|-------|------|-------------|
| `<jailName>` | object | Detailed stats for this jail |
| `<jailName>.banTime` | integer | Ban duration in seconds (from config) |
| `<jailName>.findtime` | integer | Find time window in seconds (from config) |
| `<jailName>.maxRetry` | integer | Max retry count before ban |
| `<jailName>.totalAttacks` | integer | Total Found events |
| `<jailName>.totalBans` | integer | Total new bans |
| `<jailName>.totalUnbans` | integer | Total unbans |
| `<jailName>.currentBanned` | integer | Approximate current ban count |
| `<jailName>.attackTrend` | array | Last 7 days of daily attack counts |
| `<jailName>.topCountries` | array | [{country, count}] top 5 attacking countries |
| `<jailName>.hourlyDistribution` | object | { "0": count, "1": count, ... } attacks by hour |
| `<jailName>.topIPs` | array | Top 10 IPs for this jail [{ip, count, country}] |

---

## Event Type Definitions

| Type | Log Pattern | Counted As |
|------|-------------|------------|
| `Found` | `[jail] Found IP - YYYY-MM-DD HH:MM:SS` | Attack attempt |
| `Ban` | `[jail] Ban IP` | New ban |
| `Unban` | `[jail] Unban IP` | Unban (not from Flush) |
| `RestoreBan` | `[jail] Restore Ban IP` | Ban restored after restart |
| `Ignore` | `[jail] Ignore IP by ip` | IP ignored (whitelisted) |
| `AlreadyBanned` | `[jail] IP already banned` | Repeat attack while banned |
| `Flush` | `[jail] Flush ticket(s)` | Batch unban — NOT counted as unbans |

---

## Data Constraints

1. **No Raw Events**: `dashboard.json` contains only aggregated/summarized data
2. **Time Range**: Based on log files — approximately 19 days (June 1-19, 2026)
3. **Update Frequency**: Designed for 5-minute cron updates
4. **GeoIP**: Geo data is injected by `f2b-geoip.sh` from `geo-cache.json`
5. **No Personal Data**: IP addresses are not considered personal data in this context

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-19 | Initial schema definition |