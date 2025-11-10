#!/bin/bash

# ============================================================
# Master Secret Deployment Script
# Orchestrates deployment to GitHub, Vercel, and Supabase
# ============================================================

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Source common utilities
source "$SCRIPT_DIR/common.sh"

echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}Master Secret Deployment Script${NC}"
echo -e "${BLUE}Deploying to: GitHub Actions, Vercel, and Supabase${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo ""

# Track overall success
OVERALL_SUCCESS=0
OVERALL_FAILURES=0

# ============================================================
# 1. Deploy to GitHub Actions
# ============================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Step 1/3: GitHub Actions Deployment                 ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Run GitHub deployment and capture output
GITHUB_OUTPUT=$(bash "$SCRIPT_DIR/deploy-github-secrets.sh" 2>&1)
GITHUB_EXIT=$?

# Display the output
echo "$GITHUB_OUTPUT"

# Extract counts from output (look for "Successful: X" and "Failed: Y")
GITHUB_SUCCESS=$(echo "$GITHUB_OUTPUT" | grep "Successful:" | tail -1 | grep -oE '[0-9]+' | head -1 || echo "0")
GITHUB_FAILURES=$(echo "$GITHUB_OUTPUT" | grep "Failed:" | tail -1 | grep -oE '[0-9]+' | head -1 || echo "0")

if [ $GITHUB_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ GitHub deployment completed successfully${NC}"
else
    echo -e "${RED}✗ GitHub deployment had failures${NC}"
fi
OVERALL_SUCCESS=$((OVERALL_SUCCESS + GITHUB_SUCCESS))
OVERALL_FAILURES=$((OVERALL_FAILURES + GITHUB_FAILURES))

echo ""
echo ""

# ============================================================
# 2. Deploy to Vercel
# ============================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Step 2/3: Vercel Deployment                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Run Vercel deployment and capture output
VERCEL_OUTPUT=$(bash "$SCRIPT_DIR/deploy-vercel-secrets.sh" 2>&1)
VERCEL_EXIT=$?

# Display the output
echo "$VERCEL_OUTPUT"

# Extract counts from output
VERCEL_SUCCESS=$(echo "$VERCEL_OUTPUT" | grep "Successful:" | tail -1 | grep -oE '[0-9]+' | head -1 || echo "0")
VERCEL_FAILURES=$(echo "$VERCEL_OUTPUT" | grep "Failed:" | tail -1 | grep -oE '[0-9]+' | head -1 || echo "0")

if [ $VERCEL_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ Vercel deployment completed successfully${NC}"
else
    echo -e "${RED}✗ Vercel deployment had failures${NC}"
fi
OVERALL_SUCCESS=$((OVERALL_SUCCESS + VERCEL_SUCCESS))
OVERALL_FAILURES=$((OVERALL_FAILURES + VERCEL_FAILURES))

echo ""
echo ""

# ============================================================
# 3. Deploy to Supabase Edge Functions
# ============================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Step 3/3: Supabase Edge Functions Deployment        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Run Supabase deployment and capture output
SUPABASE_OUTPUT=$(bash "$SCRIPT_DIR/deploy-supabase-secrets.sh" 2>&1)
SUPABASE_EXIT=$?

# Display the output
echo "$SUPABASE_OUTPUT"

# Extract counts from output
SUPABASE_SUCCESS=$(echo "$SUPABASE_OUTPUT" | grep "Successful:" | tail -1 | grep -oE '[0-9]+' | head -1 || echo "0")
SUPABASE_FAILURES=$(echo "$SUPABASE_OUTPUT" | grep "Failed:" | tail -1 | grep -oE '[0-9]+' | head -1 || echo "0")

if [ $SUPABASE_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ Supabase deployment completed successfully${NC}"
else
    echo -e "${RED}✗ Supabase deployment had failures${NC}"
fi
OVERALL_SUCCESS=$((OVERALL_SUCCESS + SUPABASE_SUCCESS))
OVERALL_FAILURES=$((OVERALL_FAILURES + SUPABASE_FAILURES))

echo ""
echo ""

# ============================================================
# Final Summary
# ============================================================

echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}Final Deployment Summary${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo ""

echo -e "${YELLOW}Breakdown by Platform:${NC}"
echo -e "  GitHub Actions:      ${GREEN}${GITHUB_SUCCESS:-0} successful${NC} / ${RED}${GITHUB_FAILURES:-0} failed${NC}"
echo -e "  Vercel:              ${GREEN}${VERCEL_SUCCESS:-0} successful${NC} / ${RED}${VERCEL_FAILURES:-0} failed${NC}"
echo -e "  Supabase:            ${GREEN}${SUPABASE_SUCCESS:-0} successful${NC} / ${RED}${SUPABASE_FAILURES:-0} failed${NC}"
echo ""

echo -e "${YELLOW}Overall Total:${NC}"
echo -e "  ${GREEN}Successful: $OVERALL_SUCCESS${NC}"
echo -e "  ${RED}Failed: $OVERALL_FAILURES${NC}"
echo ""

if [ $OVERALL_FAILURES -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ All secrets deployed successfully across all      ║${NC}"
    echo -e "${GREEN}║    platforms!                                         ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ Some deployments failed. Please check the logs    ║${NC}"
    echo -e "${RED}║    above for details.                                 ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
