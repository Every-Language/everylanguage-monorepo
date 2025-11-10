#!/bin/bash

# ============================================================
# Common Utilities for Secret Deployment Scripts
# Shared functions, colors, and utilities
# ============================================================

# Colors for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export NC='\033[0m' # No Color

# Counters (can be imported by other scripts)
export SUCCESS_COUNT=0
export FAILURE_COUNT=0
export TOTAL_COUNT=0

# Function to parse .env file
parse_env_file() {
    local file=$1
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip empty lines and comments
        [[ -z "$key" || "$key" =~ ^#.*$ ]] && continue
        # Remove leading/trailing whitespace and quotes
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        echo "$key=$value"
    done < "$file"
}

# Function to check if a command exists
check_command() {
    local cmd=$1
    local install_hint=$2
    
    if ! command -v "$cmd" &> /dev/null; then
        echo -e "${RED}❌ $cmd is not installed${NC}"
        if [ -n "$install_hint" ]; then
            echo -e "${YELLOW}$install_hint${NC}"
        fi
        return 1
    fi
    return 0
}

# Function to check if .env file exists
check_env_file() {
    local file=$1
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ $file not found${NC}"
        return 1
    fi
    return 0
}

# Function to get a value from an env file
get_env_value() {
    local key=$1
    local env_file=$2
    while IFS='=' read -r k v; do
        [[ -z "$k" || "$k" =~ ^#.*$ ]] && continue
        k=$(echo "$k" | xargs)
        if [[ "$k" == "$key" ]]; then
            echo "$v" | xargs | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
            return 0
        fi
    done < "$env_file"
    return 1
}

# Function to derive Supabase URL from project ID
derive_supabase_url() {
    local project_id=$1
    if [ -z "$project_id" ]; then
        return 1
    fi
    echo "https://${project_id}.supabase.co"
}

# Function to derive Supabase DB URL from project ID and password
derive_supabase_db_url() {
    local project_id=$1
    local password=$2
    if [ -z "$project_id" ] || [ -z "$password" ]; then
        return 1
    fi
    # Note: Password should be URL-encoded, but for simplicity we'll use it as-is
    # If password contains special characters, they should be URL-encoded manually
    echo "postgresql://postgres:${password}@db.${project_id}.supabase.co:5432/postgres"
}

# Function to get secret value with derivation support
get_secret_value() {
    local key=$1
    local env_file=$2
    
    # Get base project ID for derivations
    local project_id=$(get_env_value "SUPABASE_PROJECT_ID" "$env_file")
    
    # Derive SUPABASE_URL from SUPABASE_PROJECT_ID
    if [[ "$key" == "SUPABASE_URL" ]]; then
        if [ -n "$project_id" ]; then
            derive_supabase_url "$project_id"
            return 0
        fi
    fi
    
    # Derive VITE_SUPABASE_URL from SUPABASE_PROJECT_ID
    if [[ "$key" == "VITE_SUPABASE_URL" ]]; then
        if [ -n "$project_id" ]; then
            derive_supabase_url "$project_id"
            return 0
        fi
    fi
    
    # Derive SUPABASE_DB_URL from SUPABASE_PROJECT_ID and SUPABASE_DB_PASSWORD
    if [[ "$key" == "SUPABASE_DB_URL" ]]; then
        local password=$(get_env_value "SUPABASE_DB_PASSWORD" "$env_file")
        if [ -n "$project_id" ] && [ -n "$password" ]; then
            derive_supabase_db_url "$project_id" "$password"
            return 0
        fi
    fi
    
    # Derive VITE_SUPABASE_PUBLISHABLE_KEY from SUPABASE_PUBLISHABLE_KEY
    if [[ "$key" == "VITE_SUPABASE_PUBLISHABLE_KEY" ]]; then
        get_env_value "SUPABASE_PUBLISHABLE_KEY" "$env_file"
        return 0
    fi
    
    # Derive VITE_STRIPE_PUBLISHABLE_KEY from STRIPE_PUBLISHABLE_KEY
    if [[ "$key" == "VITE_STRIPE_PUBLISHABLE_KEY" ]]; then
        get_env_value "STRIPE_PUBLISHABLE_KEY" "$env_file"
        return 0
    fi
    
    # Otherwise, get from env file directly
    get_env_value "$key" "$env_file"
}

# Function to print deployment summary
print_summary() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}Deployment Summary${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo "Total operations: $TOTAL_COUNT"
    
    if [ $FAILURE_COUNT -eq 0 ]; then
        echo -e "${GREEN}All secrets deployed successfully! ✓${NC}"
        return 0
    else
        echo -e "${GREEN}Successful: $SUCCESS_COUNT${NC}"
        echo -e "${RED}Failed: $FAILURE_COUNT${NC}"
        echo ""
        echo -e "${RED}✗ Some secrets failed to deploy. Please check the errors above.${NC}"
        return 1
    fi
}

