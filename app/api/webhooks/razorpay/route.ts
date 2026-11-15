export const runtime = "edge";

import { recordInvoice, updateTenantSubscription } from "@/lib/billing";
import { getDatabase } from "@/lib/d1-client";
import { verifyRazorpayWebhook } from "@/lib/payments/razorpay";
import type { BillingCycle, PlanId } from "@/lib/plans";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    const valid = await verifyRazorpayWebhook(rawBody, signature);
    if (!valid && process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
    }

    let event: any;
    try {
        event = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const db = await getDatabase();
    const subEntity = event?.payload?.subscription?.entity;
    const paymentEntity = event?.payload?.payment?.entity;

    const subId = subEntity?.id;
    const notes = subEntity?.notes || paymentEntity?.notes;
    const tenantId = notes?.tenantId;
    const plan = (notes?.plan || "pro") as PlanId;
    const cycle = (notes?.cycle || "monthly") as BillingCycle;

    switch (event.event) {
        case "subscription.authenticated":
        case "subscription.activated": {
            if (tenantId && subId) {
                const currentPeriodEnd = subEntity?.current_end
                    ? new Date(subEntity.current_end * 1000).toISOString()
                    : null;
                const currentPeriodStart = subEntity?.current_start
                    ? new Date(subEntity.current_start * 1000).toISOString()
                    : new Date().toISOString();

                await updateTenantSubscription(db, tenantId, {
                    plan,
                    billingCycle: cycle,
                    billingCurrency: "INR",
                    subscriptionId: subId,
                    subscriptionStatus: "active",
                    currentPeriodStart,
                    currentPeriodEnd,
                    paymentProvider: "razorpay",
                });
            }
            break;
        }

        case "subscription.charged": {
            const amount = Number(paymentEntity?.amount || subEntity?.plan?.item?.amount || 0);
            const invoiceId = paymentEntity?.invoice_id || paymentEntity?.id;

            if (tenantId) {
                await recordInvoice(db, {
                    tenantId,
                    provider: "razorpay",
                    providerInvoiceId: invoiceId || null,
                    amount,
                    currency: "INR",
                    status: "paid",
                    paidAt: new Date().toISOString(),
                    hostedInvoiceUrl: null,
                });

                const currentPeriodEnd = subEntity?.current_end
                    ? new Date(subEntity.current_end * 1000).toISOString()
                    : null;

                await updateTenantSubscription(db, tenantId, {
                    subscriptionStatus: "active",
                    currentPeriodEnd,
                });
            }
            break;
        }

        case "subscription.halted":
        case "subscription.pending": {
            if (tenantId) {
                await updateTenantSubscription(db, tenantId, {
                    subscriptionStatus: "past_due",
                });
            }
            break;
        }

        case "subscription.cancelled": {
            if (tenantId) {
                await updateTenantSubscription(db, tenantId, {
                    plan: "starter",
                    subscriptionStatus: "canceled",
                    cancelAtPeriodEnd: false,
                });
            }
            break;
        }
    }

    return NextResponse.json({ status: "ok" });
}
