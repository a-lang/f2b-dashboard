#!/usr/bin/env bash
# uninstall.sh - Fail2Ban Dashboard uninstaller
# Removes cron job and optionally cleans data files

set -euo pipefail

export LANG=C

# shellcheck disable=SC2155
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# -----------------------------------------------------------------------------
# Helper functions
# -----------------------------------------------------------------------------

error_exit() {
    echo "ERROR: $1" >&2
    exit 1
}

info() {
    echo "INFO: $1"
}

warn() {
    echo "WARNING: $1" >&2
}

# -----------------------------------------------------------------------------
# Cron availability check
# -----------------------------------------------------------------------------
if ! command -v crontab >/dev/null 2>&1; then
    warn "crontab not found - nothing to uninstall."
    exit 0
fi

# -----------------------------------------------------------------------------
# Remove cron job (exact match on script paths)
# -----------------------------------------------------------------------------
CRON_REMOVED=false

if crontab -l 2>/dev/null | grep -q "$SCRIPT_DIR/bin/f2b-parse.sh"; then
    # Keep lines that don't contain our script paths or f2b-dashboard comments
    crontab -l 2>/dev/null | \
        grep -v "$SCRIPT_DIR/bin/f2b-parse.sh" | \
        grep -v "$SCRIPT_DIR/bin/f2b-geoip.sh" | \
        grep -v "^# f2b-dashboard" | \
        crontab - 2>/dev/null || true

    info "Removed cron job for f2b-parse.sh and f2b-geoip.sh"
    CRON_REMOVED=true
else
    info "No cron job found for this installation."
fi

# Clean up any stale lock files
if [[ -f /tmp/f2b-parse.lock ]]; then
    rm -f /tmp/f2b-parse.lock
    info "Removed lock file: /tmp/f2b-parse.lock"
fi

# -----------------------------------------------------------------------------
# Offer to remove data files
# -----------------------------------------------------------------------------
echo ""
read -p "Remove generated data files (dashboard.json, geo-cache.json)? [y/N] " -n 1 -r
echo ""
if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    DATA_DIR="$SCRIPT_DIR/web/data"
    DASHBOARD_JSON="$DATA_DIR/dashboard.json"
    GEO_CACHE_JSON="$DATA_DIR/geo-cache.json"

    REMOVED_ANY=false

    if [[ -f "$DASHBOARD_JSON" ]]; then
        rm -f "$DASHBOARD_JSON"
        info "Removed: $DASHBOARD_JSON"
        REMOVED_ANY=true
    fi

    if [[ -f "$GEO_CACHE_JSON" ]]; then
        rm -f "$GEO_CACHE_JSON"
        info "Removed: $GEO_CACHE_JSON"
        REMOVED_ANY=true
    fi

    if [[ "$REMOVED_ANY" == "false" ]]; then
        info "No data files found to remove."
    fi
else
    info "Skipped data file removal."
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "========================================"
echo "Uninstallation complete!"
echo "========================================"
echo ""
echo "Removed:"
[[ "$CRON_REMOVED" == "true" ]] && echo "  - Cron job"
[[ "$CRON_REMOVED" == "false" ]] && echo "  - No cron job installed"
echo ""
echo "Preserved (not removed):"
echo "  - $SCRIPT_DIR/bin/"
echo "  - $SCRIPT_DIR/web/"
echo "  - $SCRIPT_DIR/config.js"
echo ""
