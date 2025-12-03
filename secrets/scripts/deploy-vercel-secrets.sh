#!/bin/bash

# ============================================================
# Vercel Secret Deployment Script
# Deploys secrets to Vercel projects (preview + production)
# ============================================================

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SECRETS_DIR="$(dirname "$SCRIPT_DIR")"

# Source common utilities
source "$SCRIPT_DIR/common.sh"

# Load VERCEL_TOKEN from .env.shared if it exists
if [ -f "$SECRETS_DIR/.env.shared" ]; then
    # Extract VERCEL_TOKEN from .env.shared and export it
    # Read directly from file, skipping comments and empty lines
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip empty lines and comments
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
        
        # Remove leading/trailing whitespace and quotes
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        
        if [ "$key" = "VERCEL_TOKEN" ] && [ -n "$value" ]; then
            export VERCEL_TOKEN="$value"
            break
        fi
    done < "$SECRETS_DIR/.env.shared"
fi

# Vercel configuration
VERCEL_PROJECT_DASHBOARD="everylanguage-project-dashboard"
VERCEL_PARTNERSHIP_DASHBOARD="everylanguage-partnership-dashboard"
VERCEL_ADMIN_DASHBOARD="everylanguage-admin-dashboard"
VERCEL_TEAM_ID="matthew-projects"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Vercel Secret Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check prerequisites
check_command "vercel" "Install with: npm install -g vercel" || exit 1
check_command "jq" "Install with: brew install jq" || exit 1
check_env_file "$SECRETS_DIR/.env.development" || exit 1
check_env_file "$SECRETS_DIR/.env.production" || exit 1

# Verify Vercel token is loaded
if [ -n "$VERCEL_TOKEN" ]; then
    echo -e "${GREEN}✓ Vercel token loaded from .env.shared${NC}"
else
    echo -e "${YELLOW}⚠ Vercel token not found in .env.shared, will try CLI auth${NC}"
fi

echo -e "${GREEN}✓ All prerequisite checks passed${NC}"
echo ""

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
        if [ -n "$TOKEN" ]; then
            echo "$TOKEN"
            return
        fi
    fi
    
    # Try legacy location
    token_file="$HOME/.vercel/auth.json"
    if [ -f "$token_file" ]; then
        # Extract token from auth.json (handles spaces around colon)
        TOKEN=$(cat "$token_file" | grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4 | head -1)
        if [ -n "$TOKEN" ]; then
            echo "$TOKEN"
            return
        fi
    fi
    
    echo ""
}

# Function to get Vercel Project ID by name
get_vercel_project_id() {
    local project_name=$1
    local team_id=$2
    local token=$3
    
    # Build URL to list projects with optional team parameter
    local url="https://api.vercel.com/v9/projects"
    if [ -n "$team_id" ]; then
        url="$url?teamId=$team_id"
    fi
    
    # Use Vercel API to list all projects
    local response=$(curl -s -H "Authorization: Bearer $token" "$url")
    
    # Extract project ID by filtering by name using jq
    local project_id=$(echo "$response" | jq -r --arg name "$project_name" '.projects[]? | select(.name == $name) | .id // empty' | head -1)
    
    # If not found, try the direct endpoint as fallback
    if [ -z "$project_id" ]; then
        local direct_url="https://api.vercel.com/v9/projects/$project_name"
        if [ -n "$team_id" ]; then
            direct_url="$direct_url?teamId=$team_id"
        fi
        local direct_response=$(curl -s -H "Authorization: Bearer $token" "$direct_url")
        project_id=$(echo "$direct_response" | jq -r '.id // empty')
    fi
    
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
        if [ -n "$DEBUG_VERCEL" ]; then
            echo "    Attempted to find project: $project in team: $VERCEL_TEAM_ID" >&2
        fi
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        return
    fi
    
    # Build URL with optional team parameter
    local url="https://api.vercel.com/v10/projects/$project_id/env?upsert=true"
    if [ -n "$VERCEL_TEAM_ID" ]; then
        url="$url&teamId=$VERCEL_TEAM_ID"
    fi
    
    # Use Vercel API to set environment variable
    local response=$(curl -s -X POST \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{\"key\":\"$secret_name\",\"value\":\"$secret_value\",\"type\":\"encrypted\",\"target\":[\"$environment\"]}" \
        "$url")
    
    # Check if request was successful
    if echo "$response" | grep -q '"created"' || echo "$response" | grep -q '"updated"'; then
        echo -e "${GREEN}  ✓ Vercel ($project - $environment): $secret_name${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}  ✗ Vercel ($project - $environment): $secret_name${NC}"
        if [ -n "$DEBUG_VERCEL" ]; then
            echo "    Response: $response" >&2
        fi
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
    fi
}

# ============================================================
# Deploy Shared Secrets (Both Preview and Production)
# ============================================================

echo -e "${BLUE}0. Deploying Shared Secrets (Preview + Production)${NC}"
echo -e "${YELLOW}Vercel Shared Environment Variables:${NC}"

# Deploy VITE_* and Next.js variables from .env.shared to both environments
if [ -f "$SECRETS_DIR/.env.shared" ]; then
    while IFS='=' read -r key value; do
        # Deploy VITE_* variables to all Vite-based projects
        if [[ "$key" =~ ^VITE_ ]]; then
            # Deploy to preview environment
            deploy_vercel_secret "$key" "$value" "$VERCEL_PROJECT_DASHBOARD" "preview"
            deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
            deploy_vercel_secret "$key" "$value" "$VERCEL_ADMIN_DASHBOARD" "preview"
            # Deploy to production environment
            deploy_vercel_secret "$key" "$value" "$VERCEL_PROJECT_DASHBOARD" "production"
            deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
            deploy_vercel_secret "$key" "$value" "$VERCEL_ADMIN_DASHBOARD" "production"
            
            # Also deploy as NEXT_PUBLIC_* for Next.js app (partnership dashboard)
            if [[ "$key" == "VITE_SUPABASE_URL" ]]; then
                deploy_vercel_secret "NEXT_PUBLIC_SUPABASE_URL" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
                deploy_vercel_secret "NEXT_PUBLIC_SUPABASE_URL" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
            elif [[ "$key" == "VITE_SUPABASE_PUBLISHABLE_KEY" ]] || [[ "$key" == "VITE_SUPABASE_ANON_KEY" ]]; then
                deploy_vercel_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
                deploy_vercel_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
            elif [[ "$key" == "VITE_STRIPE_PUBLISHABLE_KEY" ]]; then
                deploy_vercel_secret "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
                deploy_vercel_secret "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
            fi
        fi
        # Deploy NEXT_PUBLIC_* variables for Next.js apps (partnership dashboard)
        if [[ "$key" =~ ^NEXT_PUBLIC_ ]]; then
            deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
            deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
        fi
        # Deploy server-side env vars for Next.js apps (partnership dashboard)
        # Only deploy known server-side vars to avoid deploying everything
        if [[ "$key" == "JOSHUA_PROJECT_API_KEY" ]]; then
            deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
            deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
        fi
    done < <(parse_env_file "$SECRETS_DIR/.env.shared")
else
    echo -e "${YELLOW}  ⊘ .env.shared not found, skipping shared secrets${NC}"
fi
echo ""

# ============================================================
# Deploy Development Secrets (Preview Environment)
# ============================================================

echo -e "${BLUE}1. Deploying Development Secrets (Preview)${NC}"
echo -e "${YELLOW}Vercel Preview Environment:${NC}"

# Get project ID for derivations
DEV_PROJECT_ID=$(get_env_value "SUPABASE_PROJECT_ID" "$SECRETS_DIR/.env.development" || true)

# Deploy derived VITE variables
if [ -n "$DEV_PROJECT_ID" ]; then
    VITE_SUPABASE_URL=$(derive_supabase_url "$DEV_PROJECT_ID")
    deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PROJECT_DASHBOARD" "preview"
    deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
    deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_ADMIN_DASHBOARD" "preview"
    # Also deploy as NEXT_PUBLIC_* for Next.js app (partnership dashboard)
    deploy_vercel_secret "NEXT_PUBLIC_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
else
    # Try to get VITE_SUPABASE_URL directly from env file as fallback
    VITE_SUPABASE_URL=$(get_env_value "VITE_SUPABASE_URL" "$SECRETS_DIR/.env.development" || true)
    if [ -n "$VITE_SUPABASE_URL" ]; then
        deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PROJECT_DASHBOARD" "preview"
        deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
        deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_ADMIN_DASHBOARD" "preview"
        deploy_vercel_secret "NEXT_PUBLIC_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
    else
        echo -e "${YELLOW}  ⊘ Skipping VITE_SUPABASE_URL (SUPABASE_PROJECT_ID not found in .env.development)${NC}"
    fi
fi

# Deploy VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY from base variables
# Try SUPABASE_ANON_KEY first, then SUPABASE_PUBLISHABLE_KEY, then VITE_SUPABASE_ANON_KEY as fallback
VITE_SUPABASE_ANON_KEY=$(get_env_value "SUPABASE_ANON_KEY" "$SECRETS_DIR/.env.development" || true)
if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    VITE_SUPABASE_ANON_KEY=$(get_env_value "SUPABASE_PUBLISHABLE_KEY" "$SECRETS_DIR/.env.development" || true)
fi
if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    # Try to get VITE_SUPABASE_ANON_KEY directly from env file as fallback
    VITE_SUPABASE_ANON_KEY=$(get_env_value "VITE_SUPABASE_ANON_KEY" "$SECRETS_DIR/.env.development" || true)
fi
if [ -n "$VITE_SUPABASE_ANON_KEY" ]; then
    # Deploy as VITE_SUPABASE_PUBLISHABLE_KEY (for Vite apps)
    deploy_vercel_secret "VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_PROJECT_DASHBOARD" "preview"
    deploy_vercel_secret "VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
    deploy_vercel_secret "VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_ADMIN_DASHBOARD" "preview"
    # Also deploy as VITE_SUPABASE_ANON_KEY (alternative name)
    deploy_vercel_secret "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_PROJECT_DASHBOARD" "preview"
    deploy_vercel_secret "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
    deploy_vercel_secret "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_ADMIN_DASHBOARD" "preview"
    # Also deploy as NEXT_PUBLIC_* for Next.js app (partnership dashboard)
    deploy_vercel_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
else
    echo -e "${YELLOW}  ⊘ Skipping VITE_SUPABASE_ANON_KEY (not found in .env.development)${NC}"
fi

# Deploy VITE_STRIPE_PUBLISHABLE_KEY from STRIPE_PUBLISHABLE_KEY
VITE_STRIPE_PUBLISHABLE_KEY=$(get_env_value "STRIPE_PUBLISHABLE_KEY" "$SECRETS_DIR/.env.development" || true)
if [ -z "$VITE_STRIPE_PUBLISHABLE_KEY" ]; then
    # Try to get VITE_STRIPE_PUBLISHABLE_KEY directly from env file as fallback
    VITE_STRIPE_PUBLISHABLE_KEY=$(get_env_value "VITE_STRIPE_PUBLISHABLE_KEY" "$SECRETS_DIR/.env.development" || true)
fi
if [ -n "$VITE_STRIPE_PUBLISHABLE_KEY" ]; then
    deploy_vercel_secret "VITE_STRIPE_PUBLISHABLE_KEY" "$VITE_STRIPE_PUBLISHABLE_KEY" "$VERCEL_PROJECT_DASHBOARD" "preview"
    deploy_vercel_secret "VITE_STRIPE_PUBLISHABLE_KEY" "$VITE_STRIPE_PUBLISHABLE_KEY" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
    deploy_vercel_secret "VITE_STRIPE_PUBLISHABLE_KEY" "$VITE_STRIPE_PUBLISHABLE_KEY" "$VERCEL_ADMIN_DASHBOARD" "preview"
    # Also deploy as NEXT_PUBLIC_* for Next.js app (partnership dashboard)
    deploy_vercel_secret "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$VITE_STRIPE_PUBLISHABLE_KEY" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
else
    echo -e "${YELLOW}  ⊘ Skipping VITE_STRIPE_PUBLISHABLE_KEY (not found in .env.development)${NC}"
fi

# Deploy any other VITE_* variables that might exist (for backward compatibility)
while IFS='=' read -r key value; do
    # Only deploy Vercel-specific secrets (VITE_*) that aren't already derived
    if [[ "$key" =~ ^VITE_ ]] && [[ ! "$key" =~ ^(VITE_SUPABASE_URL|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_STRIPE_PUBLISHABLE_KEY)$ ]]; then
        deploy_vercel_secret "$key" "$value" "$VERCEL_PROJECT_DASHBOARD" "preview"
        deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
        deploy_vercel_secret "$key" "$value" "$VERCEL_ADMIN_DASHBOARD" "preview"
    fi
    # Deploy NEXT_PUBLIC_* variables for Next.js apps (partnership dashboard)
    if [[ "$key" =~ ^NEXT_PUBLIC_ ]]; then
        deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
    fi
    # Deploy server-side env vars for Next.js apps (partnership dashboard)
    # Only deploy known server-side vars to avoid deploying everything
    if [[ "$key" == "JOSHUA_PROJECT_API_KEY" ]]; then
        deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
    fi
done < <(parse_env_file "$SECRETS_DIR/.env.development")
echo ""

# ============================================================
# Deploy Production Secrets
# ============================================================

echo -e "${BLUE}2. Deploying Production Secrets${NC}"
echo -e "${YELLOW}Vercel Production Environment:${NC}"

# Get project ID for derivations
PROD_PROJECT_ID=$(get_env_value "SUPABASE_PROJECT_ID" "$SECRETS_DIR/.env.production" || true)

# Deploy derived VITE variables
if [ -n "$PROD_PROJECT_ID" ]; then
    VITE_SUPABASE_URL=$(derive_supabase_url "$PROD_PROJECT_ID")
    deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PROJECT_DASHBOARD" "production"
    deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
    deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_ADMIN_DASHBOARD" "production"
    # Also deploy as NEXT_PUBLIC_* for Next.js app (partnership dashboard)
    deploy_vercel_secret "NEXT_PUBLIC_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
else
    # Try to get VITE_SUPABASE_URL directly from env file as fallback
    VITE_SUPABASE_URL=$(get_env_value "VITE_SUPABASE_URL" "$SECRETS_DIR/.env.production" || true)
    if [ -n "$VITE_SUPABASE_URL" ]; then
        deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PROJECT_DASHBOARD" "production"
        deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
        deploy_vercel_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_ADMIN_DASHBOARD" "production"
        deploy_vercel_secret "NEXT_PUBLIC_SUPABASE_URL" "$VITE_SUPABASE_URL" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
    else
        echo -e "${YELLOW}  ⊘ Skipping VITE_SUPABASE_URL (SUPABASE_PROJECT_ID not found in .env.production)${NC}"
    fi
fi

# Deploy VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY from base variables
# Try SUPABASE_ANON_KEY first, then SUPABASE_PUBLISHABLE_KEY, then VITE_SUPABASE_ANON_KEY as fallback
VITE_SUPABASE_ANON_KEY=$(get_env_value "SUPABASE_ANON_KEY" "$SECRETS_DIR/.env.production" || true)
if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    VITE_SUPABASE_ANON_KEY=$(get_env_value "SUPABASE_PUBLISHABLE_KEY" "$SECRETS_DIR/.env.production" || true)
fi
if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    # Try to get VITE_SUPABASE_ANON_KEY directly from env file as fallback
    VITE_SUPABASE_ANON_KEY=$(get_env_value "VITE_SUPABASE_ANON_KEY" "$SECRETS_DIR/.env.production" || true)
fi
if [ -n "$VITE_SUPABASE_ANON_KEY" ]; then
    # Deploy as VITE_SUPABASE_PUBLISHABLE_KEY (for Vite apps)
    deploy_vercel_secret "VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_PROJECT_DASHBOARD" "production"
    deploy_vercel_secret "VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
    deploy_vercel_secret "VITE_SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_ADMIN_DASHBOARD" "production"
    # Also deploy as VITE_SUPABASE_ANON_KEY (alternative name)
    deploy_vercel_secret "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_PROJECT_DASHBOARD" "production"
    deploy_vercel_secret "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
    deploy_vercel_secret "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_ADMIN_DASHBOARD" "production"
    # Also deploy as NEXT_PUBLIC_* for Next.js app (partnership dashboard)
    deploy_vercel_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
else
    echo -e "${YELLOW}  ⊘ Skipping VITE_SUPABASE_ANON_KEY (not found in .env.production)${NC}"
fi

# Deploy VITE_STRIPE_PUBLISHABLE_KEY from STRIPE_PUBLISHABLE_KEY
VITE_STRIPE_PUBLISHABLE_KEY=$(get_env_value "STRIPE_PUBLISHABLE_KEY" "$SECRETS_DIR/.env.production" || true)
if [ -z "$VITE_STRIPE_PUBLISHABLE_KEY" ]; then
    # Try to get VITE_STRIPE_PUBLISHABLE_KEY directly from env file as fallback
    VITE_STRIPE_PUBLISHABLE_KEY=$(get_env_value "VITE_STRIPE_PUBLISHABLE_KEY" "$SECRETS_DIR/.env.production" || true)
fi
if [ -n "$VITE_STRIPE_PUBLISHABLE_KEY" ]; then
    deploy_vercel_secret "VITE_STRIPE_PUBLISHABLE_KEY" "$VITE_STRIPE_PUBLISHABLE_KEY" "$VERCEL_PROJECT_DASHBOARD" "production"
    deploy_vercel_secret "VITE_STRIPE_PUBLISHABLE_KEY" "$VITE_STRIPE_PUBLISHABLE_KEY" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
    deploy_vercel_secret "VITE_STRIPE_PUBLISHABLE_KEY" "$VITE_STRIPE_PUBLISHABLE_KEY" "$VERCEL_ADMIN_DASHBOARD" "production"
    # Also deploy as NEXT_PUBLIC_* for Next.js app (partnership dashboard)
    deploy_vercel_secret "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$VITE_STRIPE_PUBLISHABLE_KEY" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
else
    echo -e "${YELLOW}  ⊘ Skipping VITE_STRIPE_PUBLISHABLE_KEY (not found in .env.production)${NC}"
fi

# Deploy any other VITE_* variables that might exist (for backward compatibility)
while IFS='=' read -r key value; do
    # Only deploy Vercel-specific secrets (VITE_*) that aren't already derived
    if [[ "$key" =~ ^VITE_ ]] && [[ ! "$key" =~ ^(VITE_SUPABASE_URL|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_STRIPE_PUBLISHABLE_KEY)$ ]]; then
        deploy_vercel_secret "$key" "$value" "$VERCEL_PROJECT_DASHBOARD" "production"
        deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
        deploy_vercel_secret "$key" "$value" "$VERCEL_ADMIN_DASHBOARD" "production"
    fi
    # Deploy NEXT_PUBLIC_* variables for Next.js apps (partnership dashboard)
    if [[ "$key" =~ ^NEXT_PUBLIC_ ]]; then
        deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
    fi
    # Deploy server-side env vars for Next.js apps (partnership dashboard)
    # Only deploy known server-side vars to avoid deploying everything
    if [[ "$key" == "JOSHUA_PROJECT_API_KEY" ]]; then
        deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
    fi
done < <(parse_env_file "$SECRETS_DIR/.env.production")
echo ""

# Print summary
print_summary
exit $?

