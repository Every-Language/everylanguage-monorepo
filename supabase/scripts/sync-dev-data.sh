#!/bin/bash
# Sync specific tables from development Supabase to local
# WARNING: This script syncs data from dev database. Use with caution.
# 
# For EL-88, it's recommended to use the test seed data instead:
#   supabase/seed/test/04_finance/03_seed_donation_status_testing_el88.sql
#
# This script is useful if you need real-world data patterns or edge cases
# that aren't covered by test data.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  WARNING: This will sync data from development database${NC}"
echo -e "${YELLOW}⚠️  Make sure you have:${NC}"
echo -e "   1. Development Supabase project ID"
echo -e "   2. Development database password (from Supabase dashboard)"
echo -e "   3. Local Supabase running (pnpm db:dev)"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 1
fi

# Get dev project details
read -p "Enter dev Supabase project ID (e.g., sjczwtpnjbmscxoszlyi): " DEV_PROJECT_ID
read -p "Enter dev database password: " -s DEV_DB_PASSWORD
echo ""

# Local database connection
LOCAL_DB_HOST="localhost"
LOCAL_DB_PORT="54322"
LOCAL_DB_USER="postgres"
LOCAL_DB_NAME="postgres"
LOCAL_DB_PASSWORD="postgres"

# Dev database connection (using direct connection string)
DEV_DB_HOST="${DEV_PROJECT_ID}.supabase.co"
DEV_DB_PORT="5432"
DEV_DB_USER="postgres.${DEV_PROJECT_ID}"
DEV_DB_NAME="postgres"

echo -e "${GREEN}📥 Syncing donations table...${NC}"

# Export donations from dev (excluding sensitive columns if needed)
PGPASSWORD="${DEV_DB_PASSWORD}" pg_dump \
  -h "${DEV_DB_HOST}" \
  -p "${DEV_DB_PORT}" \
  -U "${DEV_DB_USER}" \
  -d "${DEV_DB_NAME}" \
  -t donations \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-privileges \
  -f /tmp/donations_export.sql

# Import to local
PGPASSWORD="${LOCAL_DB_PASSWORD}" psql \
  -h "${LOCAL_DB_HOST}" \
  -p "${LOCAL_DB_PORT}" \
  -U "${LOCAL_DB_USER}" \
  -d "${LOCAL_DB_NAME}" \
  -c "TRUNCATE TABLE donations CASCADE;" \
  -f /tmp/donations_export.sql

echo -e "${GREEN}📥 Syncing payment_attempts table...${NC}"

# Export payment_attempts from dev
PGPASSWORD="${DEV_DB_PASSWORD}" pg_dump \
  -h "${DEV_DB_HOST}" \
  -p "${DEV_DB_PORT}" \
  -U "${DEV_DB_USER}" \
  -d "${DEV_DB_NAME}" \
  -t payment_attempts \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-privileges \
  -f /tmp/payment_attempts_export.sql

# Import to local
PGPASSWORD="${LOCAL_DB_PASSWORD}" psql \
  -h "${LOCAL_DB_HOST}" \
  -p "${LOCAL_DB_PORT}" \
  -U "${LOCAL_DB_USER}" \
  -d "${LOCAL_DB_NAME}" \
  -c "TRUNCATE TABLE payment_attempts CASCADE;" \
  -f /tmp/payment_attempts_export.sql

# Cleanup
rm -f /tmp/donations_export.sql /tmp/payment_attempts_export.sql

echo -e "${GREEN}✅ Sync complete!${NC}"
echo -e "${YELLOW}⚠️  Note: User IDs and other foreign keys may need adjustment${NC}"
echo -e "${YELLOW}⚠️  You may need to update user_id references to match local test users${NC}"
