# Edge Functions Case Convention Audit

**Date**: November 3, 2025  
**Status**: ✅ All functions reviewed and compliant

## Summary

All edge functions have been audited for proper camelCase/snake_case conventions. The following best practices are being followed:

### API Layer (External-facing)

- **Request bodies**: camelCase (JavaScript/TypeScript convention)
- **Response bodies**: camelCase (JavaScript/TypeScript convention)
- **Query parameters**: Can be either, but prefer camelCase for consistency

### Database Layer (Internal)

- **Table names**: snake_case (PostgreSQL convention)
- **Column names**: snake_case (PostgreSQL convention)
- **Database queries**: Always use snake_case

## Function Review

### ✅ Fully Compliant Functions

#### 1. `calculate-adoption-costs`

- **Status**: ✅ COMPLIANT (Updated to use `dbToApi()`)
- **Request**: `adoptionIds` (camelCase)
- **Response**: Uses `dbToApi()` transformation
- **Pattern**: Constructs response in snake_case, transforms to camelCase

#### 2. `create-donation-checkout`

- **Status**: ✅ COMPLIANT
- **Request**: `amountCents`, `cadence`, `mode` (all camelCase)
- **Response**: `clientSecret`, `customerId`, `sponsorshipId` (all camelCase)
- **Database**: Uses snake_case for all DB operations

#### 3. `create-adoption-checkout`

- **Status**: ✅ COMPLIANT
- **Request**: `adoptionIds`, `partnerOrgId`, `newPartnerOrg.isPublic` (all camelCase)
- **Response**: `clientSecret`, `customerId`, `partnerOrgId` (all camelCase)
- **Database**: Uses snake_case for all DB operations

#### 4. `search-partner-orgs`

- **Status**: ✅ COMPLIANT (Uses `dbToApi()`)
- **Request**: `query`, `limit` (camelCase)
- **Response**: Transforms DB results using `dbToApi()` → `similarityScore` (camelCase)

#### 5. `project-financials`

- **Status**: ✅ COMPLIANT (Uses `dbToApi()`)
- **Request**: Query param `project_id` (can remain snake_case for URL params)
- **Response**: Transforms all DB fields using `dbToApi()`

#### 6. `crm-lead-intake`

- **Status**: ✅ COMPLIANT
- **Request**: `firstName`, `lastName`, `email`, `phone` (all camelCase)
- **Response**: Simple success message
- **Note**: Internal CRM mapping uses snake_case for HubSpot API

### ✅ Internal/System Functions (Less Critical)

#### 7. `stripe-webhook`

- **Status**: ✅ ACCEPTABLE
- **Type**: Webhook handler (Stripe → Database)
- **Note**: Directly processes Stripe events and writes to DB with snake_case
- **Reason**: No public API surface, internal processing only

#### 8. `expire-bank-transfers`

- **Status**: ✅ ACCEPTABLE
- **Type**: Cron job (Database → Database)
- **Note**: Pure internal function, works directly with DB snake_case
- **Reason**: No public API surface, scheduled task only

#### 9. `get-upload-urls-by-id`

- **Status**: ✅ COMPLIANT
- **Request**: `mediaFileIds`, `imageIds`, `expirationHours` (camelCase)
- **Response**: `uploadUrl`, `expiresIn`, `objectKey` (camelCase)
- **Database writes**: Uses snake_case (`object_key`, `storage_provider`)

#### 10. `get-download-urls-by-id`

- **Status**: ✅ COMPLIANT
- **Request**: `mediaFileIds`, `imageIds`, `expirationHours` (camelCase)
- **Response**: `expiresIn` (camelCase), URLs in Record
- **Database reads**: Uses snake_case

#### 11. `ingest-analytics`

- **Status**: ✅ ACCEPTABLE
- **Type**: Mobile SDK endpoint
- **Note**: Complex analytics payload, uses snake_case in some places for device metadata
- **Reason**: Matches mobile SDK conventions, not a user-facing web API

#### 12. `refresh-progress`

- **Status**: ✅ ACCEPTABLE (Review needed if exposed publicly)
- **Type**: Background job or authenticated endpoint
- **Note**: Needs review if this becomes a public API

#### 13. `close-session`

- **Status**: ✅ ACCEPTABLE
- **Type**: Analytics endpoint
- **Note**: Internal session management

### ❌ Deprecated/Removed

#### ~~`create-sponsorship-checkout`~~

- **Status**: 🗑️ DELETED
- **Reason**: Deprecated, replaced by `create-donation-checkout` and `create-adoption-checkout`
- **Actions Taken**:
  - Deleted backend function file
  - Removed frontend API function definition

## Best Practices Applied

### 1. Case Transformation Utility Pattern

```typescript
import { dbToApi } from '../_shared/case-utils.ts';

// Construct response in snake_case (DB convention)
const response = {
  deposit_total_cents: totalDeposit,
  monthly_total_cents: totalMonthly,
  recurring_months: globalMonths,
};

// Transform to camelCase for API response
return createSuccessResponse(dbToApi(response));
```

### 2. Request Interface Pattern

```typescript
// ✅ GOOD: camelCase in API interfaces
interface RequestBody {
  amountCents: number;
  partnerOrgId?: string;
  newPartnerOrg?: {
    isPublic: boolean;
  };
}
```

### 3. Database Operation Pattern

```typescript
// ✅ GOOD: snake_case for DB operations
await supabase.from('sponsorships').insert({
  partner_org_id: partnerOrgId,
  pledge_one_time_cents: amountCents,
  stripe_customer_id: customer.id,
});
```

## Functions That Should Use Transformation Utilities

The following functions would benefit from using `dbToApi()` if they return database records directly:

1. ✅ `calculate-adoption-costs` - **UPDATED**
2. ✅ `search-partner-orgs` - **UPDATED**
3. ✅ `project-financials` - **UPDATED**

## Exceptions & Special Cases

### When to NOT use transformation:

1. **Webhooks** (`stripe-webhook`)
   - External service → Database only
   - No public API response needed

2. **Cron Jobs** (`expire-bank-transfers`, `refresh-progress`)
   - Internal system tasks
   - Work directly with DB, no API contract

3. **Analytics Ingestion** (`ingest-analytics`)
   - Mobile SDK conventions may differ
   - High-volume endpoint, transformation overhead matters

## Testing Checklist

After deploying these changes, test:

- [ ] Language adoption cost calculation (should show proper $ amounts, not NaN)
- [ ] Monthly donation flow (should work with `amountCents`)
- [ ] One-time donation flow
- [ ] Language adoption with individual donor
- [ ] Language adoption with existing organization (search should show `similarityScore`)
- [ ] Language adoption with new organization (`isPublic` field)
- [ ] Project financials endpoint (if publicly accessible)

## Future Guidelines

### For New Edge Functions

1. **Always use camelCase in API interfaces** (request/response)
2. **Always use snake_case for database operations**
3. **Use `dbToApi()` when returning database records**
4. **Use `apiToDb()` when converting request data for database writes** (optional, depends on complexity)

### Example Template

```typescript
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';
import { dbToApi } from '../_shared/case-utils.ts';

interface RequestBody {
  myField: string; // camelCase
  anotherField: number; // camelCase
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  try {
    const { myField, anotherField } = (await req.json()) as RequestBody;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Database operations use snake_case
    const { data, error } = await supabase
      .from('my_table')
      .select('*')
      .eq('my_field', myField);

    if (error) {
      return createErrorResponse(error.message, 500);
    }

    // Transform DB results to camelCase for API response
    return createSuccessResponse(dbToApi(data));
  } catch (e) {
    return createErrorResponse((e as Error).message, 500);
  }
});
```

## Deployment Notes

Functions updated and ready for deployment:

1. ✅ `calculate-adoption-costs` - **DEPLOY WITH**: `--no-verify-jwt`
2. ✅ `search-partner-orgs` - **DEPLOY WITH**: `--no-verify-jwt`
3. ✅ `project-financials` - **DEPLOY WITH**: Normal deployment (requires auth)

Deleted:

- ✅ `create-sponsorship-checkout` - Removed from codebase

## Conclusion

All edge functions are now following proper case conventions:

- **API contracts**: camelCase (JavaScript/TypeScript standard)
- **Database operations**: snake_case (PostgreSQL standard)
- **Transformation**: Using `dbToApi()` utility for consistency

The codebase is now standardized and maintainable with clear conventions.
