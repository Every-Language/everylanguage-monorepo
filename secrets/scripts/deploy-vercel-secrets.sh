#!/bin/bash

# ============================================================
# Vercel Secret Deployment Script
# Deploys secrets to Vercel projects (preview + production)
# ============================================================

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Source common utilities
source "$SCRIPT_DIR/common.sh"

# Vercel configuration
VERCEL_PROJECT_DASHBOARD="omt-project-management-website"
VERCEL_PARTNERSHIP_DASHBOARD="everylanguage-map-portal"
VERCEL_TEAM_ID="matts-projects-04f21572"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Vercel Secret Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check prerequisites
check_command "vercel" "Install with: npm install -g vercel" || exit 1
check_command "jq" "Install with: brew install jq" || exit 1
check_env_file "secrets/.env.development" || exit 1
check_env_file "secrets/.env.production" || exit 1

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
    
    # Debug output
    if [ -n "$DEBUG_VERCEL" ]; then
        echo "DEBUG: project=$project_name, team=$team_id, token_len=${#token}" >&2
    fi
    
    # Use Vercel API to get project info
    local response=$(curl -s -H "Authorization: Bearer $token" \
        "https://api.vercel.com/v9/projects/$project_name?teamId=$team_id")
    
    # Debug output
    if [ -n "$DEBUG_VERCEL" ]; then
        echo "DEBUG: API response length=${#response}" >&2
        echo "DEBUG: API response start=$(echo "$response" | head -c 100)" >&2
    fi
    
    # Extract project ID from response using jq
    local project_id=$(echo "$response" | jq -r '.id // empty')
    
    # Debug output
    if [ -n "$DEBUG_VERCEL" ]; then
        echo "DEBUG: extracted project_id=$project_id" >&2
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

# ============================================================
# Deploy Development Secrets (Preview Environment)
# ============================================================

echo -e "${BLUE}1. Deploying Development Secrets (Preview)${NC}"
echo -e "${YELLOW}Vercel Preview Environment:${NC}"
while IFS='=' read -r key value; do
    # Only deploy Vercel-specific secrets (VITE_*)
    if [[ "$key" =~ ^VITE_ ]]; then
        deploy_vercel_secret "$key" "$value" "$VERCEL_PROJECT_DASHBOARD" "preview"
        deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "preview"
    fi
done < <(parse_env_file "secrets/.env.development")
echo ""

# ============================================================
# Deploy Production Secrets
# ============================================================

echo -e "${BLUE}2. Deploying Production Secrets${NC}"
echo -e "${YELLOW}Vercel Production Environment:${NC}"
while IFS='=' read -r key value; do
    # Only deploy Vercel-specific secrets (VITE_*)
    if [[ "$key" =~ ^VITE_ ]]; then
        deploy_vercel_secret "$key" "$value" "$VERCEL_PROJECT_DASHBOARD" "production"
        deploy_vercel_secret "$key" "$value" "$VERCEL_PARTNERSHIP_DASHBOARD" "production"
    fi
done < <(parse_env_file "secrets/.env.production")
echo ""

# Print summary
print_summary
exit $?

