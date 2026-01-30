#!/bin/bash
# Nagios Dashboard - GitHub Sync Script
# This script pulls latest changes from GitHub (pre-built dist included)
#
# Setup as cron job for automatic updates:
#   crontab -e
#   */5 * * * * /var/www/nagios-dashboard/deploy/sync-from-github.sh >> /var/log/nagios-dashboard-sync.log 2>&1
#
# Or run manually: ./sync-from-github.sh

set -e

# Configuration
DEPLOY_DIR="/var/www/nagios-dashboard"
BRANCH="main"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

cd "$DEPLOY_DIR"

echo "$LOG_PREFIX Checking for updates..."

# Fetch latest changes
git fetch origin "$BRANCH" --quiet

# Check if there are new commits
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "$LOG_PREFIX Already up to date."
    exit 0
fi

echo "$LOG_PREFIX Updates found. Pulling changes..."

# Pull changes (dist folder is pre-built and included in repo)
git pull origin "$BRANCH" --quiet

# Restore SELinux context on updated files
restorecon -Rv "$DEPLOY_DIR/dist" 2>/dev/null || true

echo "$LOG_PREFIX Updated to commit: $(git rev-parse --short HEAD)"
