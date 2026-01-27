#!/bin/bash
# Notify web UI when AI creates content that needs user review
# Usage: notify-web.sh <type> "<title>" "<file-path>" ["message"]
#
# Types: document, workstream, project, meeting-notes, other
#
# Examples:
#   notify-web.sh document "Q4 Summary" "anthropic/docs/q4-summary.md"
#   notify-web.sh project "Auth System" "anthropic/projects/auth/README.md" "Ready for review"

set -e

# Server URL
SERVER_URL="${TASK_SERVICE_URL:-http://localhost:3004}"

# Parse arguments
TYPE="$1"
TITLE="$2"
FILE_PATH="$3"
MESSAGE="${4:-}"

# Validate required arguments
if [ -z "$TYPE" ] || [ -z "$TITLE" ] || [ -z "$FILE_PATH" ]; then
    echo "Usage: notify-web.sh <type> \"<title>\" \"<file-path>\" [\"message\"]"
    echo ""
    echo "Types: document, workstream, project, meeting-notes, other"
    echo ""
    echo "Examples:"
    echo "  notify-web.sh document \"Q4 Summary\" \"anthropic/docs/q4-summary.md\""
    echo "  notify-web.sh project \"Auth System\" \"anthropic/projects/auth/README.md\" \"Ready for review\""
    exit 1
fi

# Validate type
case "$TYPE" in
    document|workstream|project|meeting-notes|other)
        ;;
    *)
        echo "Error: Invalid type '$TYPE'"
        echo "Valid types: document, workstream, project, meeting-notes, other"
        exit 1
        ;;
esac

# Build JSON payload for the input
# Escape special characters in strings for JSON
escape_json() {
    printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

TYPE_JSON=$(escape_json "$TYPE")
TITLE_JSON=$(escape_json "$TITLE")
FILE_PATH_JSON=$(escape_json "$FILE_PATH")

if [ -n "$MESSAGE" ]; then
    MESSAGE_JSON=$(escape_json "$MESSAGE")
    INPUT_JSON="{\"contentType\":${TYPE_JSON},\"title\":${TITLE_JSON},\"filePath\":${FILE_PATH_JSON},\"message\":${MESSAGE_JSON}}"
else
    INPUT_JSON="{\"contentType\":${TYPE_JSON},\"title\":${TITLE_JSON},\"filePath\":${FILE_PATH_JSON}}"
fi

# tRPC expects batched format: {"0":{"json":{...input...}}}
PAYLOAD="{\"0\":{\"json\":${INPUT_JSON}}}"

# Call the tRPC endpoint
# tRPC mutations use POST with batched JSON format
RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "${SERVER_URL}/api/trpc/notifications.aiContentCreated?batch=1" 2>&1)

# Check response - tRPC returns [{"result":{"data":{"json":{...}}}}] for success
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "Notification sent: $TITLE"
elif echo "$RESPONSE" | grep -q '"error"'; then
    echo "Error sending notification"
    echo "Response: $RESPONSE"
    exit 1
else
    # Assume success if no error field
    echo "Notification sent: $TITLE"
fi
