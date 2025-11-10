#!/bin/bash

# ============================================================
# Supabase Secret Deployment Script
# Deploys secrets to Supabase Edge Functions
# ============================================================

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SECRETS_DIR="$(dirname "$SCRIPT_DIR")"

# Source common utilities
source "$SCRIPT_DIR/common.sh"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Supabase Secret Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check prerequisites
check_command "supabase" "Install with: brew install supabase/tap/supabase" || exit 1
check_env_file "$SECRETS_DIR/.env.shared" || exit 1
check_env_file "$SECRETS_DIR/.env.development" || exit 1
check_env_file "$SECRETS_DIR/.env.production" || exit 1

echo -e "${GREEN}✓ All prerequisite checks passed${NC}"
echo ""

# Function to deploy a secret to Supabase Edge Functions
deploy_supabase_secret() {
    local secret_name=$1
    local secret_value=$2
    local project_ref=$3
    local environment=$4  # "development" or "production"
    
    if [ -z "$secret_value" ]; then
        echo -e "${YELLOW}  ⊘ Skipping $secret_name (empty value)${NC}"
        return
    fi
    
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    
    # Set secret using Supabase CLI
    # Create a temporary file to avoid issues with special characters in pipes
    local temp_file=$(mktemp)
    echo "$secret_name=$secret_value" > "$temp_file"
    
    # Capture both stdout and stderr to check for errors
    local output=$(supabase secrets set --project-ref "$project_ref" --env-file "$temp_file" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}  ✓ Supabase Edge Functions ($environment): $secret_name${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        # Check if error is because secret is auto-provided
        if echo "$output" | grep -qi "already exists\|auto-provided\|reserved"; then
            echo -e "${YELLOW}  ⊘ Supabase Edge Functions ($environment): $secret_name (auto-provided by Supabase)${NC}"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))  # Count as success since it's expected
        else
            echo -e "${RED}  ✗ Supabase Edge Functions ($environment): $secret_name${NC}"
            if [ -n "$output" ]; then
                echo -e "${RED}    Error: $output${NC}"
            fi
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
        fi
    fi
    
    rm -f "$temp_file"
}

# ============================================================
# Deploy Development Secrets
# ============================================================

echo -e "${BLUE}1. Deploying Development Secrets${NC}"
echo -e "${YELLOW}Supabase Development Edge Functions:${NC}"

# Get SUPABASE_PROJECT_ID from development environment
DEV_PROJECT_ID=$(get_env_value "SUPABASE_PROJECT_ID" "$SECRETS_DIR/.env.development")

if [ -z "$DEV_PROJECT_ID" ]; then
    echo -e "${RED}  ✗ SUPABASE_PROJECT_ID not found in .env.development${NC}"
    echo -e "${YELLOW}  Skipping development deployment${NC}"
else
    # Note: SUPABASE_URL is auto-provided by Supabase, so we don't deploy it
    # Deploy shared secrets needed by edge functions and auth services
    while IFS='=' read -r key value; do
        # Deploy secrets used by edge functions and Supabase Auth
        if [[ "$key" =~ ^(R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|CDN_SIGNING_SECRET|CDN_BASE_URL|IP_GEO_PROVIDER|IP_GEO_API_KEY|TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_VERIFY_SERVICE_SID|RESEND_API_KEY)$ ]]; then
            deploy_supabase_secret "$key" "$value" "$DEV_PROJECT_ID" "development"
        fi
    done < <(parse_env_file "$SECRETS_DIR/.env.shared")
    
    # Deploy environment-specific secrets needed by edge functions
    while IFS='=' read -r key value; do
        # Skip GitHub and Vercel-specific secrets, and secrets that are derived or auto-provided
        # Skip: SUPABASE_PROJECT_ID (used for derivation), SUPABASE_DB_PASSWORD (sensitive, not needed in edge functions)
        # Skip: VITE_* (frontend-only), SUPABASE_ACCESS_TOKEN (CLI only)
        # Note: SUPABASE_URL is auto-provided by Supabase, so we skip it
        if [[ ! "$key" =~ ^(SUPABASE_PROJECT_ID|SUPABASE_DB_PASSWORD|SUPABASE_ACCESS_TOKEN|VITE_|SUPABASE_URL)$ ]]; then
            deploy_supabase_secret "$key" "$value" "$DEV_PROJECT_ID" "development"
        fi
    done < <(parse_env_file "$SECRETS_DIR/.env.development")
fi
echo ""

# ============================================================
# Deploy Production Secrets
# ============================================================

echo -e "${BLUE}2. Deploying Production Secrets${NC}"
echo -e "${YELLOW}Supabase Production Edge Functions:${NC}"

# Get SUPABASE_PROJECT_ID from production environment
PROD_PROJECT_ID=$(get_env_value "SUPABASE_PROJECT_ID" "$SECRETS_DIR/.env.production")

if [ -z "$PROD_PROJECT_ID" ]; then
    echo -e "${RED}  ✗ SUPABASE_PROJECT_ID not found in .env.production${NC}"
    echo -e "${YELLOW}  Skipping production deployment${NC}"
else
    # Note: SUPABASE_URL is auto-provided by Supabase, so we don't deploy it
    # Deploy shared secrets needed by edge functions and auth services
    while IFS='=' read -r key value; do
        # Deploy secrets used by edge functions and Supabase Auth
        if [[ "$key" =~ ^(R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|CDN_SIGNING_SECRET|CDN_BASE_URL|IP_GEO_PROVIDER|IP_GEO_API_KEY|TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_VERIFY_SERVICE_SID|RESEND_API_KEY)$ ]]; then
            deploy_supabase_secret "$key" "$value" "$PROD_PROJECT_ID" "production"
        fi
    done < <(parse_env_file "$SECRETS_DIR/.env.shared")
    
    # Deploy environment-specific secrets needed by edge functions
    while IFS='=' read -r key value; do
        # Skip GitHub and Vercel-specific secrets, and secrets that are derived or auto-provided
        # Skip: SUPABASE_PROJECT_ID (used for derivation), SUPABASE_DB_PASSWORD (sensitive, not needed in edge functions)
        # Skip: VITE_* (frontend-only), SUPABASE_ACCESS_TOKEN (CLI only)
        # Note: SUPABASE_URL is auto-provided by Supabase, so we skip it
        if [[ ! "$key" =~ ^(SUPABASE_PROJECT_ID|SUPABASE_DB_PASSWORD|SUPABASE_ACCESS_TOKEN|VITE_|SUPABASE_URL)$ ]]; then
            deploy_supabase_secret "$key" "$value" "$PROD_PROJECT_ID" "production"
        fi
    done < <(parse_env_file "$SECRETS_DIR/.env.production")
fi
echo ""

# Print summary
print_summary
exit $?

