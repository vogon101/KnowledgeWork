#!/bin/bash
# List valid project slugs (folders and workstreams)
# Usage: valid_slugs.sh [options]
#
# Options:
#   (none)       Show all valid slugs (folders + workstreams)
#   folders      Show only project folders
#   workstreams  Show only workstreams
#   --org ORG    Filter by organisation (acme-corp, example-org, etc.)
#   --check SLUG Check if a slug is valid (exit 0 if valid, 1 if not)
#   --help       Show this help

set -e
cd "$(dirname "$0")/../../../.." || exit 1

show_help() {
    cat << 'EOF'
Usage: valid_slugs.sh [options]

Options:
  (none)         Show all valid slugs (folders + workstreams)
  folders        Show only project folders
  workstreams    Show only workstreams
  --org ORG      Filter by organisation (acme-corp, example-org)
  --check SLUG   Check if a slug is valid (exit 0 if valid, 1 if not)
  --help         Show this help

Examples:
  valid_slugs.sh                       # All valid slugs
  valid_slugs.sh folders               # Only project folders
  valid_slugs.sh workstreams           # Only workstreams
  valid_slugs.sh --org example-org # Only ExOrg projects
  valid_slugs.sh --check nuclear       # Check if 'nuclear' is valid
EOF
}

get_folders() {
    local org_filter="$1"
    if [[ -n "$org_filter" ]]; then
        ls -d "${org_filter}/projects"/*/ 2>/dev/null | sed 's|.*/projects/||' | sed 's|/$||' | sort -u
    else
        ls -d */projects/*/ 2>/dev/null | sed 's|.*/projects/||' | sed 's|/$||' | sort -u
    fi
}

get_workstreams() {
    local org_filter="$1"
    local results=""

    # Find folder-based workstreams (preferred)
    # Look for README.md files with type: workstream in project subdirectories
    if [[ -n "$org_filter" ]]; then
        results=$(grep -l "type: workstream" "${org_filter}/projects"/*/*/README.md 2>/dev/null | \
            sed 's|/README.md$||' | sed 's|.*/||' | sort -u)
    else
        results=$(grep -l "type: workstream" */projects/*/*/README.md 2>/dev/null | \
            sed 's|/README.md$||' | sed 's|.*/||' | sort -u)
    fi

    # Also check for legacy file-based workstreams (type: workstream in .md files)
    local legacy=""
    if [[ -n "$org_filter" ]]; then
        legacy=$(grep -l "type: workstream" "${org_filter}/projects"/*/*.md 2>/dev/null | \
            grep -v README.md | sed 's|.*/||' | sed 's|\.md$||' | sort -u)
    else
        legacy=$(grep -l "type: workstream" */projects/*/*.md 2>/dev/null | \
            grep -v README.md | sed 's|.*/||' | sed 's|\.md$||' | sort -u)
    fi

    # Also check for deprecated sub-project type
    local deprecated=""
    if [[ -n "$org_filter" ]]; then
        deprecated=$(grep -l "type: sub-project" "${org_filter}/projects"/*/*/README.md 2>/dev/null | \
            sed 's|/README.md$||' | sed 's|.*/||' | sort -u)
    else
        deprecated=$(grep -l "type: sub-project" */projects/*/*/README.md 2>/dev/null | \
            sed 's|/README.md$||' | sed 's|.*/||' | sort -u)
    fi

    # Combine and dedupe
    (echo "$results"; echo "$legacy"; echo "$deprecated") | grep -v '^$' | sort -u
}

get_all() {
    local org_filter="$1"
    (get_folders "$org_filter"; get_workstreams "$org_filter") | sort -u
}

check_slug() {
    local slug="$1"
    local all_slugs
    all_slugs=$(get_all)
    if echo "$all_slugs" | grep -qx "$slug"; then
        echo "✓ '$slug' is a valid project reference"
        exit 0
    else
        echo "✗ '$slug' is NOT a valid project reference"
        echo ""
        echo "Valid slugs:"
        echo "$all_slugs" | sed 's/^/  /'
        exit 1
    fi
}

# Parse arguments
ORG=""
MODE="all"
CHECK_SLUG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --org)
            ORG="$2"
            shift 2
            ;;
        --check)
            CHECK_SLUG="$2"
            shift 2
            ;;
        folders)
            MODE="folders"
            shift
            ;;
        workstreams)
            MODE="workstreams"
            shift
            ;;
        subprojects)
            # Legacy alias for backwards compatibility
            MODE="workstreams"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Execute
if [[ -n "$CHECK_SLUG" ]]; then
    check_slug "$CHECK_SLUG"
elif [[ "$MODE" == "folders" ]]; then
    get_folders "$ORG"
elif [[ "$MODE" == "workstreams" ]]; then
    get_workstreams "$ORG"
else
    get_all "$ORG"
fi
