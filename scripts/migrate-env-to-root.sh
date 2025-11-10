#!/bin/bash

# =============================================================================
# Migrate Environment Variables to Monorepo Root
# =============================================================================
# This script helps migrate from per-app .env.local files to a shared root
# .env.local file. Run this once during the migration.
#
# Usage: ./scripts/migrate-env-to-root.sh
# =============================================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "🔧 Environment Variable Migration Script"
echo "========================================="
echo ""

# Check if root .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  Root .env.local already exists!"
    echo ""
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. No changes made."
        exit 0
    fi
fi

# Find the first existing app .env.local file
APP_ENV_FILE=""
for app in "web-project-dashboard" "web-partnership-dashboard" "web-admin-dashboard"; do
    if [ -f "apps/$app/.env.local" ]; then
        APP_ENV_FILE="apps/$app/.env.local"
        echo "✅ Found existing environment file: $APP_ENV_FILE"
        break
    fi
done

if [ -z "$APP_ENV_FILE" ]; then
    echo "❌ No app .env.local files found."
    echo "   Creating a new root .env.local from .env.example..."
    cp .env.example .env.local
    echo "✅ Created .env.local at repository root"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Edit .env.local and fill in your actual values"
    echo "   2. Test with: pnpm run dev"
    exit 0
fi

# Copy the app env file to root
cp "$APP_ENV_FILE" .env.local
echo "✅ Copied $APP_ENV_FILE to root .env.local"
echo ""

# Compare all app .env.local files to ensure they're identical
echo "🔍 Checking if all app .env.local files are identical..."
ALL_IDENTICAL=true
for app in "web-project-dashboard" "web-partnership-dashboard" "web-admin-dashboard"; do
    if [ -f "apps/$app/.env.local" ]; then
        if ! diff -q "$APP_ENV_FILE" "apps/$app/.env.local" > /dev/null 2>&1; then
            echo "⚠️  WARNING: apps/$app/.env.local differs from $APP_ENV_FILE"
            ALL_IDENTICAL=false
        fi
    fi
done

if [ "$ALL_IDENTICAL" = true ]; then
    echo "✅ All app .env.local files are identical"
    echo ""
    
    # Offer to delete app-level .env.local files
    echo "Since all app .env.local files are identical, they can be safely removed."
    echo "The apps will now load environment variables from the root .env.local."
    echo ""
    read -p "Delete app-level .env.local files? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for app in "web-project-dashboard" "web-partnership-dashboard" "web-admin-dashboard"; do
            if [ -f "apps/$app/.env.local" ]; then
                rm "apps/$app/.env.local"
                echo "   ✅ Deleted apps/$app/.env.local"
            fi
        done
        echo ""
        echo "✅ Migration complete!"
    else
        echo ""
        echo "✅ Root .env.local created. App-level files kept (but not necessary)."
    fi
else
    echo ""
    echo "⚠️  Your app .env.local files have different values!"
    echo ""
    echo "This is unusual. Please review the differences and decide:"
    echo "  1. If the differences are intentional (app-specific config),"
    echo "     keep the app-level .env.local files for overrides"
    echo "  2. If the differences were accidental, manually consolidate"
    echo "     them into the root .env.local and delete the app files"
    echo ""
    echo "See docs/developer-guidelines/environment-variables-guide.md for details."
fi

echo ""
echo "📝 Next steps:"
echo "   1. Review .env.local at the repository root"
echo "   2. Test with: pnpm run dev"
echo "   3. Read: docs/developer-guidelines/environment-variables-guide.md"
echo ""
echo "🎉 Done!"

