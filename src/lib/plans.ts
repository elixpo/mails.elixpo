/**
 * lib/plans.ts — Single source of truth for plan definitions, prices, and limits.
 *
 * INR prices are set deliberately (local pricing / PPP), NOT converted from USD at runtime.
 * Yearly discount: 2 months free = 16.67% off (pay 10 months, get 12).
 */

export type PlanId = "starter" | "pro" | "scale" | "enterprise";
export type Currency = "USD" | "INR";
export type BillingCycle = "monthly" | "yearly";
export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "none";

// ─── Price shape ─────────────────────────────────────────────────────────────

export interface PlanPrice {
  /** Charged each month when on monthly billing. 0 = free. -1 = custom. */
  monthly: number;
  /** Effective per-month rate when paying yearly (monthly × 10 / 12, rounded). */
  yearlyMonthly: number;
  /** Actual amount charged upfront for a yearly subscription. */
  yearlyTotal: number;
}

// ─── Plan limits ─────────────────────────────────────────────────────────────

export interface PlanLimits {
  sendsPerMonth: number | null; // null = unlimited / custom
  products: number | null;
  senders: number | null;
  templates: number | null;
}

// ─── Full plan definition ─────────────────────────────────────────────────────

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  limits: PlanLimits;
  prices: Record<Currency, PlanPrice>;
  features: string[];
  /** Shown as a "Most popular" badge */
  popular?: boolean;
  /** CTA label for the checkout button */
  cta: string;
}

// ─── The plans ───────────────────────────────────────────────────────────────

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Everything you need to get going.",
    limits: { sendsPerMonth: 1_000, products: 1, senders: 1, templates: 5 },
    prices: {
      USD: { monthly: 0, yearlyMonthly: 0, yearlyTotal: 0 },
      INR: { monthly: 0, yearlyMonthly: 0, yearlyTotal: 0 },
    },
    cta: "Start for free",
    features: [
      "1,000 sends / month",
      "1 product",
      "1 sender mailbox",
      "5 email templates",
      "Delivery log",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For teams shipping real products.",
    popular: true,
    limits: {
      sendsPerMonth: 25_000,
      products: 5,
      senders: 5,
      templates: 50,
    },
    prices: {
      USD: { monthly: 19, yearlyMonthly: 16, yearlyTotal: 190 },
      INR: { monthly: 1599, yearlyMonthly: 1332, yearlyTotal: 15990 },
    },
    cta: "Get Pro",
    features: [
      "25,000 sends / month",
      "5 products",
      "5 sender mailboxes",
      "50 email templates",
      "File attachments",
      "Unsubscribe management",
      "Webhook triggers",
      "Priority email support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "High-volume without the headaches.",
    limits: {
      sendsPerMonth: 250_000,
      products: null,
      senders: null,
      templates: null,
    },
    prices: {
      USD: { monthly: 99, yearlyMonthly: 82, yearlyTotal: 990 },
      INR: { monthly: 7999, yearlyMonthly: 6665, yearlyTotal: 79980 },
    },
    cta: "Get Scale",
    features: [
      "250,000 sends / month",
      "Unlimited products",
      "Unlimited senders",
      "Unlimited templates",
      "Advanced analytics",
      "Remove footer branding",
      "Usage metering dashboard",
      "Dedicated Slack support",
      "Uptime SLA",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom volume, compliance, and contract.",
    limits: {
      sendsPerMonth: null,
      products: null,
      senders: null,
      templates: null,
    },
    prices: {
      USD: { monthly: -1, yearlyMonthly: -1, yearlyTotal: -1 },
      INR: { monthly: -1, yearlyMonthly: -1, yearlyTotal: -1 },
    },
    cta: "Talk to us",
    features: [
      "Custom send volume",
      "Dedicated infrastructure",
      "Custom SLA and contract",
      "GST-compliant INR invoicing",
      "Audit logs and SSO",
      "White-glove onboarding",
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

export function isCustomPrice(amount: number): boolean {
  return amount === -1;
}

export function isFreePrice(amount: number): boolean {
  return amount === 0;
}

export function formatCurrency(amount: number, currency: Currency): string {
  if (isCustomPrice(amount)) return "Custom";
  if (isFreePrice(amount)) return "Free";

  if (currency === "INR") {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return `$${amount}`;
}

/** Annual savings in the given currency vs paying monthly for 12 months. */
export function annualSavings(plan: Plan, currency: Currency): number {
  const p = plan.prices[currency];
  if (p.monthly <= 0) return 0;
  return p.monthly * 12 - p.yearlyTotal;
}