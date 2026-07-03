#!/usr/bin/env bash
set -euo pipefail

export LANG=C

DRY_RUN=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        -h|--help)
            cat << 'EOF'
f2b-geoip.sh - GeoIP lookup for Fail2Ban Dashboard

Usage: f2b-geoip.sh [OPTIONS] [DASHBOARD_JSON] [GEO_CACHE_JSON]

Arguments:
  DASHBOARD_JSON  Path to dashboard.json (default: web/data/dashboard.json)
  GEO_CACHE_JSON  Path to geo-cache.json (default: web/data/geo-cache.json)

Options:
  --dry-run   Show what would be done without making API calls
  -h, --help  Show this help message and exit

Examples:
  f2b-geoip.sh                           # Use defaults
  f2b-geoip.sh --dry-run                 # Preview without API calls
  f2b-geoip.sh /path/to/dashboard.json   # Custom paths
EOF
            exit 0
            ;;
        -*)
            error_exit "Unknown option: $1"
            ;;
        *)
            break
            ;;
    esac
done

DASHBOARD_JSON="${1:-web/data/dashboard.json}"
GEO_CACHE_JSON="${2:-web/data/geo-cache.json}"
readonly GEO_API_URL="http://ip-api.com/json/"
readonly GEO_API_DELAY=1.4

SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_NAME

error_exit() {
    echo "$SCRIPT_NAME: Error: $1" >&2
    exit 1
}

warn() {
    echo "$SCRIPT_NAME: Warning: $1" >&2
}

info() {
    echo "$SCRIPT_NAME: $1"
}

command -v jq >/dev/null 2>&1 || error_exit "jq is required but not installed"
command -v curl >/dev/null 2>&1 || error_exit "curl is required but not installed (try: wget alternative not supported by this script)"

# Validate input
[ -f "$DASHBOARD_JSON" ] || error_exit "Dashboard JSON not found: $DASHBOARD_JSON"

# Extract unique IPs from topIPs
ips=$(jq -r '.topIPs // [] | map(.ip) | unique | .[]' "$DASHBOARD_JSON" 2>/dev/null) || {
    error_exit "Failed to parse dashboard JSON"
}

[ -n "$ips" ] || { info "No IPs found in dashboard.json"; exit 0; }

if [ -f "$GEO_CACHE_JSON" ]; then
    if ! jq -e 'type == "object"' "$GEO_CACHE_JSON" >/dev/null 2>&1; then
        warn "Invalid cache format, deleting and rebuilding from scratch"
        rm -f "$GEO_CACHE_JSON"
        cache='{}'
    else
        cache=$(cat "$GEO_CACHE_JSON")
    fi
else
    cache='{}'
fi

# Temp files
cache_tmp=$(mktemp)
dashboard_tmp=$(mktemp)
chmod 644 "$cache_tmp" "$dashboard_tmp"

cleanup() {
    rm -f "${cache_tmp:-}" "${cache_tmp:-}."* "${dashboard_tmp:-}" "${api_tmp:-}"
}
trap cleanup EXIT

echo "$cache" > "$cache_tmp"

# Add an entry to the in-memory cache file
add_to_cache() {
    local ip="$1"
    local country="$2"
    local city="${3:-null}"
    local lat="${4:-null}"
    local lon="${5:-null}"
    local ts
    ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    jq --arg ip "$ip" \
       --arg country "$country" \
       --argjson city "$city" \
       --argjson lat "$lat" \
       --argjson lon "$lon" \
       --arg ts "$ts" \
       '.[$ip] = {
           ip: $ip,
           country: $country,
           city: $city,
           lat: $lat,
           lon: $lon,
           timestamp: $ts
       }' "$cache_tmp" > "${cache_tmp}.new" && mv "${cache_tmp}.new" "$cache_tmp"
}

# Classify an IP address
classify_ip() {
    local ip="$1"
    case "$ip" in
        10.*|127.*|169.254.*|192.168.*)
            echo "private"
            ;;
        172.1[6-9].*|172.2[0-9].*|172.3[0-1].*)
            echo "private"
            ;;
        ::1)
            echo "private"
            ;;
        fd*:*)
            echo "private"
            ;;
        *:*)
            echo "ipv6"
            ;;
        *)
            echo "public"
            ;;
    esac
}

# Process IPs
total=$(echo "$ips" | grep -c .)
current=0
api_calls=0

while IFS= read -r ip; do
    current=$((current + 1))
    info "Looking up IP: $current/$total ($ip)"

    # Check if already cached
    if jq -e --arg ip "$ip" '.[$ip] // empty' "$cache_tmp" >/dev/null 2>&1; then
        info "  Cached"
        continue
    fi

    class=$(classify_ip "$ip")

    case "$class" in
        private)
            info "  Private IP, skipping"
            add_to_cache "$ip" "Internal/Private"
            ;;
        ipv6)
            info "  IPv6 address, skipping"
            add_to_cache "$ip" "IPv6 — Geo unavailable"
            ;;
        public)
            if [ "$DRY_RUN" -eq 1 ]; then
                info "  [dry-run] Would query API for $ip"
                api_calls=$((api_calls + 1))
                continue
            fi

            info "  Querying API"
            api_tmp=$(mktemp)
            http_code=$(curl --silent --max-time 10 --output "$api_tmp" --write-out "%{http_code}" "${GEO_API_URL}${ip}" 2>/dev/null || echo "000")

            if [ "$http_code" = "429" ]; then
                warn "  API rate limit hit (HTTP 429) for $ip, marking as Rate Limited"
                add_to_cache "$ip" "Rate Limited"
                rm -f "$api_tmp"
                api_calls=$((api_calls + 1))
                [ "$current" -lt "$total" ] && sleep "$GEO_API_DELAY"
                continue
            fi

            if [ "$http_code" != "200" ]; then
                info "  API error (HTTP $http_code), marking as Unknown"
                add_to_cache "$ip" "Unknown"
                rm -f "$api_tmp"
                api_calls=$((api_calls + 1))
                [ "$current" -lt "$total" ] && sleep "$GEO_API_DELAY"
                continue
            fi

            if ! jq -e '.status == "success"' "$api_tmp" >/dev/null 2>&1; then
                info "  Invalid API response, marking as Unknown"
                add_to_cache "$ip" "Unknown"
                rm -f "$api_tmp"
                api_calls=$((api_calls + 1))
                [ "$current" -lt "$total" ] && sleep "$GEO_API_DELAY"
                continue
            fi

            country=$(jq -r '.country // "Unknown"' "$api_tmp")
            city=$(jq '.city // null' "$api_tmp")
            lat=$(jq '.lat // null' "$api_tmp")
            lon=$(jq '.lon // null' "$api_tmp")

            add_to_cache "$ip" "$country" "$city" "$lat" "$lon"
            info "  OK: $country ($(jq -r '.city // "N/A"' "$api_tmp"))"
            rm -f "$api_tmp"
            api_calls=$((api_calls + 1))
            [ "$current" -lt "$total" ] && sleep "$GEO_API_DELAY"
            ;;
    esac
done <<< "$ips"

if [ "$DRY_RUN" -eq 1 ]; then
    info "[dry-run] Would write cache to: $GEO_CACHE_JSON"
    info "[dry-run] Would update dashboard: $DASHBOARD_JSON"
    info "[dry-run] Total IPs: $total, API calls that would be made: $api_calls"
    exit 0
fi

cp "$cache_tmp" "${GEO_CACHE_JSON}.tmp" && mv "${GEO_CACHE_JSON}.tmp" "$GEO_CACHE_JSON"
info "Geo cache written to: $GEO_CACHE_JSON"

info "Updating dashboard.json with geo data..."
jq --slurpfile cache "$GEO_CACHE_JSON" '
    .topIPs |= map(
        . as $entry |
        ($cache[0][$entry.ip] // null) as $geo |
        if $geo then
            $entry + {
                country: $geo.country,
                city: $geo.city,
                lat: $geo.lat,
                lon: $geo.lon
            }
        else
            $entry
        end
    ) |
    .perJail |= with_entries(
        .value.topIPs |= map(
            . as $entry |
            ($cache[0][$entry.ip] // null) as $geo |
            if $geo then
                $entry + {
                    country: $geo.country,
                    city: $geo.city,
                    lat: $geo.lat,
                    lon: $geo.lon
                }
            else
                $entry
            end
        )
    )
' "$DASHBOARD_JSON" > "$dashboard_tmp" && mv "$dashboard_tmp" "$DASHBOARD_JSON"

info "Dashboard updated: $DASHBOARD_JSON"
info "Total IPs processed: $total, API calls made: $api_calls"
