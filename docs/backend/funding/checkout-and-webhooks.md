# Funding: Checkout, Webhooks, and CRM Intake

## Endpoints

- Edge Function `list-available-languages` [GET]
  - Query: `status` ('available' default), `limit`, `offset`
  - Returns: `{ items: Array<{id, language_entity_id, language_name, status, estimated_budget_cents, currency_code, translators_ready, available_since, notes, funding_received_usd_cents}>, count, nextOffset }`

- Edge Function `create-sponsorship-checkout` [POST]
  - Body:
    ```json
    {
      "purpose": "operations" | "adoption",
      "adoptionIds": ["<uuid>", "<uuid>"] ,
      "donor": {"firstName":"A","lastName":"B","email":"a@b.com","phone":""},
      "mode": "card" | "bank_transfer",
      "donateOnlyCents": 5000
    }
    ```
  - Behavior:
    - Creates/Finds Stripe Customer
    - For adoption: computes deposit (percent) and per-language monthly recurring (remaining / months)
    - Creates one-time PaymentIntent (deposit or donateOnly) and optional subscription (card only)
    - Inserts `sponsorships` row (status 'active' for card, 'pledged' for bank transfer)
  - Response:
    ```json
    {
      "customerId": "cus_...",
      "depositClientSecret": "pi_secret_...", // may be null
      "subscriptionId": "sub_...",            // may be null
      "adoptionSummaries": [{"id":"...","name":"...","depositCents":0,"recurringCents":0}]
    }
    ```

- Edge Function `stripe-webhook` [POST]
  - Configure Stripe webhook to this endpoint with events:
    - `payment_intent.succeeded`, `invoice.paid`, `charge.refunded`, `customer.subscription.updated`
  - Effect:
    - Upserts `stripe_events`
    - Inserts `contributions` for one-time and subscription invoices (minimal linking; extend via metadata later)

- Edge Function `crm-lead-intake` [POST]
  - Body: `{ firstName, lastName, email, phone?, source? }`
  - Non-blocking: sends lead to HubSpot (requires `HUBSPOT_PRIVATE_APP_TOKEN`)

## Configuration

- Table `funding_settings` (singleton):
  - `deposit_percent` (default 0.20)
  - `recurring_months` (default 12)
- Overrides per `language_adoptions`:
  - `deposit_percent` (nullable)
  - `recurring_months` (nullable)
- Environment variables:
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `HUBSPOT_PRIVATE_APP_TOKEN`

## Frontend flows

### Operations donation
1. Call `crm-lead-intake` with donor details (non-blocking)
2. Call `create-sponsorship-checkout` with `{purpose:'operations', mode:'card'|'bank_transfer', donateOnlyCents}`
3. If `depositClientSecret` present (card), confirm PaymentIntent via Stripe.js
4. On success, optionally prompt for account creation

### Adopt a language
1. Fetch languages via `list-available-languages`
2. Donor selects one or more languages
3. Call `crm-lead-intake` with donor details (non-blocking)
4. Call `create-sponsorship-checkout` with `{purpose:'adoption', adoptionIds:[...], mode:'card'|'bank_transfer'}`
5. Card mode:
   - Confirm PaymentIntent (deposit)
   - If `subscriptionId` present, handle pending subscription state (Stripe-hosted updates as needed)
6. Bank transfer mode:
   - Show bank instructions (Stripe Customer Balance or manual)
7. On success, force account creation (required for sponsorship)

### Stripe.js example (card)
```ts
import { loadStripe } from '@stripe/stripe-js';
const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PK);
const res = await fetch('/functions/v1/create-sponsorship-checkout', { method:'POST', body: JSON.stringify(payload) });
const { depositClientSecret } = await res.json();
if (depositClientSecret) {
  const { error } = await stripe!.confirmCardPayment(depositClientSecret);
  if (error) { /* show error */ }
}
```

## Admin/Backoffice
- After projects exist, use an admin-only allocation flow to write `sponsorship_allocations`.
- Webhook inserts `contributions`. Extend to map Stripe metadata to `sponsorship_id` and `language_adoption_id` for direct linkage.



