# Finance Domain

The finance system is organized into three layers: business logic, payment provider, and accounting.

## Purpose

This domain manages:

- Donor commitments and allocations
- Payment processing (Stripe integration)
- Financial transactions and accounting
- Project budgets and costs
- Partner organization wallets
- Currency conversion

## Business Logic Layer

### `donations`

Central table for all donor commitments. Tracks intent (language, region, operation), amount, payment method, and status.

### `donation_allocations`

How donations are allocated to projects or operations. Supports time-based effective periods.

### `operations`

Operational funding categories (travel, legal, servers, etc.). Public-facing categories donors can fund.

### `operation_costs`

Costs associated with operations. Used for budgeting and reporting.

### `project_budget_costs`

Costs associated with projects. Tracks budget vs actual spending.

### `funding_settings`

System-wide funding configuration (deposit percentages, recurring months).

### `partner_wallets`

Partner organization wallets for managing their funds.

### `partner_wallet_transactions`

Transactions affecting partner wallets.

## Payment Provider Layer

### `payment_attempts`

Attempts to process payments (successful or failed). Links to Stripe payment intents.

### `payment_methods`

Stored payment methods for users (cards, bank accounts).

### `stripe_events`

Webhook events from Stripe for audit trail and reconciliation.

## Accounting Layer

### `transactions`

Double-entry accounting transactions. Every financial event creates balanced debit/credit entries.

## Views

### `vw_project_balances`

Current balance for each project (allocations minus costs).

### `vw_operation_balances`

Current balance for each operation.

### `vw_project_funding_summary`

Summary of funding for projects (donations, allocations, costs).

### `vw_donation_remaining`

Remaining unallocated amount for each donation.

### `vw_unallocated_donations`

Donations that haven't been fully allocated.

## Notes

- Business logic layer: What donors want to fund and how funds are allocated
- Payment provider layer: Integration with Stripe for payment processing
- Accounting layer: Double-entry bookkeeping for financial accuracy
- All amounts stored in cents (integer) to avoid floating-point errors
- Currency conversion handled via `exchange_rates` table
