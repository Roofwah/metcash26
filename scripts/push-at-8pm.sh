#!/bin/sh
# Scheduled deploy: push main to origin (triggers Render). Run via: at -f scripts/push-at-8pm.sh 20:00
set -e
cd "$(dirname "$0")/.."
LOG="$PWD/scripts/push-at-8pm.log"
echo "=== $(date) ===" >> "$LOG"
git push origin main >> "$LOG" 2>&1
echo "push exit: $?" >> "$LOG"
