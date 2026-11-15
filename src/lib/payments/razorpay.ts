/**
 * Razorpay recurring auto-pay integration for INR subscriptions (RBI e-mandate compliant).
 * Edge runtime compatible (direct fetch against api.razorpay.com).
 */

import { base64url, hmacSha256Hex } from "../crypto";
import { appUrl, getEnv } from "../env";
import type { BillingCycle, PlanId } from "../plans";

export interface CreateRazorpayCheckoutParams {
    tenantId: string;
    tenantName: string;
    email: string;
    plan: PlanId;
    cycle: BillingCycle;
    customerId?: string | null;
}

export interface RazorpayCheckoutResult {
    url: string;
    subscriptionId: string;
    provider: "razorpay";
}

/** Price amounts in INR paise (₹1 = 100 paise) */
export const RAZORPAY_PRICES: Record<string, Record<BillingCycle, number>> = {
    pro: {
        monthly: 149900, // ₹1,499.00
        yearly: 1499000, // ₹14,990.00
    },
    scale: {
        monthly: 799900, // ₹7,999.00
        yearly: 7999000, // ₹79,990.00
    },
};

function basicAuth(keyId: string, keySecret: string): string {
    const raw = `${keyId}:${keySecret}`;
    if (typeof btoa === "function") return `Basic ${btoa(raw)}`;
    return `Basic ${Buffer.from(raw).toString("base64")}`;
}

export async function createRazorpaySubscription(
    params: CreateRazorpayCheckoutParams,
): Promise<RazorpayCheckoutResult> {
    const keyId = await getEnv("RAZORPAY_KEY_ID");
    const keySecret = await getEnv("RAZORPAY_KEY_SECRET");
    const origin = await appUrl();

    // In local / dev or when Razorpay keys aren't configured, provide a seamless simulation URL
    if (!keyId || !keySecret) {
        const mockSubId = `sim_sub_${Date.now()}`;
        const returnUrl = `${origin}/api/billing/simulate-success?provider=razorpay&subscription_id=${mockSubId}&tenant_id=${params.tenantId}&plan=${params.plan}&cycle=${params.cycle}&currency=INR`;
        return {
            url: returnUrl,
            subscriptionId: mockSubId,
            provider: "razorpay",
        };
    }

    const priceAmount = RAZORPAY_PRICES[params.plan]?.[params.cycle];
    if (!priceAmount) {
        throw new Error(
            `Invalid plan or cycle for Razorpay checkout: ${params.plan} / ${params.cycle}`,
        );
    }

    const authHeader = basicAuth(keyId, keySecret);
    const period = params.cycle === "yearly" ? "yearly" : "monthly";

    // 1. Create or resolve a Razorpay Plan
    const planRes = await fetch("https://api.razorpay.com/v1/plans", {
        method: "POST",
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            period,
            interval: 1,
            item: {
                name: `Elixpo Mails ${params.plan.toUpperCase()} Plan (${params.cycle})`,
                amount: priceAmount,
                currency: "INR",
                description: `Recurring transactional email allowance: ${params.plan} (${params.cycle})`,
            },
            notes: {
                plan: params.plan,
                cycle: params.cycle,
            },
        }),
    });

    const planData = (await planRes.json()) as { id?: string; error?: { description: string } };
    if (!planRes.ok || !planData.id) {
        throw new Error(planData.error?.description || "Failed to create Razorpay plan");
    }

    // 2. Create the Subscription for the tenant
    const subRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            plan_id: planData.id,
            total_count: params.cycle === "yearly" ? 5 : 60,
            quantity: 1,
            customer_notify: 1,
            notes: {
                tenantId: params.tenantId,
                plan: params.plan,
                cycle: params.cycle,
                currency: "INR",
            },
        }),
    });

    const subData = (await subRes.json()) as {
        id?: string;
        short_url?: string;
        error?: { description: string };
    };

    if (!subRes.ok || !subData.id) {
        throw new Error(subData.error?.description || "Failed to create Razorpay subscription");
    }

    const checkoutUrl =
        subData.short_url ||
        `${origin}/dashboard/billing?razorpay_sub=${subData.id}&checkout=initiated`;

    return {
        url: checkoutUrl,
        subscriptionId: subData.id,
        provider: "razorpay",
    };
}

export async function cancelRazorpaySubscription(subscriptionId: string): Promise<void> {
    const keyId = await getEnv("RAZORPAY_KEY_ID");
    const keySecret = await getEnv("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) return;

    const authHeader = basicAuth(keyId, keySecret);
    await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            cancel_at_cycle_end: 1,
        }),
    });
}

/** Verify Razorpay webhook signature header using HMAC-SHA256. */
export async function verifyRazorpayWebhook(
    payload: string,
    signatureHeader: string | null,
): Promise<boolean> {
    const webhookSecret = await getEnv("RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret || !signatureHeader) return false;

    try {
        const computed = await hmacSha256Hex(webhookSecret, payload);
        return computed.toLowerCase() === signatureHeader.trim().toLowerCase();
    } catch {
        return false;
    }
}
