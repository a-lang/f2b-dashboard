#!/usr/bin/env bash
# f2b-parse.sh - Fail2ban log parser that outputs aggregated dashboard.json
# Version: 1.1.0

set -euo pipefail

LANG=C
LC_ALL=C
export LANG LC_ALL

# Bash version check (associative arrays require Bash 4+)
if (( BASH_VERSINFO[0] < 4 )); then
    echo "ERROR: Bash 4+ required (found ${BASH_VERSION})" >&2
    exit 1
fi

show_help() {
    cat << 'EOF'
f2b-parse.sh - Fail2Ban log parser

Usage: f2b-parse.sh [OPTIONS] [LOG_PATH] [OUTPUT_DIR]

Arguments:
  LOG_PATH    Path to fail2ban.log (default: /var/log/fail2ban.log)
  OUTPUT_DIR  Directory for dashboard.json output (default: web/data)

Options:
  -h, --help  Show this help message and exit

Examples:
  f2b-parse.sh                           # Use defaults
  f2b-parse.sh /var/log/fail2ban.log     # Custom log path
  f2b-parse.sh /var/log/fail2ban.log ./data  # Custom log and output
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            echo "ERROR: Unknown option: $1" >&2
            exit 1
            ;;
        *)
            break
            ;;
    esac
done

command -v jq >/dev/null 2>&1 || { echo "ERROR: jq is required but not installed" >&2; exit 1; }
command -v awk >/dev/null 2>&1 || { echo "ERROR: awk is required but not installed" >&2; exit 1; }

# Argument defaults
LOG_PATH="${1:-/var/log/fail2ban.log}"
OUTPUT_DIR="${2:-web/data}"
OUTPUT_DIR="${OUTPUT_DIR%/}"
OUTPUT_FILE="$OUTPUT_DIR/dashboard.json"
LOCK_FILE="/tmp/f2b-parse.lock"
PARSER_VERSION="1.1.0"

# Create output directory if needed
mkdir -p "$OUTPUT_DIR"

# Atomic write temp file
TMP_FILE="$OUTPUT_FILE.tmp.$$"

cleanup() {
    rm -f "$TMP_FILE" "${TMP_FILE}.2" "${DATE_DOW_FILE:-}"
}
trap cleanup EXIT

# Flock locking - prevent concurrent runs
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    echo "ERROR: Another instance of f2b-parse.sh is running (lock: $LOCK_FILE)" >&2
    exit 2
fi

# Find log files to process
# Process: fail2ban.log, fail2ban.log.1, fail2ban.log.2, etc.
# Skip .gz compressed files (rotated logs may be compressed)
LOG_FILES=()
if [[ -f "$LOG_PATH" ]]; then
    LOG_FILES+=("$LOG_PATH")
fi

LOG_DIR=$(dirname "$LOG_PATH")
LOG_BASE=$(basename "$LOG_PATH")

for f in "$LOG_DIR/${LOG_BASE}".[0-9]*; do
    [[ -f "$f" ]] || continue
    # Skip .gz files - compressed logs not handled
    [[ "$f" == *.gz ]] && continue
    LOG_FILES+=("$f")
done

GENERATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Check fail2ban service status
F2B_STATUS="unknown"
if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet fail2ban 2>/dev/null; then
        F2B_STATUS="running"
    else
        F2B_STATUS="stopped"
    fi
elif command -v service >/dev/null 2>&1; then
    if service fail2ban status >/dev/null 2>&1; then
        F2B_STATUS="running"
    else
        F2B_STATUS="stopped"
    fi
fi

# Sort log files by suffix number descending (oldest first)
if [[ ${#LOG_FILES[@]} -gt 1 ]]; then
    mapfile -t sorted < <(printf '%s\n' "${LOG_FILES[@]}" | sort -t. -k2 -n -r)
    LOG_FILES=("${sorted[@]}")
fi

if [[ ${#LOG_FILES[@]} -eq 0 ]]; then
    # Output valid empty dashboard JSON when no logs are found
    jq -n \
      --arg generated_at "$GENERATED_AT" \
      --arg parser_version "$PARSER_VERSION" \
      --arg f2b_status "$F2B_STATUS" \
      '{
        meta: {
          generatedAt: $generated_at,
          lastUpdated: $generated_at,
          timeRangeStart: null,
          timeRangeEnd: null,
          logFiles: [],
          logFilesProcessed: [],
          parserVersion: $parser_version,
          totalLines: 0,
          skippedLines: 0,
          parseErrors: 0,
          jailNames: []
        },
        summary: {
          totalAttacks: 0,
          totalBans: 0,
          totalUnbans: 0,
          activeBans: 0,
          restoredBans: 0,
          repeatAttacks: 0,
          ignored: 0,
          uniqueIPs: 0,
          activeJails: 0,
          f2bStatus: $f2b_status,
          topAttacker: { ip: null, count: 0, jail: null }
        },
        timeline: [],
        topIPs: [],
        jails: {},
        heatmap: { hourly: {}, weekly: {}, grid: [] },
        trends: [],
        recentLogs: [],
        perJail: {}
      }' > "$TMP_FILE"
    mv "$TMP_FILE" "$OUTPUT_FILE"
    echo "Dashboard JSON written to: $OUTPUT_FILE (no log files found)"
    exit 0
fi

# Pre-compute day-of-week for all unique dates in the logs
# This avoids calling date repeatedly in awk
DATE_DOW_FILE=$(mktemp)

grep -h '^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' "${LOG_FILES[@]}" 2>/dev/null | \
    cut -d' ' -f1 | sort -u | \
    while IFS= read -r d; do
        dow=$(date -d "$d" +%w)
        printf '%s %s\n' "$d" "$dow"
    done > "$DATE_DOW_FILE"

# Build logFilesProcessed array for meta
LOG_FILES_PROCESSED=''
for f in "${LOG_FILES[@]}"; do
    LOG_FILES_PROCESSED="$LOG_FILES_PROCESSED, \"$(basename "$f")\""
done
LOG_FILES_PROCESSED="[${LOG_FILES_PROCESSED#, }]"

# Pre-scan log files for jail names (dynamic detection)
# Extract jail names from [jail_name] patterns in the log
JAIL_NAMES_LIST=$(grep -hoE '\[[a-zA-Z0-9_ -]+\] ' "${LOG_FILES[@]}" 2>/dev/null \
    | sed 's/^\[//; s/\] $//' | sort -u | tr '\n' ' ')
JAIL_NAMES_LIST=${JAIL_NAMES_LIST% }

# Query jail configs from fail2ban-client (with sensible defaults fallback)
# Format: "jail:banTime:findTime:maxRetry jail:..."
JAIL_CONFIGS_STR=""
if [[ -n "$JAIL_NAMES_LIST" ]]; then
    for jail in $JAIL_NAMES_LIST; do
        bt=3600; ft=600; mr=5  # defaults
        if command -v fail2ban-client >/dev/null 2>&1 && fail2ban-client ping &>/dev/null; then
            bt=$(fail2ban-client get "$jail" bantime 2>/dev/null || echo 3600)
            ft=$(fail2ban-client get "$jail" findtime 2>/dev/null || echo 600)
            mr=$(fail2ban-client get "$jail" maxretry 2>/dev/null || echo 5)
        fi
        JAIL_CONFIGS_STR="$JAIL_CONFIGS_STR$jail:$bt:$ft:$mr "
    done
    JAIL_CONFIGS_STR=${JAIL_CONFIGS_STR% }
fi

# Run the awk parser
awk \
    -v parser_version="$PARSER_VERSION" \
    -v generated_at="$GENERATED_AT" \
    -v log_files_processed="$LOG_FILES_PROCESSED" \
    -v date_dow_file="$DATE_DOW_FILE" \
    -v f2b_status="$F2B_STATUS" \
    -v jail_configs="$JAIL_CONFIGS_STR" \
'
BEGIN {
    totalAttacks = 0
    totalBans = 0
    totalUnbans = 0
    restoredBans = 0
    repeatAttacks = 0
    ignored = 0
    skippedLines = 0
    parseErrors = 0

    # Load jail configs passed from bash
    # Format: "jail:banTime:findTime:maxRetry jail:..."
    n_jail_configs = 0
    if (jail_configs != "") {
        n_entries = split(jail_configs, config_entries, " ")
        for (ci = 1; ci <= n_entries; ci++) {
            n_parts = split(config_entries[ci], cp, ":")
            jn = cp[1]
            jail_banTime[jn] = cp[2] + 0
            jail_findtime[jn] = cp[3] + 0
            jail_maxRetry[jn] = cp[4] + 0
            n_jail_configs++
        }
    }

    # Load date->dow mapping
    while ((getline line < date_dow_file) > 0) {
        split(line, parts)
        date_dow[parts[1]] = parts[2] + 0
    }
    close(date_dow_file)

    # Recent logs circular buffer
    recentCap = 100
    recentHead = 0
    recentSize = 0

    timeRangeStart = ""
    timeRangeEnd = ""
}

function is_private_ip(ip) {
    if (ip ~ /^10\./) return 1
    if (ip ~ /^172\.(1[6-9]|2[0-9]|3[0-9])\./) return 1
    if (ip ~ /^192\.168\./) return 1
    if (ip ~ /^127\./) return 1
    return 0
}

function is_ipv6(ip) {
    if (ip ~ /:/) return 1
    return 0
}

function iso_timestamp(ts) {
    gsub(/ /, "T", ts)
    return ts "Z"
}

function json_str(s) {
    gsub(/\\/, "\\\\", s)
    gsub(/"/, "\\\"", s)
    gsub(/\n/, "\\n", s)
    gsub(/\r/, "\\r", s)
    gsub(/\t/, "\\t", s)
    return "\"" s "\""
}

function add_recent_log(ts, type, ip, jail, msg) {
    recentHead = (recentHead % recentCap) + 1
    recent_ts[recentHead] = ts
    recent_type[recentHead] = type
    recent_ip[recentHead] = ip
    recent_jail[recentHead] = jail
    recent_msg[recentHead] = msg
    if (recentSize < recentCap) recentSize++
}

{
    line = $0

    if (!match(line, /^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}/)) {
        skippedLines++
        next
    }

    ts_raw = $1 " " substr($2, 1, 8)
    ts_iso = iso_timestamp(ts_raw)
    date_str = $1
    hour_num = substr($2, 1, 2) + 0

    if (timeRangeStart == "" || ts_raw < timeRangeStart) timeRangeStart = ts_raw
    if (timeRangeEnd == "" || ts_raw > timeRangeEnd) timeRangeEnd = ts_raw

    # Dynamic jail detection: extract jail name from [jail_name] pattern
    # Note: fail2ban logs contain "fail2ban.filter         [PID]: INFO    [jail] Event"
    # We must match the [jail] bracket, not the [PID] bracket.
    # Strategy: remove the PID bracket (fail2ban.module  [PID]: LEVEL  ) first,
    # then match the remaining [jail_name] bracket.
    jail = ""
    work = line
    sub(/fail2ban\.[a-z]+ +\[[0-9]+\]: [A-Z]+ +/, "", work)
    if (match(work, /\[[a-zA-Z0-9_-]+\]/)) {
        # Extract jail name between brackets (without [ and ])
        jail = substr(work, RSTART + 1, RLENGTH - 2)
        # Position after the bracket match for event extraction
        rest = substr(work, RSTART + RLENGTH)
        # Skip leading space or colon-space
        sub(/^[: ]+/, "", rest)
    }

    if (jail == "" && match(line, /Determined IP using DNS Lookup/)) {
        next
    }

    if (jail == "") {
        if (!match(line, /(Starting Fail2ban|Daemon started|Connected to|Creating new jail|Jail .* started|Added logfile|encoding|Exiting Fail2ban|Initiated|maxLines|maxRetry|banTime|findtime|Stopping all jails|Jail .* is not a|Server ready|-----)/)) {
            skippedLines++
        }
        next
    }

    # Track this jail as seen
    jail_seen[jail] = 1

    ip = ""
    event_type = ""

    if (match(rest, /^Found ([0-9a-fA-F.:]+) - /)) {
        ip = substr(rest, RSTART + 6, RLENGTH - 9)
        event_type = "Found"
    }
    else if (match(rest, /^Restore Ban ([0-9a-fA-F.:]+)/)) {
        ip = substr(rest, RSTART + 12, RLENGTH - 12)
        event_type = "RestoreBan"
    }
    else if (match(rest, /^Ban ([0-9a-fA-F.:]+)/)) {
        ip = substr(rest, RSTART + 4, RLENGTH - 4)
        event_type = "Ban"
    }
    else if (match(rest, /^Unban ([0-9a-fA-F.:]+)/)) {
        ip = substr(rest, RSTART + 6, RLENGTH - 6)
        event_type = "Unban"
    }
    else if (match(rest, /^Ignore ([0-9a-fA-F.:]+) by ip/)) {
        ip = substr(rest, RSTART + 7, RLENGTH - 12)
        event_type = "Ignore"
    }
    else if (match(rest, /^([0-9a-fA-F.:]+) already banned/)) {
        ip = substr(rest, RSTART, RLENGTH - 15)
        event_type = "AlreadyBanned"
    }
    else if (match(rest, /^Flush ticket/)) {
        event_type = "Flush"
    }

    if (event_type == "") {
        skippedLines++
        next
    }

    # Apply default config if not already set from fail2ban-client
    if (!(jail in jail_banTime)) {
        jail_banTime[jail] = 3600
        jail_findtime[jail] = 600
        jail_maxRetry[jail] = 5
    }

    if (event_type == "Found") {
        totalAttacks++
        jail_attacks[jail]++

        ip_count[ip]++
        if (ip_jail[ip] == "") ip_jail[ip] = jail
        ip_last_seen[ip] = ts_iso

        jail_ip_count[jail, ip]++

        hour_key = substr(ts_raw, 1, 10) "T" substr(ts_raw, 12, 2) ":00:00Z"
        timeline[jail, hour_key]++

        trends[jail, date_str]++

        dow = date_dow[date_str] + 0
        heatmap_grid[dow, hour_num]++
        jail_hourly[jail, hour_num]++

        msg = "[" jail "] Found " ip " - " date_str " " substr(ts_raw, 12, 8)
        add_recent_log(ts_iso, "Found", ip, jail, msg)
    }
    else if (event_type == "Ban") {
        totalBans++
        jail_bans[jail]++
        ip_ban_count[ip]++
        ip_is_banned[ip] = 1
        trends_bans[date_str]++
        msg = "[" jail "] Ban " ip
        add_recent_log(ts_iso, "Ban", ip, jail, msg)
    }
    else if (event_type == "Unban") {
        totalUnbans++
        jail_unbans[jail]++
        ip_is_banned[ip] = 0
        trends_unbans[date_str]++
        msg = "[" jail "] Unban " ip
        add_recent_log(ts_iso, "Unban", ip, jail, msg)
    }
    else if (event_type == "RestoreBan") {
        restoredBans++
        jail_restored[jail]++
        ip_is_banned[ip] = 1
        msg = "[" jail "] Restore Ban " ip
        add_recent_log(ts_iso, "RestoreBan", ip, jail, msg)
    }
    else if (event_type == "Ignore") {
        ignored++
        jail_ignored[jail]++
        msg = "[" jail "] Ignore " ip " by ip"
        add_recent_log(ts_iso, "Ignore", ip, jail, msg)
    }
    else if (event_type == "AlreadyBanned") {
        repeatAttacks++
        msg = "[" jail "] " ip " already banned"
        add_recent_log(ts_iso, "AlreadyBanned", ip, jail, msg)
    }
}

END {
    # Build sorted jail_names array from jail_seen
    n_jail_names = 0
    for (jn in jail_seen) {
        jail_names[++n_jail_names] = jn
    }
    # Insertion sort for consistent output
    for (i = 2; i <= n_jail_names; i++) {
        tmp = jail_names[i]
        j = i - 1
        while (j >= 1 && jail_names[j] > tmp) {
            jail_names[j+1] = jail_names[j]
            j--
        }
        jail_names[j+1] = tmp
    }

    activeJails = n_jail_names

    uniqueIPs = 0
    for (ip in ip_count) uniqueIPs++

    activeBans = 0
    for (ip in ip_is_banned) {
        if (ip_is_banned[ip] == 1) activeBans++
    }

    topIP = ""
    topCount = 0
    topJail = ""
    for (ip in ip_count) {
        if (ip_count[ip] > topCount) {
            topCount = ip_count[ip]
            topIP = ip
            topJail = ip_jail[ip]
        }
    }

    totalLines = NR

    print "{"

    # meta
    print "  \"meta\": {"
    print "    \"generatedAt\": " json_str(generated_at) ","
    print "    \"lastUpdated\": " json_str(generated_at) ","
    print "    \"timeRangeStart\": " json_str(iso_timestamp(timeRangeStart)) ","
    print "    \"timeRangeEnd\": " json_str(iso_timestamp(timeRangeEnd)) ","
    print "    \"logFiles\": " log_files_processed ","
    print "    \"logFilesProcessed\": " log_files_processed ","
    print "    \"parserVersion\": " json_str(parser_version) ","
    print "    \"totalLines\": " totalLines ","
    print "    \"skippedLines\": " skippedLines ","
    print "    \"parseErrors\": " parseErrors ","
    # jailNames array for frontend dynamic rendering
    printf "    \"jailNames\": ["
    for (ji = 1; ji <= n_jail_names; ji++) {
        printf "%s", json_str(jail_names[ji])
        if (ji < n_jail_names) printf ", "
    }
    printf "]\n"
    print "  },"

    # summary
    print "  \"summary\": {"
    print "    \"totalAttacks\": " totalAttacks ","
    print "    \"totalBans\": " totalBans ","
    print "    \"totalUnbans\": " totalUnbans ","
    print "    \"activeBans\": " activeBans ","
    print "    \"restoredBans\": " restoredBans ","
    print "    \"repeatAttacks\": " repeatAttacks ","
    print "    \"ignored\": " ignored ","
    print "    \"uniqueIPs\": " uniqueIPs ","
    print "    \"activeJails\": " activeJails ","
    print "    \"f2bStatus\": " json_str(f2b_status) ","
    print "    \"topAttacker\": {"
    print "      \"ip\": " json_str(topIP) ","
    print "      \"count\": " topCount ","
    print "      \"jail\": " json_str(topJail)
    print "    }"
    print "  },"

    # timeline
    n_hours = 0
    for (key in timeline) {
        split(key, parts, SUBSEP)
        h = parts[2]
        if (!(h in hour_seen)) {
            hour_seen[h] = 1
            hours[++n_hours] = h
        }
    }
    for (i = 2; i <= n_hours; i++) {
        tmp = hours[i]
        j = i - 1
        while (j >= 1 && hours[j] > tmp) {
            hours[j+1] = hours[j]
            j--
        }
        hours[j+1] = tmp
    }

    print "  \"timeline\": ["
    for (i = 1; i <= n_hours; i++) {
        h = hours[i]
        total = 0
        printf "    { \"timestamp\": %s", json_str(h)
        for (ji = 1; ji <= n_jail_names; ji++) {
            jn = jail_names[ji]
            c = timeline[jn, h] + 0
            printf ", %s: %d", json_str(jn), c
            total += c
        }
        printf ", \"total\": %d }", total
        if (i < n_hours) printf ","
        printf "\n"
    }
    print "  ],"

    # topIPs
    n_ips = 0
    for (ip in ip_count) {
        ips[++n_ips] = ip
    }
    for (i = 2; i <= n_ips; i++) {
        tmp = ips[i]
        j = i - 1
        while (j >= 1 && ip_count[ips[j]] < ip_count[tmp]) {
            ips[j+1] = ips[j]
            j--
        }
        ips[j+1] = tmp
    }

    print "  \"topIPs\": ["
    max_ips = (n_ips > 20 ? 20 : n_ips)
    for (i = 1; i <= max_ips; i++) {
        ip = ips[i]
        isPriv = is_private_ip(ip) ? "true" : "false"
        isV6 = is_ipv6(ip) ? "true" : "false"
        if (isPriv == "true") {
            country = "Internal/Private"
        } else if (isV6 == "true") {
            country = "IPv6"
        } else {
            country = "Unknown"
        }
        banned = (ip in ip_is_banned && ip_is_banned[ip]) ? "true" : "false"
        printf "    { \"ip\": %s, \"count\": %d, \"jail\": %s, \"country\": %s, \"city\": null, \"lat\": null, \"lon\": null, \"lastSeen\": %s, \"isBanned\": %s, \"banCount\": %d, \"isPrivate\": %s, \"isIPv6\": %s }",
            json_str(ip), ip_count[ip], json_str(ip_jail[ip]), json_str(country),
            json_str(ip_last_seen[ip]), banned, ip_ban_count[ip]+0, isPriv, isV6
        if (i < max_ips) printf ","
        printf "\n"
    }
    print "  ],"

    # jails (dynamic)
    print "  \"jails\": {"
    for (ji = 1; ji <= n_jail_names; ji++) {
        jn = jail_names[ji]
        attacks = jail_attacks[jn] + 0
        bans = jail_bans[jn] + 0
        unbans = jail_unbans[jn] + 0
        restored = jail_restored[jn] + 0
        ign = jail_ignored[jn] + 0

        uips = 0
        for (key in jail_ip_count) {
            split(key, parts, SUBSEP)
            if (parts[1] == jn) uips++
        }

        tIP = ""
        tCount = 0
        for (key in jail_ip_count) {
            split(key, parts, SUBSEP)
            if (parts[1] == jn && jail_ip_count[key] > tCount) {
                tCount = jail_ip_count[key]
                tIP = parts[2]
            }
        }

        printf "    %s: { \"attacks\": %d, \"bans\": %d, \"unbans\": %d, \"restoredBans\": %d, \"ignored\": %d, \"uniqueIPs\": %d, \"topIP\": %s, \"topIPCount\": %d }",
            json_str(jn), attacks, bans, unbans, restored, ign, uips, json_str(tIP), tCount
        if (ji < n_jail_names) printf ","
        printf "\n"
    }
    print "  },"

    # heatmap
    print "  \"heatmap\": {"
    print "    \"hourly\": {"
    for (h = 0; h < 24; h++) {
        total_h = 0
        for (d = 0; d < 7; d++) total_h += heatmap_grid[d, h] + 0
        printf "      \"%d\": %d", h, total_h
        if (h < 23) printf ","
        printf "\n"
    }
    print "    },"
    print "    \"weekly\": {"
    for (d = 0; d < 7; d++) {
        total_d = 0
        for (h = 0; h < 24; h++) total_d += heatmap_grid[d, h] + 0
        printf "      \"%d\": %d", d, total_d
        if (d < 6) printf ","
        printf "\n"
    }
    print "    },"
    print "    \"grid\": ["
    for (d = 0; d < 7; d++) {
        printf "      ["
        for (h = 0; h < 24; h++) {
            printf "%d", heatmap_grid[d, h] + 0
            if (h < 23) printf ", "
        }
        printf "]"
        if (d < 6) printf ","
        printf "\n"
    }
    print "    ]"
    print "  },"

    # trends (dynamic jails)
    n_dates = 0
    for (key in trends) {
        split(key, parts, SUBSEP)
        date = parts[2]
        if (!(date in date_seen)) {
            date_seen[date] = 1
            dates[++n_dates] = date
        }
    }
    for (i = 2; i <= n_dates; i++) {
        tmp = dates[i]
        j = i - 1
        while (j >= 1 && dates[j] > tmp) {
            dates[j+1] = dates[j]
            j--
        }
        dates[j+1] = tmp
    }

    print "  \"trends\": ["
    for (i = 1; i <= n_dates; i++) {
        d = dates[i]
        total = 0
        printf "    { \"date\": %s", json_str(d)
        for (ji = 1; ji <= n_jail_names; ji++) {
            jn = jail_names[ji]
            c = trends[jn, d] + 0
            printf ", %s: %d", json_str(jn), c
            total += c
        }
        bans_c = trends_bans[d] + 0
        unbans_c = trends_unbans[d] + 0
        printf ", \"total\": %d, \"bans\": %d, \"unbans\": %d }", total, bans_c, unbans_c
        if (i < n_dates) printf ","
        printf "\n"
    }
    print "  ],"

    # recentLogs (reverse order - most recent first)
    print "  \"recentLogs\": ["
    for (i = 1; i <= recentSize; i++) {
        idx = ((recentHead - i + recentCap) % recentCap) + 1
        printf "    { \"timestamp\": %s, \"type\": %s, \"ip\": %s, \"jail\": %s, \"message\": %s }",
            json_str(recent_ts[idx]), json_str(recent_type[idx]), json_str(recent_ip[idx]),
            json_str(recent_jail[idx]), json_str(recent_msg[idx])
        if (i < recentSize) printf ","
        printf "\n"
    }
    print "  ],"

    # perJail (dynamic)
    print "  \"perJail\": {"
    for (ji = 1; ji <= n_jail_names; ji++) {
        jn = jail_names[ji]
        attacks = jail_attacks[jn] + 0
        bans = jail_bans[jn] + 0
        unbans = jail_unbans[jn] + 0
        currentBanned = bans + jail_restored[jn] - unbans
        if (currentBanned < 0) currentBanned = 0

        printf "    %s: {\n", json_str(jn)
        printf "      \"banTime\": %d,\n", jail_banTime[jn]
        printf "      \"findtime\": %d,\n", jail_findtime[jn]
        printf "      \"maxRetry\": %d,\n", jail_maxRetry[jn]
        printf "      \"totalAttacks\": %d,\n", attacks
        printf "      \"totalBans\": %d,\n", bans
        printf "      \"totalUnbans\": %d,\n", unbans
        printf "      \"currentBanned\": %d,\n", currentBanned

        # attackTrend
        printf "      \"attackTrend\": ["
        first = 1
        for (di = 1; di <= n_dates; di++) {
            d = dates[di]
            c = trends[jn, d] + 0
            if (!first) printf ", "
            printf "%d", c
            first = 0
        }
        printf "],\n"

        # topCountries - empty (geo data injected later)
        printf "      \"topCountries\": [],\n"

        # hourlyDistribution
        printf "      \"hourlyDistribution\": {\n"
        first = 1
        for (h = 0; h < 24; h++) {
            if (!first) printf ",\n"
            printf "        \"%d\": %d", h, jail_hourly[jn, h] + 0
            first = 0
        }
        printf "\n      },\n"

        # topIPs for this jail
        printf "      \"topIPs\": ["
        n_jips = 0
        for (key in jail_ip_count) {
            split(key, parts, SUBSEP)
            if (parts[1] == jn) {
                jips[++n_jips] = parts[2]
            }
        }
        for (i = 2; i <= n_jips; i++) {
            tmp = jips[i]
            j = i - 1
            while (j >= 1 && jail_ip_count[jn, jips[j]] < jail_ip_count[jn, tmp]) {
                jips[j+1] = jips[j]
                j--
            }
            jips[j+1] = tmp
        }
        max_jips = (n_jips > 10 ? 10 : n_jips)
        first = 1
        for (i = 1; i <= max_jips; i++) {
            ip = jips[i]
            isPriv = is_private_ip(ip) ? "true" : "false"
            isV6 = is_ipv6(ip) ? "true" : "false"
            if (isPriv == "true") country = "Internal/Private"
            else if (isV6 == "true") country = "IPv6"
            else country = "Unknown"
            if (!first) printf ", "
            printf "{ \"ip\": %s, \"count\": %d, \"country\": %s }",
                json_str(ip), jail_ip_count[jn, ip], json_str(country)
            first = 0
        }
        printf "]\n"

        printf "    }"
        if (ji < n_jail_names) printf ","
        printf "\n"
    }
    print "  }"

    print "}"
}
' "${LOG_FILES[@]}" > "$TMP_FILE"

# Validate and format with jq
jq . "$TMP_FILE" > "${TMP_FILE}.2"

# Atomic write
mv "${TMP_FILE}.2" "$OUTPUT_FILE"

echo "Dashboard JSON written to: $OUTPUT_FILE"
