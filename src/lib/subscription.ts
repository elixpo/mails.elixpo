/**
 * lib/subscription.ts — Shared subscription types consumed by API routes,
 * the billing dashboard, and plan-gating middleware.
 */

import type { BillingCycle, Currency, PlanId, SubscriptionStatus } from "./plans";

export interface Subscription {
  planId: PlanId;
  cycle: BillingCycle;
  currency: Currency;
  status: SubscriptionStatus;
  /** ISO date string for when the current period ends / renews. */
  currentPeriodEnd: string | null;
  /** The upstream provider's subscription ID (Stripe or Razorpay). */
  subscriptionId: string | null;
  provider: "stripe" | "razorpay" | null;
}

export interface UsageStats {
  sendsUsed: number;
  sendsAllowed: number;
  /** ISO date — start of the current billing period. */
  periodStart: string;
  /** ISO date — end of the current billing period. */
  periodEnd: string;
}

/** Feature gates derived from a subscription. Used across the dashboard. */
export function getFeatureGates(sub: Subscription) {
  const active = sub.status === "active" || sub.status === "trialing";
  return {
    canSend: active || sub.planId === "starter",
    canAccessAnalytics: active && (sub.planId === "scale" || sub.planId === "enterprise"),
    canRemoveBranding: active && (sub.planId === "scale" || sub.planId === "enterprise"),
    showUpgradeBanner: sub.planId === "starter" || sub.status === "past_due",
  };
}