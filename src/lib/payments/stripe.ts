/**
 * Stripe payment integration for USD subscriptions.
 * Edge runtime compatible (direct fetch against api.stripe.com).
 */

import { hmacSha256Hex } from "../crypto";
import { appUrl, getEnv } from "../env";
import type { BillingCycle, PlanId } from "../plans";

export interface CreateCheckoutParams {
    tenantId: string;
    tenantName: string;
    email: string;
    plan: PlanId;
    cycle: BillingCycle;
    customerId?: string | null;
}

export interface CheckoutSessionResult {
    url: string;
    sessionId: string;
    provider: "stripe";
}

/** Price amounts in USD cents */
const STRIPE_PRICES: Record<string, Record<BillingCycle, number>> = {
    pro: {
        monthly: 1900, // $19.00
        yearly: 19000, // $190.00
    },
    scale: {
        monthly: 9900, // $99.00
        yearly: 99000, // $990.00
    },
};

export async function createStripeCheckoutSession(
    params: CreateCheckoutParams,
): Promise<CheckoutSessionResult> {
    const secretKey = await getEnv("STRIPE_SECRET_KEY");
    const origin = await appUrl();

    // In local / dev or when Stripe keys aren't configured, provide a seamless simulation URL
    if (!secretKey) {
        const mockSessionId = `sim_cs_${Date.now()}`;
        const returnUrl = `${origin}/api/billing/simulate-success?provider=stripe&session_id=${mockSessionId}&tenant_id=${params.tenantId}&plan=${params.plan}&cycle=${params.cycle}&currency=USD`;
        return {
            url: returnUrl,
            sessionId: mockSessionId,
            provider: "stripe",
        };
    }

    const priceAmount = STRIPE_PRICES[params.plan]?.[params.cycle];
    if (!priceAmount) {
        throw new Error(
            `Invalid plan or cycle for Stripe checkout: ${params.plan} / ${params.cycle}`,
        );
    }

    const interval = params.cycle === "yearly" ? "year" : "month";
    const productName = `Elixpo Mails ${params.plan.toUpperCase()} Plan (${params.cycle})`;

    const formBody = new URLSearchParams();
    formBody.append("mode", "subscription");
    formBody.append(
        "success_url",
        `${origin}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    );
    formBody.append("cancel_url", `${origin}/dashboard/billing?checkout=canceled`);
    formBody.append("client_reference_id", params.tenantId);
    formBody.append("customer_email", params.email);
    formBody.append("metadata[tenantId]", params.tenantId);
    formBody.append("metadata[plan]", params.plan);
    formBody.append("metadata[cycle]", params.cycle);
    formBody.append("metadata[currency]", "USD");

    formBody.append("line_items[0][price_data][currency]", "usd");
    formBody.append("line_items[0][price_data][product_data][name]", productName);
    formBody.append("line_items[0][price_data][unit_amount]", String(priceAmount));
    formBody.append("line_items[0][price_data][recurring][interval]", interval);
    formBody.append("line_items[0][quantity]", "1");

    if (params.customerId) {
        formBody.append("customer", params.customerId);
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
    });

    const data = (await res.json()) as { id?: string; url?: string; error?: { message: string } };
    if (!res.ok || !data.url || !data.id) {
        throw new Error(data.error?.message || "Failed to create Stripe checkout session");
    }

    return {
        url: data.url,
        sessionId: data.id,
        provider: "stripe",
    };
}

export async function createStripePortalSession(customerId: string): Promise<{ url: string }> {
    const secretKey = await getEnv("STRIPE_SECRET_KEY");
    const origin = await appUrl();

    if (!secretKey) {
        return { url: `${origin}/dashboard/billing?portal=simulated` };
    }

    const formBody = new URLSearchParams();
    formBody.append("customer", customerId);
    formBody.append("return_url", `${origin}/dashboard/billing`);

    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
    });

    const data = (await res.json()) as { url?: string; error?: { message: string } };
    if (!res.ok || !data.url) {
        throw new Error(data.error?.message || "Failed to create Stripe portal session");
    }

    return { url: data.url };
}

export async function cancelStripeSubscription(subscriptionId: string): Promise<void> {
    const secretKey = await getEnv("STRIPE_SECRET_KEY");
    if (!secretKey) return;

    const formBody = new URLSearchParams();
    formBody.append("cancel_at_period_end", "true");

    await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
    });
}

export async function resumeStripeSubscription(subscriptionId: string): Promise<void> {
    const secretKey = await getEnv("STRIPE_SECRET_KEY");
    if (!secretKey) return;

    const formBody = new URLSearchParams();
    formBody.append("cancel_at_period_end", "false");

    await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
    });
}

/** Verify Stripe webhook signature header (t=...,v1=...). */
export async function verifyStripeWebhook(
    payload: string,
    signatureHeader: string | null,
): Promise<boolean> {
    const webhookSecret = await getEnv("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret || !signatureHeader) return false;

    try {
        const parts = signatureHeader.split(",");
        let timestamp = "";
        let signature = "";

        for (const part of parts) {
            const [k, v] = part.trim().split("=");
            if (k === "t") timestamp = v;
            if (k === "v1") signature = v;
        }

        if (!timestamp || !signature) return false;

        const signedPayload = `${timestamp}.${payload}`;
        const computed = await hmacSha256Hex(webhookSecret, signedPayload);
        return computed === signature;
    } catch {
        return false;
    }
}
