#!/bin/bash
# Date context helper for Claude Code sessions
# Usage: date_context.sh [command] [args]

set -e

case "${1:-basic}" in
    basic)
        # Default: show today, yesterday, tomorrow with current time
        current_hour=$(date '+%H')
        echo "Current time: $(date '+%H:%M %Z')"
        echo ""
        # Warn if between midnight and 3am - "today" might mean yesterday to the user
        if [ "$current_hour" -lt 3 ]; then
            echo "⚠️  LATE NIGHT: It's after midnight but before 3am."
            echo "   When the user says 'today', they likely mean $(date -v-1d '+%A %d %B')."
            echo "   Use judgement based on context."
            echo ""
        fi
        echo "Today: $(date '+%A %d %B %Y')"
        echo "Yesterday: $(date -v-1d '+%A %d %B %Y')"
        echo "Tomorrow: $(date -v+1d '+%A %d %B %Y')"
        ;;
    week)
        # Show this week (Mon-Sun)
        echo "This week:"
        current_dow=$(date +%u)
        for i in {1..7}; do
            day_offset=$((i - current_dow))
            if [ $day_offset -ge 0 ]; then
                date -v+${day_offset}d '+  %a %d %b'
            else
                date -v${day_offset}d '+  %a %d %b'
            fi
        done
        ;;
    offset)
        # Calculate date with offset: date_context.sh offset +3 or offset -5
        if [ -z "$2" ]; then
            echo "Usage: date_context.sh offset [+/-]N"
            exit 1
        fi
        date -v${2}d '+%A %d %B %Y'
        ;;
    weekday)
        # Find next occurrence of weekday: date_context.sh weekday Monday
        if [ -z "$2" ]; then
            echo "Usage: date_context.sh weekday [Monday|Tuesday|...]"
            exit 1
        fi
        target_day=$(echo "$2" | tr '[:upper:]' '[:lower:]')
        # Map day names to numbers (1=Mon, 7=Sun)
        case "$target_day" in
            monday|mon) target=1 ;;
            tuesday|tue) target=2 ;;
            wednesday|wed) target=3 ;;
            thursday|thu) target=4 ;;
            friday|fri) target=5 ;;
            saturday|sat) target=6 ;;
            sunday|sun) target=7 ;;
            *) echo "Unknown day: $2"; exit 1 ;;
        esac
        current=$(date +%u)
        if [ $target -gt $current ]; then
            days_ahead=$((target - current))
        elif [ $target -lt $current ]; then
            days_ahead=$((7 - current + target))
        else
            days_ahead=0
        fi
        echo "This $2: $(date -v+${days_ahead}d '+%A %d %B %Y')"
        echo "Next $2: $(date -v+$((days_ahead + 7))d '+%A %d %B %Y')"
        ;;
    month)
        # Show month boundaries
        echo "This month: $(date '+%B %Y')"
        echo "First day: $(date -v1d '+%A %d %B %Y')"
        echo "Last day: $(date -v1d -v+1m -v-1d '+%A %d %B %Y')"
        ;;
    diary)
        # Output diary filename(s) with existence check
        # Usage: diary [offset|-N|last]
        #   diary        - today's diary path
        #   diary -1     - yesterday's diary path
        #   diary -3     - last 3 days' diary paths with existence check
        #   diary last   - find most recent existing diary

        # Find repo root (where diary/ folder is)
        # Script is at .claude/skills/dates/scripts/ — 4 levels up
        SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
        REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
        DIARY_ROOT="$REPO_ROOT/diary"

        if [ -z "$2" ]; then
            # Just today
            echo "diary/$(date '+%Y/%m/%d-%a.md')"
        elif [ "$2" = "last" ]; then
            # Find most recent existing diary entry
            if [ -d "$DIARY_ROOT" ]; then
                latest=$(find "$DIARY_ROOT" -name "*.md" -type f 2>/dev/null | sort -r | head -1)
                if [ -n "$latest" ]; then
                    # Convert to relative path
                    echo "Last diary: diary/${latest#$DIARY_ROOT/}"
                else
                    echo "No diary entries found"
                fi
            else
                echo "Diary directory not found: $DIARY_ROOT"
            fi
        elif [[ "$2" =~ ^-[0-9]+$ ]]; then
            # Range: show last N days
            days=${2#-}
            echo "Recent diary entries (last $days days):"
            for i in $(seq 0 $((days - 1))); do
                diary_path="diary/$(date -v-${i}d '+%Y/%m/%d-%a.md')"
                full_path="$REPO_ROOT/$diary_path"
                day_name=$(date -v-${i}d '+%A %d %b')
                if [ -f "$full_path" ]; then
                    echo "  ✓ $diary_path ($day_name)"
                else
                    echo "  ✗ $diary_path ($day_name) [MISSING]"
                fi
            done
        else
            # Single offset (e.g., +1 or just a number)
            echo "diary/$(date -v${2}d '+%Y/%m/%d-%a.md')"
        fi
        ;;
    *)
        echo "Usage: date_context.sh [basic|week|offset|weekday|month|diary] [args]"
        echo ""
        echo "Commands:"
        echo "  basic           Today, yesterday, tomorrow (default)"
        echo "  week            This week Mon-Sun"
        echo "  offset [+/-]N   Date N days from today"
        echo "  weekday DAY     Next occurrence of weekday"
        echo "  month           Current month boundaries"
        echo "  diary [opt]     Diary paths: (none)=today, -1=yesterday, -N=last N days, last=most recent"
        ;;
esac
