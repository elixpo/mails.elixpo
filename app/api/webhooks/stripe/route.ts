export const runtime = "edge";

import { recordInvoice, updateTenantSubscription } from "@/lib/billing";
import { getDatabase } from "@/lib/d1-client";
import { verifyStripeWebhook } from "@/lib/payments/stripe";
import type { BillingCycle, Currency, PlanId } from "@/lib/plans";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    const valid = await verifyStripeWebhook(rawBody, signature);
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

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data?.object;
            const tenantId = session?.metadata?.tenantId || session?.client_reference_id;
            const plan = (session?.metadata?.plan || "pro") as PlanId;
            const cycle = (session?.metadata?.cycle || "monthly") as BillingCycle;
            const currency = (session?.metadata?.currency || "USD") as Currency;
            const subId = session?.subscription;
            const customerId = session?.customer;

            if (tenantId) {
                await updateTenantSubscription(db, tenantId, {
                    plan,
                    billingCycle: cycle,
                    billingCurrency: currency,
                    subscriptionId: typeof subId === "string" ? subId : null,
                    customerId: typeof customerId === "string" ? customerId : null,
                    subscriptionStatus: "active",
                    paymentProvider: "stripe",
                });
            }
            break;
        }

        case "invoice.payment_succeeded": {
            const invoice = event.data?.object;
            const subId = invoice?.subscription;
            const customerId = invoice?.customer;
            const amount = Number(invoice?.amount_paid || invoice?.total || 0);
            const currency = ((invoice?.currency || "usd") as string).toUpperCase() as Currency;

            if (subId) {
                const tenant = (await db
                    .prepare("SELECT id FROM tenants WHERE subscription_id = ?")
                    .bind(subId)
                    .first()) as { id?: string } | null;

                if (tenant?.id) {
                    const periodStart = invoice?.lines?.data?.[0]?.period?.start
                        ? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
                        : new Date().toISOString();
                    const periodEnd = invoice?.lines?.data?.[0]?.period?.end
                        ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
                        : null;

                    await updateTenantSubscription(db, tenant.id, {
                        subscriptionStatus: "active",
                        currentPeriodStart: periodStart,
                        currentPeriodEnd: periodEnd,
                        customerId: typeof customerId === "string" ? customerId : undefined,
                    });

                    await recordInvoice(db, {
                        tenantId: tenant.id,
                        provider: "stripe",
                        providerInvoiceId: invoice?.id || null,
                        amount,
                        currency,
                        status: "paid",
                        paidAt: new Date().toISOString(),
                        pdfUrl: invoice?.invoice_pdf || null,
                        hostedInvoiceUrl: invoice?.hosted_invoice_url || null,
                    });
                }
            }
            break;
        }

        case "customer.subscription.updated": {
            const sub = event.data?.object;
            const subId = sub?.id;
            const status = sub?.status; // active, past_due, canceled, unpaid
            const cancelAtPeriodEnd = Boolean(sub?.cancel_at_period_end);

            if (subId) {
                const tenant = (await db
                    .prepare("SELECT id FROM tenants WHERE subscription_id = ?")
                    .bind(subId)
                    .first()) as { id?: string } | null;

                if (tenant?.id) {
                    const normalizedStatus =
                        status === "past_due"
                            ? "past_due"
                            : status === "canceled"
                              ? "canceled"
                              : status === "unpaid"
                                ? "unpaid"
                                : "active";

                    await updateTenantSubscription(db, tenant.id, {
                        subscriptionStatus: normalizedStatus,
                        cancelAtPeriodEnd,
                        currentPeriodEnd: sub?.current_period_end
                            ? new Date(sub.current_period_end * 1000).toISOString()
                            : undefined,
                    });
                }
            }
            break;
        }

        case "customer.subscription.deleted": {
            const sub = event.data?.object;
            const subId = sub?.id;
            if (subId) {
                const tenant = (await db
                    .prepare("SELECT id FROM tenants WHERE subscription_id = ?")
                    .bind(subId)
                    .first()) as { id?: string } | null;

                if (tenant?.id) {
                    await updateTenantSubscription(db, tenant.id, {
                        plan: "starter",
                        subscriptionStatus: "canceled",
                        cancelAtPeriodEnd: false,
                    });
                }
            }
            break;
        }
    }

    return NextResponse.json({ received: true });
}
