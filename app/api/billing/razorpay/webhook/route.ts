/**
 * app/api/billing/razorpay/webhook/route.ts
 *
 * Handles Razorpay subscription lifecycle events.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  SECRETS REQUIRED                                                    │
 * │  RAZORPAY_WEBHOOK_SECRET   (from Razorpay → Settings → Webhooks)    │
 * │                                                                      │
 * │  Razorpay webhook URL to register:                                   │
 * │  https://mails.elixpo.com/api/billing/razorpay/webhook               │
 * │                                                                      │
 * │  Events to enable:                                                   │
 * │  - subscription.activated                                            │
 * │  - subscription.charged                                              │
 * │  - subscription.completed                                            │
 * │  - subscription.cancelled                                            │
 * │  - subscription.halted  (payment failure / mandate issue)            │
 * └──────────────────────────────────────────────────────────────────────┘
 */

import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error("[razorpay/webhook] Missing RAZORPAY_WEBHOOK_SECRET");
        return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    // Verify HMAC-SHA256 signature
    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

    const isValid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

    if (!isValid) {
        console.error("[razorpay/webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    let event: { event: string; payload: Record<string, { entity: Record<string, unknown> }> };
    try {
        event = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    try {
        await handleRazorpayEvent(event.event, event.payload);
    } catch (err) {
        // Log but return 200 so Razorpay doesn't retry forever
        console.error("[razorpay/webhook] handler error for %s:", event.event, err);
    }

    return NextResponse.json({ received: true });
}

async function handleRazorpayEvent(
    eventType: string,
    payload: Record<string, { entity: Record<string, unknown> }>,
) {
    const sub = payload?.subscription?.entity;

    switch (eventType) {
        // ── Mandate activated, first payment collected ────────────────────────────
        case "subscription.activated": {
            const notes = sub?.notes as Record<string, string> | undefined;
            const planId = notes?.planId ?? "starter";
            const cycle = notes?.cycle ?? "monthly";

            // TODO: upsert subscription in D1, enable plan features for tenant
            // Example:
            // await db.prepare(`
            //   INSERT INTO subscriptions (tenant_id, provider, subscription_id, plan_id, cycle, currency, status, current_period_end)
            //   VALUES (?, 'razorpay', ?, ?, ?, 'INR', 'active', ?)
            //   ON CONFLICT (provider, subscription_id) DO UPDATE SET status='active', updated_at=CURRENT_TIMESTAMP
            // `).bind(tenantId, sub.id, planId, cycle, sub.current_end).run();

            console.log("[razorpay/webhook] subscription activated:", sub?.id, planId, cycle);
            break;
        }

        // ── Recurring charge collected (renewal) ──────────────────────────────────
        case "subscription.charged": {
            const payment = payload?.payment?.entity;

            // TODO: record successful renewal in D1, reset monthly send counter
            console.log(
                "[razorpay/webhook] subscription charged:",
                sub?.id,
                "payment:",
                payment?.id,
            );
            break;
        }

        // ── Subscription completed (all billing cycles done) ──────────────────────
        case "subscription.completed": {
            // TODO: downgrade tenant to starter plan, notify them to renew
            console.log("[razorpay/webhook] subscription completed:", sub?.id);
            break;
        }

        // ── User cancelled ────────────────────────────────────────────────────────
        case "subscription.cancelled": {
            // TODO: mark as 'canceled' in D1, keep access until period end
            console.log("[razorpay/webhook] subscription cancelled:", sub?.id);
            break;
        }

        // ── Payment failure / mandate issue ───────────────────────────────────────
        case "subscription.halted": {
            // TODO: mark as 'past_due' in D1, notify tenant via email
            // Razorpay halts after 3 failed retries; subscription stays halted
            // until the customer re-authenticates via the mandate flow
            console.log("[razorpay/webhook] subscription HALTED (payment failure):", sub?.id);
            break;
        }

        default:
            break;
    }
}
