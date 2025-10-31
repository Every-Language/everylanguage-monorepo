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

# Vercel project names
VERCEL_PROJECT_DASHBOARD="omt-project-management-website"
VERCEL_PARTNERSHIP_DASHBOARD="everylanguage-map-portal"

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

# Function to deploy a secret to Vercel
deploy_vercel_secret() {
    local secret_name=$1
    local secret_value=$2
    local project=$3
    local environment=$4  # "development" or "production"
    
    if [ -z "$secret_value" ]; then
        echo -e "${YELLOW}  ⊘ Skipping $secret_name (empty value)${NC}"
        return
    fi
    
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    
    # Check if secret already exists
    if vercel env ls "$environment" --scope matts-projects-04f21572 2>/dev/null | grep -q "$secret_name"; then
        # Remove existing secret
        echo "$secret_name" | vercel env rm "$secret_name" "$environment" --scope matts-projects-04f21572 --yes 2>/dev/null || true
    fi
    
    # Add new secret
    if echo "$secret_value" | vercel env add "$secret_name" "$environment" --scope matts-projects-04f21572 2>/dev/null; then
        echo -e "${GREEN}  ✓ Vercel ($project - $environment): $secret_name${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}  ✗ Vercel ($project - $environment): $secret_name${NC}"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
    fi
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
    echo -e "  3. Test CI/CD by pushing to a feature branch"
else
    echo -e "${RED}✗ Some secrets failed to deploy. Please check the errors above.${NC}"
    exit 1
fi

