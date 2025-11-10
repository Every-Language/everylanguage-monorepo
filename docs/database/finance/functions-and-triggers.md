# Finance Functions & Triggers

Functions and triggers related to the financial system.

## Functions

### Balance Calculations

#### `get_unallocated_amount(donation_uuid UUID)`

Returns the unallocated amount remaining for a donation.

- Returns: Amount in cents (INTEGER)
- Used for: Showing how much of a donation is still available

#### `get_project_balance(project_uuid UUID)`

Returns current balance for a project (allocations minus costs).

- Returns: Balance in cents (INTEGER)
- Used for: Project financial dashboards

#### `get_operation_balance(operation_uuid UUID)`

Returns current balance for an operation (allocations minus costs).

- Returns: Balance in cents (INTEGER)
- Used for: Operation financial dashboards

### Currency Conversion

#### `convert_to_usd(amount_cents INTEGER, currency_code TEXT, as_of_date DATE)`

Converts an amount from any currency to USD.

- Returns: Amount in USD cents (INTEGER)
- Uses: `exchange_rates` table for conversion rates
- Used for: Financial reporting and aggregations

## Triggers

### `create_transaction_from_allocation`

**Trigger** - Automatically creates accounting transactions when donation allocations are created.

- Fires on: `INSERT` on `donation_allocations`
- Creates: Double-entry transaction records
- Ensures: Accounting integrity

### `validate_donation_allocation`

**Trigger** - Validates that allocation amounts don't exceed donation amount.

- Fires on: `INSERT` on `donation_allocations`
- Validates: Sum of allocations ≤ donation amount

### `auto_update_donation_status`

**Trigger** - Updates donation status based on payment intent status.

- Fires on: `UPDATE` on `payment_attempts`
- Updates: `donations.status` based on Stripe payment status

### `notify_unrestricted_donation`

**Trigger** - Notifies admins when unrestricted donations are completed.

- Fires on: `UPDATE` of `status` on `donations`
- Condition: `status = 'completed'` AND `intent_type = 'unrestricted'`

### `allocate_deposit_to_projects`

**Trigger** - Automatically allocates deposit percentage to projects when donations complete.

- Fires on: `UPDATE` of `status` on `donations`
- Condition: `status = 'completed'`
- Creates: Automatic allocations based on `funding_settings.deposit_percent`

### Timestamp Triggers

#### `update_donation_updated_at`

**Trigger** - Automatically updates `updated_at` timestamp on donations.

- Fires on: `UPDATE` on `donations`

#### `update_operation_updated_at`

**Trigger** - Automatically updates `updated_at` timestamp on operations.

- Fires on: `UPDATE` on `operations`

#### `update_operation_cost_updated_at`

**Trigger** - Automatically updates `updated_at` timestamp on operation costs.

- Fires on: `UPDATE` on `operation_costs`

### Payment Method Triggers

#### `update_payment_method_default`

**Trigger** - Ensures only one default payment method per user.

- Fires on: `INSERT` on `payment_methods`
- Sets: Other payment methods to non-default when a new default is set

#### `soft_delete_payment_method`

**Trigger** - Soft deletes payment methods instead of hard delete.

- Fires on: `DELETE` on `payment_methods`
- Sets: `deleted_at` timestamp instead of removing record
