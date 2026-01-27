#!/bin/bash
# Commit changes from content/ directory
# Usage: commit.sh "message" [files...]
# Usage: commit.sh --dry-run "message"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTENT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
REPO_ROOT="$(dirname "$CONTENT_DIR")"

cd "$REPO_ROOT"

# Check for dry-run flag
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    shift
fi

# Get commit message
MESSAGE="$1"
shift 2>/dev/null || true

if [ -z "$MESSAGE" ]; then
    echo "Usage: commit.sh [--dry-run] \"commit message\" [files...]"
    echo ""
    echo "Examples:"
    echo "  commit.sh \"Update diary entry\""
    echo "  commit.sh \"Add meeting notes\" diary/2026/01/17-Sat.md"
    echo "  commit.sh --dry-run \"Check what would be committed\""
    exit 1
fi

# If specific files provided, use those; otherwise stage all content changes
if [ $# -gt 0 ]; then
    # Stage specific files (prefix with content/ if not already)
    for file in "$@"; do
        if [[ "$file" == content/* ]]; then
            FILES_TO_ADD="$FILES_TO_ADD $file"
        else
            FILES_TO_ADD="$FILES_TO_ADD content/$file"
        fi
    done
else
    # Stage all content changes
    FILES_TO_ADD="content/"
fi

if [ "$DRY_RUN" = true ]; then
    echo "=== Dry Run - Would commit the following ==="
    echo ""
    echo "Message: $MESSAGE"
    echo ""
    echo "Files:"
    git status --short -- $FILES_TO_ADD 2>/dev/null || echo "  (no changes)"
    exit 0
fi

# Check if there are changes to commit
CHANGES=$(git status --short -- $FILES_TO_ADD 2>/dev/null | wc -l | tr -d ' ')
if [ "$CHANGES" = "0" ]; then
    echo "No changes to commit in content/"
    exit 0
fi

# Stage and commit
git add $FILES_TO_ADD
git commit -m "$MESSAGE"

echo ""
echo "Committed successfully."
git log -1 --oneline
