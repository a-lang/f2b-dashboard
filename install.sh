#!/usr/bin/env bash
# install.sh - Fail2Ban Dashboard installer
# Sets up cron job, creates directories, makes scripts executable

set -euo pipefail

export LANG=C

# shellcheck disable=SC2155
readonly SCRIPT_NAME="$(basename "$0")"
# shellcheck disable=SC2155
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Default cron interval in minutes
CRON_INTERVAL=5

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --cron-interval=*)
            CRON_INTERVAL="${1#*=}"
            if ! [[ "$CRON_INTERVAL" =~ ^[0-9]+$ ]] || [[ "$CRON_INTERVAL" -lt 1 ]]; then
                echo "ERROR: --cron-interval must be a positive integer" >&2
                exit 1
            fi
            ;;
        --help|-h)
            echo "Usage: $SCRIPT_NAME [--cron-interval=N]"
            echo "  --cron-interval=N  Set cron interval in minutes (default: 5)"
            exit 0
            ;;
        *)
            echo "ERROR: Unknown argument: $1" >&2
            exit 1
            ;;
    esac
    shift
done

# -----------------------------------------------------------------------------
# Helper functions
# -----------------------------------------------------------------------------

error_exit() {
    echo "ERROR: $1" >&2
    exit 1
}

warn() {
    echo "WARNING: $1" >&2
}

info() {
    echo "INFO: $1"
}

check_dependency() {
    local cmd="$1"
    local package="$2"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        error_exit "Missing dependency: $cmd not found. Install with: $package"
    fi
}

# -----------------------------------------------------------------------------
# Bash version check
# -----------------------------------------------------------------------------
if (( BASH_VERSINFO[0] < 4 )); then
    error_exit "Bash 4+ required (found ${BASH_VERSION}). Please upgrade bash."
fi

info "Bash version check passed (${BASH_VERSION})"

# -----------------------------------------------------------------------------
# Dependency checks
# -----------------------------------------------------------------------------
info "Checking dependencies..."

check_dependency curl "apt install curl | yum install curl | apk add curl | pacman -S curl"
check_dependency awk "apt install awk | yum install gawk | apk add awk | pacman -S gawk"
check_dependency jq   "apt install jq   | yum install jq   | apk add jq   | pacman -S jq"

info "All dependencies found"

# -----------------------------------------------------------------------------
# Cron availability check
# -----------------------------------------------------------------------------
if ! command -v crontab >/dev/null 2>&1; then
    warn "crontab not found - cron job will not be installed."
    warn "Install cron with: apt install cron | yum install cron | apk add dcron | pacman -S cronie"
    CRON_AVAILABLE=false
else
    CRON_AVAILABLE=true
fi

# -----------------------------------------------------------------------------
# Create web/data directory
# -----------------------------------------------------------------------------
DATA_DIR="$SCRIPT_DIR/web/data"
if [[ ! -d "$DATA_DIR" ]]; then
    mkdir -p "$DATA_DIR"
    info "Created directory: $DATA_DIR"
else
    info "Directory exists: $DATA_DIR"
fi

# -----------------------------------------------------------------------------
# Make scripts executable
# -----------------------------------------------------------------------------
PARSE_SCRIPT="$SCRIPT_DIR/bin/f2b-parse.sh"
GEOIP_SCRIPT="$SCRIPT_DIR/bin/f2b-geoip.sh"

if [[ -f "$PARSE_SCRIPT" ]]; then
    chmod +x "$PARSE_SCRIPT"
    info "Made executable: $PARSE_SCRIPT"
else
    error_exit "Parser script not found: $PARSE_SCRIPT"
fi

if [[ -f "$GEOIP_SCRIPT" ]]; then
    chmod +x "$GEOIP_SCRIPT"
    info "Made executable: $GEOIP_SCRIPT"
else
    error_exit "GeoIP script not found: $GEOIP_SCRIPT"
fi

# -----------------------------------------------------------------------------
# Check config.js
# -----------------------------------------------------------------------------
CONFIG_FILE="$SCRIPT_DIR/config.js"
if [[ ! -f "$CONFIG_FILE" ]]; then
    warn "config.js not found in project root."
    echo "  You may want to create config.js with your settings (see config.js.example)"
else
    info "config.js found: $CONFIG_FILE"
fi

# -----------------------------------------------------------------------------
# Install cron job
# -----------------------------------------------------------------------------
if [[ "$CRON_AVAILABLE" == "true" ]]; then
    # Build the cron command with absolute paths and flock
    CRON_LOG_PATH="$(grep -o "logPath:[^,]*" "$CONFIG_FILE" 2>/dev/null | tr -d "'\" " | cut -d: -f2)"
    CRON_LOG_PATH="${CRON_LOG_PATH:-/var/log/fail2ban.log}"

    # Cron entry uses flock to prevent concurrent runs
    CRON_CMD="flock -n /tmp/f2b-parse.lock $SCRIPT_DIR/bin/f2b-parse.sh $CRON_LOG_PATH $DATA_DIR && $SCRIPT_DIR/bin/f2b-geoip.sh $DATA_DIR/dashboard.json $DATA_DIR/geo-cache.json"

    # Generate unique cron comment
    CRON_COMMENT="# f2b-dashboard parser (do not duplicate)"

    # Check if our cron entry already exists
    crontab -l 2>/dev/null | grep -q "$SCRIPT_DIR/bin/f2b-parse.sh" && {
        info "Cron job already installed. Use uninstall.sh to remove it first."
    }

    # Remove any existing f2b-dashboard cron entries (exact match on our pattern)
    crontab -l 2>/dev/null | grep -v "$SCRIPT_DIR/bin/f2b-parse.sh" | grep -v "$SCRIPT_DIR/bin/f2b-geoip.sh" | grep -v "^# f2b-dashboard" > /tmp/current_crontab 2>/dev/null || true

    # Add new cron entry
    {
        cat /tmp/current_crontab 2>/dev/null || true
        echo "$CRON_COMMENT"
        echo "*/$CRON_INTERVAL * * * * $CRON_CMD"
    } | crontab -

    rm -f /tmp/current_crontab

    info "Cron job installed: runs every $CRON_INTERVAL minutes"
    info "  Command: $CRON_CMD"
else
    info "Skipping cron installation (crontab not available)"
fi

# -----------------------------------------------------------------------------
# Final instructions
# -----------------------------------------------------------------------------
echo ""
echo "========================================"
echo "Installation complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Serve web/ directory with any web server:"
echo "       python3 -m http.server 8080 --directory web"
echo "       nginx/apache2/caddy, etc."
echo ""
echo "  2. Open in browser: http://localhost:8080/"
echo ""
if [[ "$CRON_AVAILABLE" == "true" ]]; then
    echo "  3. Cron job is active - data refreshes every $CRON_INTERVAL minutes"
    echo ""
    echo "  To check cron status:"
    echo "       crontab -l"
    echo ""
    echo "  To manually run once:"
    echo "       $SCRIPT_DIR/bin/f2b-parse.sh $CRON_LOG_PATH $DATA_DIR"
    echo "       $SCRIPT_DIR/bin/f2b-geoip.sh $DATA_DIR/dashboard.json $DATA_DIR/geo-cache.json"
fi
echo ""
