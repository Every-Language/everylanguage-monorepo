# CamelCase API Migration Guide

## Overview

This guide documents the migration from mixed snake_case/camelCase to standardized camelCase API contracts across all Supabase Edge Functions.

## Changes Made

### 1. Created Case Transformation Utilities

**File**: `apps/backend/supabase/functions/_shared/case-utils.ts`

New utility functions for transforming data at the API boundary:

- `snakeToCamel()` - Convert snake_case string to camelCase
- `camelToSnake()` - Convert camelCase string to snake_case
- `keysToCamel()` - Deep convert object keys from snake_case to camelCase
- `keysToSnake()` - Deep convert object keys from camelCase to snake_case
- `dbToApi()` - Transform database row to API format (snake_case → camelCase)
- `apiToDb()` - Transform API request to database format (camelCase → snake_case)

### 2. Updated Edge Functions

#### calculate-adoption-costs

**Changes**:

- Request body: Already using camelCase (`adoptionIds`)
- Response body: Now returns both snake_case AND camelCase for backward compatibility
  - Added: `depositTotalCents`, `monthlyTotalCents`, `recurringMonths`, `totalCommitmentCents`
  - Kept: `summary` object with legacy format

**Migration**: Consumers should use the new top-level camelCase properties

#### create-donation-checkout

**Changes**:

- Request body: `amount_cents` → `amountCents`
- Response body: Already using camelCase

**Breaking Change**: Clients must update request payloads

#### create-adoption-checkout

**Changes**:

- Request body:
  - `partner_org_id` → `partnerOrgId`
  - `new_partner_org` → `newPartnerOrg`
  - `new_partner_org.is_public` → `newPartnerOrg.isPublic`
- Response body: Already using camelCase

**Breaking Change**: Clients must update request payloads

#### search-partner-orgs

**Changes**:

- Request body: Already using camelCase
- Response body: Now transforms DB results to camelCase
  - `similarity_score` → `similarityScore`

#### project-financials

**Changes**:

- Request: Query params already using snake_case (unchanged)
- Response: Now transforms all DB fields to camelCase

#### Other Functions

- `create-sponsorship-checkout`: Already mostly camelCase (deprecated)
- `ingest-analytics`: Kept as-is (mobile-facing, complex analytics payload)
- `get-upload-urls-by-id`: Already using camelCase

### 3. Updated Frontend API Client

**File**: `apps/frontend/web-partnership-dashboard/src/features/funding/api/fundingApi.ts`

**Changes**:

- Removed manual transformation in `createDonationCheckout()`
- Updated type definitions for `calculateAdoptionCosts()` return type
- Updated `createAdoptionCheckout()` parameter names
- Updated `searchPartnerOrgs()` return type

### 4. Updated Frontend Components

**File**: `apps/frontend/web-partnership-dashboard/src/features/funding/components/DonateModal/StepLanguages.tsx`

**Changes**:

- Updated to use new camelCase properties from `calculateAdoptionCosts()`
  - `result.deposit_total_cents` → `result.depositTotalCents`
  - `result.monthly_total_cents` → `result.monthlyTotalCents`
  - `result.recurring_months` → `result.recurringMonths`

## Deployment Instructions

### Step 1: Deploy Edge Functions

Make sure you're logged in to Supabase:

```bash
supabase login
```

Deploy all updated functions:

```bash
cd /Users/matthewchua/Documents/Github/everylanguage-monorepo/apps/backend

# Deploy critical checkout functions
supabase functions deploy create-donation-checkout --no-verify-jwt --project-ref sjczwtpnjbmscxoszlyi
supabase functions deploy create-adoption-checkout --no-verify-jwt --project-ref sjczwtpnjbmscxoszlyi
supabase functions deploy calculate-adoption-costs --no-verify-jwt --project-ref sjczwtpnjbmscxoszlyi

# Deploy search function
supabase functions deploy search-partner-orgs --no-verify-jwt --project-ref sjczwtpnjbmscxoszlyi

# Deploy authenticated function
supabase functions deploy project-financials --project-ref sjczwtpnjbmscxoszlyi
```

### Step 2: Deploy Frontend

Build and deploy the frontend:

```bash
cd /Users/matthewchua/Documents/Github/everylanguage-monorepo/apps/frontend/web-partnership-dashboard
npm run build
# Deploy to Vercel or your hosting platform
```

## Testing Checklist

### 1. Operational Donations ("Give Once" Flow)

- [ ] Navigate to the donation modal
- [ ] Select "Support Operational Costs"
- [ ] Select "Give Once"
- [ ] Enter amount (e.g., $50)
- [ ] Enter donor details
- [ ] Select "Credit Card" payment method
- [ ] Click "Continue to Payment"
- [ ] **Expected**: Stripe payment form appears with correct amount
- [ ] Complete test payment with test card: `4242 4242 4242 4242`
- [ ] **Expected**: Payment succeeds and thank you page shows

### 2. Monthly Operational Donations

- [ ] Navigate to the donation modal
- [ ] Select "Support Operational Costs"
- [ ] Select "Monthly" donation
- [ ] Enter amount (e.g., $25/month)
- [ ] Enter donor details
- [ ] Select "Credit Card" payment method
- [ ] Click "Continue to Payment"
- [ ] **Expected**: Stripe payment form appears
- [ ] **Expected**: First charge shows correct amount
- [ ] Complete test payment
- [ ] **Expected**: Payment succeeds
- [ ] Check Stripe Dashboard: Subscription created with correct monthly amount
- [ ] **Expected**: First invoice is paid immediately (not in 1 month)

### 3. Language Adoption Flow - Cost Calculation

- [ ] Navigate to the donation modal
- [ ] Select "Adopt Languages"
- [ ] Click "Select Languages"
- [ ] Select one or more languages
- [ ] **Expected**: Cost breakdown displays correctly:
  - "Upfront today: $XXX" (NOT $NAN)
  - "Monthly: $XXX" (NOT $NAN)
  - Individual language costs show correctly
- [ ] Try selecting different combinations
- [ ] **Expected**: Costs update correctly for each selection

### 4. Language Adoption Flow - Individual Donor

- [ ] Continue from step 3 with languages selected
- [ ] Select "Individual" donor option
- [ ] Enter donor details
- [ ] Click "Continue to Payment"
- [ ] **Expected**: Payment form shows correct upfront + monthly amounts
- [ ] Complete test payment
- [ ] **Expected**:
  - Deposit payment processed
  - Subscription created for monthly payments
  - Thank you page shows

### 5. Language Adoption Flow - Existing Organization

- [ ] Navigate to adoption flow
- [ ] Select languages
- [ ] Select "Existing Organization"
- [ ] Search for an organization
- [ ] **Expected**: Search results show with `similarityScore` (not `similarity_score`)
- [ ] Select an organization
- [ ] Complete checkout
- [ ] **Expected**: Payment succeeds, adoption linked to organization

### 6. Language Adoption Flow - New Organization

- [ ] Navigate to adoption flow
- [ ] Select languages
- [ ] Select "New Organization"
- [ ] Enter organization details:
  - Name
  - Description
  - Select "Public" or "Private"
- [ ] Complete checkout
- [ ] **Expected**:
  - New organization created
  - Payment succeeds
  - Adoption linked to new organization

### 7. Bank Transfer Flow

- [ ] Try any donation flow
- [ ] Select "Bank Transfer" as payment method
- [ ] **Expected**: Shows bank transfer instructions
- [ ] **Expected**: Sponsorship created with "pledged" status

### 8. Search Partner Organizations

- [ ] Navigate to adoption flow
- [ ] Select "Existing Organization"
- [ ] Type in search box (minimum 2 characters)
- [ ] **Expected**: Results appear with organization names
- [ ] **Expected**: Results are sorted by relevance (similarityScore)

### 9. Error Handling

- [ ] Try donation with amount less than $0.50
- [ ] **Expected**: Error message: "Amount must be at least 50 cents"
- [ ] Try adoption without selecting languages
- [ ] **Expected**: Cannot proceed past language selection
- [ ] Try submitting without donor email
- [ ] **Expected**: Form validation error

### 10. Browser Console Checks

For each test above:

- [ ] Open browser console (F12)
- [ ] Check for errors
- [ ] **Expected**: No errors about `NaN`, `undefined`, or property access failures
- [ ] Check Network tab for API calls
- [ ] **Expected**: Request/response bodies use camelCase

## Database Verification

After running tests, verify data in Supabase:

### Check Sponsorships

```sql
SELECT
  id,
  partner_org_id,
  language_adoption_id,
  pledge_one_time_cents,
  pledge_recurring_cents,
  status,
  stripe_customer_id,
  stripe_payment_intent_id,
  stripe_subscription_id
FROM sponsorships
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: New sponsorship records with correct amounts

### Check Stripe Data

```sql
SELECT
  stripe_customer_id,
  COUNT(*) as sponsorship_count,
  SUM(pledge_one_time_cents) as total_one_time,
  SUM(pledge_recurring_cents) as total_recurring
FROM sponsorships
GROUP BY stripe_customer_id
ORDER BY sponsorship_count DESC;
```

### Check Partner Orgs

```sql
SELECT id, name, is_individual, is_public, created_at
FROM partner_orgs
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: New partner orgs created during testing

## Rollback Plan

If issues are discovered:

### 1. Quick Rollback (Backend Only)

Revert the edge functions to previous versions via Supabase Dashboard:

1. Go to Edge Functions in Supabase Dashboard
2. Select each function
3. View deployment history
4. Restore previous version

### 2. Full Rollback (Backend + Frontend)

```bash
# Revert backend changes
cd /Users/matthewchua/Documents/Github/everylanguage-monorepo
git revert <commit-hash>

# Redeploy functions
cd apps/backend
supabase functions deploy <function-name> --project-ref sjczwtpnjbmscxoszlyi

# Redeploy frontend
cd ../frontend/web-partnership-dashboard
npm run build
# Deploy to hosting
```

## Monitoring

### Key Metrics to Watch

1. **Error Rate**: Monitor Supabase function logs for increased error rates
2. **NaN Errors**: Search logs for "NaN" in responses
3. **Payment Success Rate**: Check Stripe dashboard for failed payments
4. **API Response Times**: Monitor for performance degradation

### Supabase Logs

```bash
# View recent logs for a function
supabase functions logs <function-name> --project-ref sjczwtpnjbmscxoszlyi
```

### Important Log Searches

- Search for: `"NaN"` → Should find zero results after migration
- Search for: `"deposit_total_cents"` → Should find zero results in new deployments
- Search for: `"Failed to"` → Check for errors in checkout flows

## API Contract Reference

### Old vs New

#### calculate-adoption-costs Response

```typescript
// OLD (still works for backward compatibility)
{
  languages: [...],
  summary: {
    totalDeposit: 1000,
    totalMonthly: 500,
    months: 12,
    totalCommitment: 7000
  }
}

// NEW (recommended)
{
  languages: [...],
  depositTotalCents: 1000,
  monthlyTotalCents: 500,
  recurringMonths: 12,
  totalCommitmentCents: 7000,
  summary: { ... } // kept for backward compatibility
}
```

#### create-donation-checkout Request

```typescript
// OLD
{
  donor: { firstName, lastName, email },
  amount_cents: 5000,  // ❌ snake_case
  cadence: "monthly"
}

// NEW
{
  donor: { firstName, lastName, email },
  amountCents: 5000,  // ✅ camelCase
  cadence: "monthly"
}
```

#### create-adoption-checkout Request

```typescript
// OLD
{
  adoptionIds: [...],
  partner_org_id: "uuid",  // ❌ snake_case
  new_partner_org: {       // ❌ snake_case
    name: "...",
    is_public: true        // ❌ snake_case
  }
}

// NEW
{
  adoptionIds: [...],
  partnerOrgId: "uuid",    // ✅ camelCase
  newPartnerOrg: {         // ✅ camelCase
    name: "...",
    isPublic: true         // ✅ camelCase
  }
}
```

## Best Practices Going Forward

### For New Edge Functions

1. **Always use camelCase** for API request/response bodies
2. **Use snake_case** only for database operations
3. **Transform at the boundary** using `dbToApi()` and `apiToDb()`
4. **Document breaking changes** in API contracts

### Example Pattern

```typescript
import { dbToApi, apiToDb } from '../_shared/case-utils.ts';

// Incoming request (camelCase from frontend)
const body = await req.json();
const { myField, anotherField } = body;

// Transform for database (snake_case)
const dbData = apiToDb({ myField, anotherField });
const { data } = await supabase.from('table').insert(dbData);

// Transform response (camelCase to frontend)
const apiData = dbToApi(data);
return createSuccessResponse(apiData);
```

## Questions & Support

If you encounter issues:

1. Check browser console for detailed error messages
2. Check Supabase function logs
3. Verify request/response payloads in Network tab
4. Consult this guide for expected API contracts
