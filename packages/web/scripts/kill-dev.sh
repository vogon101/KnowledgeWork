#!/bin/bash
# Kill any orphaned dev processes
# Use this if dev-all.sh didn't clean up properly

echo "Looking for orphaned processes..."

# Standard dev ports
PORTS="3001 3002 3004"

for port in $PORTS; do
    pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "Killing processes on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
done

# Also kill any tsx/node processes running from this directory
DIR=$(cd "$(dirname "$0")/.." && pwd)
pgrep -f "$DIR" 2>/dev/null | while read pid; do
    cmdline=$(ps -p $pid -o args= 2>/dev/null)
    if echo "$cmdline" | grep -qE 'tsx|next'; then
        echo "Killing: $cmdline"
        kill -9 $pid 2>/dev/null || true
    fi
done

echo "Done."
