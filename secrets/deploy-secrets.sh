#!/bin/bash

# ============================================================
# Secret Deployment Script
# Deploys secrets to GitHub (repository + environments) and Vercel
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
SUCCESS_COUNT=0
FAILURE_COUNT=0
TOTAL_COUNT=0

# GitHub org and repo
GITHUB_REPO="Every-Language/everylanguage-monorepo"

# Vercel project names and IDs
VERCEL_PROJECT_DASHBOARD="omt-project-management-website"
VERCEL_PROJECT_DASHBOARD_ID="prj_KZOih5aNQLJIxQNZHBHSqPsk1SLT"
VERCEL_PARTNERSHIP_DASHBOARD="everylanguage-map-portal"
VERCEL_PARTNERSHIP_DASHBOARD_ID=""  # Will be fetched dynamically
VERCEL_TEAM_ID="matts-projects-04f21572"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Secret Deployment Script${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if required tools are installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed${NC}"
    exit 1
fi

if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    exit 1
fi

# Check if .env files exist
if [ ! -f "secrets/.env.shared" ]; then
    echo -e "${RED}❌ secrets/.env.shared not found${NC}"
    exit 1
fi

if [ ! -f "secrets/.env.development" ]; then
    echo -e "${RED}❌ secrets/.env.development not found${NC}"
    exit 1
fi

if [ ! -f "secrets/.env.production" ]; then
    echo -e "${RED}❌ secrets/.env.production not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisite checks passed${NC}"
echo ""

# Function to deploy a secret to GitHub
deploy_github_secret() {
    local secret_name=$1
    local secret_value=$2
    local target=$3  # "repo", "development", or "production"
    
    if [ -z "$secret_value" ]; then
        echo -e "${YELLOW}  ⊘ Skipping $secret_name (empty value)${NC}"
        return
    fi
    
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    
    if [ "$target" = "repo" ]; then
        if echo "$secret_value" | gh secret set "$secret_name" --repo "$GITHUB_REPO" 2>/dev/null; then
            echo -e "${GREEN}  ✓ GitHub (repo): $secret_name${NC}"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo -e "${RED}  ✗ GitHub (repo): $secret_name${NC}"
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
        fi
    else
        if echo "$secret_value" | gh secret set "$secret_name" --repo "$GITHUB_REPO" --env "$target" 2>/dev/null; then
            echo -e "${GREEN}  ✓ GitHub ($target): $secret_name${NC}"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo -e "${RED}  ✗ GitHub ($target): $secret_name${NC}"
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
        fi
    fi
}

# Function to get Vercel Auth Token
get_vercel_token() {
    # First, check if VERCEL_TOKEN environment variable is set
    if [ -n "$VERCEL_TOKEN" ]; then
        echo "$VERCEL_TOKEN"
        return
    fi
    
    # Try to get token from Vercel CLI config (modern location)
    local token_file="$HOME/Library/Application Support/com.vercel.cli/auth.json"
    if [ -f "$token_file" ]; then
        # Extract token from auth.json (handles spaces around colon)
        TOKEN=$(cat "$token_file" | grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4 | head -1)
        echo "$TOKEN"
        return
    fi
    
    # Try legacy location
    token_file="$HOME/.vercel/auth.json"
    if [ -f "$token_file" ]; then
        # Extract token from auth.json (handles spaces around colon)
        TOKEN=$(cat "$token_file" | grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4 | head -1)
        echo "$TOKEN"
        return
    fi
    
    echo ""
}

# Function to get Vercel Project ID by name
get_vercel_project_id() {
    local project_name=$1
    local team_id=$2
    local token=$3
    
    # Use Vercel API to get project info
    local response=$(curl -s -H "Authorization: Bearer $token" \
        "https://api.vercel.com/v9/projects/$project_name?teamId=$team_id")
    
    # Extract project ID from response
    local project_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "$project_id"
}

# Function to deploy a secret to Vercel using REST API
deploy_vercel_secret() {
    local secret_name=$1
    local secret_value=$2
    local project=$3
    local environment=$4  # "preview" or "production"
    
    if [ -z "$secret_value" ]; then
        echo -e "${YELLOW}  ⊘ Skipping $secret_name (empty value)${NC}"
        return
    fi
    
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    
    # Get Vercel token
    local token=$(get_vercel_token)
    if [ -z "$token" ]; then
        echo -e "${RED}  ✗ Vercel ($project - $environment): $secret_name (no auth token)${NC}"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        return
    fi
    
    # Get project ID
    local project_id=$(get_vercel_project_id "$project" "$VERCEL_TEAM_ID" "$token")
    if [ -z "$project_id" ]; then
        echo -e "${RED}  ✗ Vercel ($project - $environment): $secret_name (project not found)${NC}"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        return
    fi
    
    # Map environment name for API (preview -> preview, production -> production)
    local env_type="$environment"
    
    # Use Vercel API to set environment variable
    local response=$(curl -s -X POST \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{\"key\":\"$secret_name\",\"value\":\"$secret_value\",\"type\":\"encrypted\",\"target\":[\"$env_type\"]}" \
        "https://api.vercel.com/v10/projects/$project_id/env?teamId=$VERCEL_TEAM_ID&upsert=true")
    
    # Check if request was successful
    if echo "$response" | grep -q '"created"' || echo "$response" | grep -q '"updated"'; then
        echo -e "${GREEN}  ✓ Vercel ($project - $environment): $secret_name${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}  ✗ Vercel ($project - $environment): $secret_name${NC}"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
    fi
}

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
    
    if supabase secrets set --project-ref "$project_ref" --env-file "$temp_file" >/dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Supabase Edge Functions ($environment): $secret_name${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}  ✗ Supabase Edge Functions ($environment): $secret_name${NC}"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
    fi
    
    rm -f "$temp_file"
}

# Function to parse .env file
parse_env_file() {
    local file=$1
    while IFS='=' read -r key value; do
        # Skip empty lines and comments
        [[ -z "$key" || "$key" =~ ^#.*$ ]] && continue
        # Remove leading/trailing whitespace and quotes
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        echo "$key=$value"
    done < "$file"
}

# ============================================================
# Deploy Shared Secrets (Repository Level)
# ============================================================

echo -e "${BLUE}1. Deploying Shared Secrets to GitHub Repository${NC}"
while IFS='=' read -r key value; do
    deploy_github_secret "$key" "$value" "repo"
done < <(parse_env_file "secrets/.env.shared")
echo ""

# ============================================================
# Deploy Development Secrets
# ============================================================

echo -e "${BLUE}2. Deploying Development Secrets${NC}"

# GitHub Development Environment
echo -e "${YELLOW}GitHub Development Environment:${NC}"
while IFS='=' read -r key value; do
    # Skip Vercel-specific secrets for GitHub
    if [[ ! "$key" =~ ^VITE_ ]]; then
        deploy_github_secret "$key" "$value" "development"
    fi
done < <(parse_env_file "secrets/.env.development")
echo ""

# Vercel Development (Preview) - Both Projects
echo -e "${YELLOW}Vercel Development (Preview):${NC}"
while IFS='=' read -r key value; do
    # Only deploy Vercel-specific secrets
    if [[ "$key" =~ ^VITE_ ]]; then
        deploy_vercel_secret "$key" "$value" "$VERCEL_PROJECT_DASHBOARD" "preview"
        deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
    fi
done < <(parse_env_file "secrets/.env.development")
echo ""

# Supabase Development Edge Functions
echo -e "${YELLOW}Supabase Development Edge Functions:${NC}"

# Get SUPABASE_PROJECT_REF from development environment
DEV_PROJECT_REF=""
while IFS='=' read -r key value; do
    if [[ "$key" == "SUPABASE_PROJECT_REF" ]]; then
        DEV_PROJECT_REF="$value"
        break
    fi
done < <(parse_env_file "secrets/.env.development")

if [ -z "$DEV_PROJECT_REF" ]; then
    echo -e "${RED}  ✗ SUPABASE_PROJECT_REF not found in .env.development${NC}"
else
    # Deploy shared secrets needed by edge functions and auth services
    while IFS='=' read -r key value; do
        # Deploy secrets used by edge functions and Supabase Auth
        if [[ "$key" =~ ^(R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|CDN_SIGNING_SECRET|CDN_BASE_URL|IP_GEO_PROVIDER|IP_GEO_API_KEY|HUBSPOT_PRIVATE_APP_TOKEN|TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_VERIFY_SERVICE_SID|RESEND_API_KEY)$ ]]; then
            deploy_supabase_secret "$key" "$value" "$DEV_PROJECT_REF" "development"
        fi
    done < <(parse_env_file "secrets/.env.shared")
    
    # Deploy environment-specific secrets needed by edge functions
    while IFS='=' read -r key value; do
        # Skip GitHub and Vercel-specific secrets, and auto-provided Supabase secrets
        if [[ ! "$key" =~ ^(SUPABASE_PROJECT_REF|SUPABASE_DB_PASSWORD|SUPABASE_ACCESS_TOKEN|VITE_|SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_URL)$ ]]; then
            deploy_supabase_secret "$key" "$value" "$DEV_PROJECT_REF" "development"
        fi
    done < <(parse_env_file "secrets/.env.development")
fi
echo ""

# ============================================================
# Deploy Production Secrets
# ============================================================

echo -e "${BLUE}3. Deploying Production Secrets${NC}"

# GitHub Production Environment
echo -e "${YELLOW}GitHub Production Environment:${NC}"
while IFS='=' read -r key value; do
    # Skip Vercel-specific secrets for GitHub
    if [[ ! "$key" =~ ^VITE_ ]]; then
        deploy_github_secret "$key" "$value" "production"
    fi
done < <(parse_env_file "secrets/.env.production")
echo ""

# Vercel Production - Both Projects
echo -e "${YELLOW}Vercel Production:${NC}"
while IFS='=' read -r key value; do
    # Only deploy Vercel-specific secrets
    if [[ "$key" =~ ^VITE_ ]]; then
        deploy_vercel_secret "$key" "$value" "$VERCEL_PROJECT_DASHBOARD" "production"
        deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
    fi
done < <(parse_env_file "secrets/.env.production")
echo ""

# Supabase Production Edge Functions
echo -e "${YELLOW}Supabase Production Edge Functions:${NC}"

# Get SUPABASE_PROJECT_REF from production environment
PROD_PROJECT_REF=""
while IFS='=' read -r key value; do
    if [[ "$key" == "SUPABASE_PROJECT_REF" ]]; then
        PROD_PROJECT_REF="$value"
        break
    fi
done < <(parse_env_file "secrets/.env.production")

if [ -z "$PROD_PROJECT_REF" ]; then
    echo -e "${RED}  ✗ SUPABASE_PROJECT_REF not found in .env.production${NC}"
else
    # Deploy shared secrets needed by edge functions and auth services
    while IFS='=' read -r key value; do
        # Deploy secrets used by edge functions and Supabase Auth
        if [[ "$key" =~ ^(R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|CDN_SIGNING_SECRET|CDN_BASE_URL|IP_GEO_PROVIDER|IP_GEO_API_KEY|HUBSPOT_PRIVATE_APP_TOKEN|TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_VERIFY_SERVICE_SID|RESEND_API_KEY)$ ]]; then
            deploy_supabase_secret "$key" "$value" "$PROD_PROJECT_REF" "production"
        fi
    done < <(parse_env_file "secrets/.env.shared")
    
    # Deploy environment-specific secrets needed by edge functions
    while IFS='=' read -r key value; do
        # Skip GitHub and Vercel-specific secrets, and auto-provided Supabase secrets
        if [[ ! "$key" =~ ^(SUPABASE_PROJECT_REF|SUPABASE_DB_PASSWORD|SUPABASE_ACCESS_TOKEN|VITE_|SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_URL)$ ]]; then
            deploy_supabase_secret "$key" "$value" "$PROD_PROJECT_REF" "production"
        fi
    done < <(parse_env_file "secrets/.env.production")
fi
echo ""

# ============================================================
# Verification
# ============================================================

echo -e "${BLUE}4. Verifying Deployment${NC}"

# Verify GitHub secrets
echo -e "${YELLOW}Verifying GitHub Secrets:${NC}"
if gh secret list --repo "$GITHUB_REPO" &>/dev/null; then
    REPO_SECRET_COUNT=$(gh secret list --repo "$GITHUB_REPO" 2>/dev/null | wc -l)
    echo -e "${GREEN}  ✓ Repository secrets: $REPO_SECRET_COUNT found${NC}"
else
    echo -e "${RED}  ✗ Failed to verify repository secrets${NC}"
fi

# Verify GitHub environments
if gh api "repos/$GITHUB_REPO/environments/development" &>/dev/null; then
    echo -e "${GREEN}  ✓ Development environment exists${NC}"
else
    echo -e "${RED}  ✗ Development environment not found${NC}"
fi

if gh api "repos/$GITHUB_REPO/environments/production" &>/dev/null; then
    echo -e "${GREEN}  ✓ Production environment exists${NC}"
else
    echo -e "${RED}  ✗ Production environment not found${NC}"
fi
echo ""

# ============================================================
# Summary
# ============================================================

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Deployment Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "Total operations: $TOTAL_COUNT"
echo -e "${GREEN}Successful: $SUCCESS_COUNT${NC}"
if [ $FAILURE_COUNT -gt 0 ]; then
    echo -e "${RED}Failed: $FAILURE_COUNT${NC}"
else
    echo -e "Failed: $FAILURE_COUNT"
fi
echo ""

if [ $FAILURE_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All secrets deployed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "  1. Verify secrets in GitHub: https://github.com/$GITHUB_REPO/settings/secrets/actions"
    echo -e "  2. Verify Vercel secrets: vercel env ls"
    echo -e "  3. Verify Supabase secrets: supabase secrets list --project-ref <PROJECT_REF>"
    echo -e "  4. Test CI/CD by pushing to a feature branch"
else
    echo -e "${RED}✗ Some secrets failed to deploy. Please check the errors above.${NC}"
    exit 1
fi

