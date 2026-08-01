/**
 * app/api/billing/stripe/webhook/route.ts
 *
 * Handles Stripe subscription lifecycle events.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  SECRETS REQUIRED                                            │
 * │  STRIPE_SECRET_KEY       sk_live_…                          │
 * │  STRIPE_WEBHOOK_SECRET   whsec_… (from Stripe → Webhooks)  │
 * │                                                             │
 * │  Stripe webhook URL to register:                            │
 * │  https://mails.elixpo.com/api/billing/stripe/webhook        │
 * │                                                             │
 * │  Events to enable in Stripe dashboard:                      │
 * │  - customer.subscription.created                            │
 * │  - customer.subscription.updated                            │
 * │  - customer.subscription.deleted                            │
 * │  - invoice.payment_succeeded                                │
 * │  - invoice.payment_failed                                   │
 * └──────────────────────────────────────────────────────────────┘
 */

import { type NextRequest, NextResponse } from "next/server";

// Required to verify Stripe's webhook signature
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey || !webhookSecret) {
        console.error("[stripe/webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
        return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
    }

    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature") ?? "";

    let event: import("stripe").Stripe.Event;

    try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(secretKey);
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
        console.error("[stripe/webhook] signature verification failed:", err);
        return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    try {
        await handleStripeEvent(event);
    } catch (err) {
        // Log but return 200 to prevent Stripe from retrying indefinitely
        console.error(`[stripe/webhook] handler error for ${event.type}:`, err);
    }

    return NextResponse.json({ received: true });
}

async function handleStripeEvent(event: import("stripe").Stripe.Event) {
    switch (event.type) {
        // ── Subscription created or updated ──────────────────────────────────────
        case "customer.subscription.created":
        case "customer.subscription.updated": {
            const sub = event.data.object as import("stripe").Stripe.Subscription;
            const planId = sub.metadata?.planId ?? "starter";
            const cycle = sub.metadata?.cycle ?? "monthly";

            // TODO: upsert into D1 subscriptions table
            // Example D1 query (replace `db` with your Cloudflare D1 binding):
            //
            // await db
            //   .prepare(`
            //     INSERT INTO subscriptions
            //       (tenant_id, provider, subscription_id, plan_id, cycle, currency, status, current_period_end)
            //     VALUES (?, 'stripe', ?, ?, ?, 'USD', ?, ?)
            //     ON CONFLICT (provider, subscription_id)
            //     DO UPDATE SET
            //       plan_id = excluded.plan_id,
            //       status = excluded.status,
            //       current_period_end = excluded.current_period_end,
            //       updated_at = CURRENT_TIMESTAMP
            //   `)
            //   .bind(
            //     tenantId,
            //     sub.id,
            //     planId,
            //     cycle,
            //     sub.status,
            //     new Date(sub.current_period_end * 1000).toISOString()
            //   )
            //   .run();

            console.log(
                `[stripe/webhook] subscription ${event.type}:`,
                sub.id,
                planId,
                cycle,
                sub.status,
            );
            break;
        }

        // ── Subscription cancelled ────────────────────────────────────────────────
        case "customer.subscription.deleted": {
            const sub = event.data.object as import("stripe").Stripe.Subscription;

            // TODO: mark subscription as 'canceled' in D1
            // TODO: downgrade tenant's plan to 'starter'

            console.log("[stripe/webhook] subscription deleted:", sub.id);
            break;
        }

        // ── Successful payment / renewal ──────────────────────────────────────────
        case "invoice.payment_succeeded": {
            const inv = event.data.object as import("stripe").Stripe.Invoice;
            // Stripe v22 moved the subscription off the invoice into
            // parent.subscription_details.
            const sd = inv.parent?.subscription_details?.subscription;
            const subId = typeof sd === "string" ? sd : sd?.id;

            // TODO: record invoice in D1, reset monthly send counter for the tenant

            console.log("[stripe/webhook] payment succeeded:", inv.id, "sub:", subId);
            break;
        }

        // ── Failed payment ────────────────────────────────────────────────────────
        case "invoice.payment_failed": {
            const inv = event.data.object as import("stripe").Stripe.Invoice;
            // Stripe v22 moved the subscription off the invoice into
            // parent.subscription_details.
            const sd = inv.parent?.subscription_details?.subscription;
            const subId = typeof sd === "string" ? sd : sd?.id;

            // TODO: update subscription status to 'past_due' in D1
            // TODO: send "payment failed" email notification to tenant

            console.log("[stripe/webhook] payment FAILED:", inv.id, "sub:", subId);
            break;
        }

        default:
            // Silently ignore events we don't handle
            break;
    }
}
