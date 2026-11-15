-- mail.elixpo — subscriptions, recurring billing, and invoices
-- Adds plan, cycle, currency, and provider subscription state to tenants,
-- plus an invoices table for tracking payments across Stripe and Razorpay.

ALTER TABLE tenants ADD COLUMN plan                 TEXT NOT NULL DEFAULT 'starter';
ALTER TABLE tenants ADD COLUMN billing_cycle        TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE tenants ADD COLUMN billing_currency     TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE tenants ADD COLUMN subscription_id      TEXT;
ALTER TABLE tenants ADD COLUMN subscription_status  TEXT NOT NULL DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN current_period_start TEXT;
ALTER TABLE tenants ADD COLUMN current_period_end   TEXT;
ALTER TABLE tenants ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN payment_provider     TEXT;
ALTER TABLE tenants ADD COLUMN customer_id          TEXT;

CREATE TABLE IF NOT EXISTS invoices (
    id                  TEXT PRIMARY KEY,                 -- inv_xxx
    tenant_id           TEXT NOT NULL REFERENCES tenants(id),
    provider            TEXT NOT NULL,                    -- stripe | razorpay
    provider_invoice_id TEXT,
    amount              INTEGER NOT NULL,                 -- in cents / paise
    currency            TEXT NOT NULL,                    -- USD | INR
    status              TEXT NOT NULL,                    -- paid | open | void | uncollectible
    paid_at             TEXT,
    pdf_url             TEXT,
    hosted_invoice_url  TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id, created_at);
