#!/bin/bash

# ==============================================================================
# Secret Check Script
# Scans staged files for potential sensitive data patterns.
# ==============================================================================

# Exit on error
set -e

# Patterns to search for
# Stripe keys, JWT secrets, potential passwords, etc.
PATTERNS=(
    "sk_live_"
    "sk_test_"
    "whsec_"
    "pk_live_"
    "AIzaSy" # Google API keys
    "JWT_SECRET="
    "REFRESH_TOKEN_SECRET="
    "PASSWORD="
)

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

FAILED=0

echo "🔍 Scanning staged files for secrets..."

for FILE in $STAGED_FILES; do
    # Skip binary files, images, package-lock.json, and this script itself
    if [[ "$FILE" =~ \.(png|jpg|jpeg|gif|webp|ico|pdf|zip|tgz)$ ]] || [[ "$FILE" == "package-lock.json" ]] || [[ "$FILE" == "scripts/check-secrets.sh" ]]; then
        continue
    fi

    for PATTERN in "${PATTERNS[@]}"; do
        if git diff --cached "$FILE" | grep "^+" | grep -q "$PATTERN"; then
            echo "❌ CRITICAL: Potential secret detected in $FILE (Pattern: $PATTERN)"
            FAILED=1
        fi
    done
done

if [ $FAILED -eq 1 ]; then
    echo ""
    echo "🚨 Commit aborted! Please remove sensitive data or use placeholders."
    echo "💡 If this is a false positive, you can bypass with 'git commit --no-verify' (not recommended)."
    exit 1
fi

echo "✅ No secrets detected in staged files."
exit 0
