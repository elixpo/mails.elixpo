export const runtime = "edge";

import { getTenantSubscription } from "@/lib/billing";
import { getDatabase } from "@/lib/d1-client";
import { createStripePortalSession } from "@/lib/payments/stripe";
import { getSession } from "@/lib/session";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const db = await getDatabase();
    const sub = await getTenantSubscription(db, session.tenantId);

    if (sub.paymentProvider === "stripe" && sub.customerId) {
        try {
            const portal = await createStripePortalSession(sub.customerId);
            return NextResponse.json({ ok: true, url: portal.url });
        } catch (e: any) {
            return NextResponse.json(
                {
                    error: "portal_failed",
                    message: e?.message || "Failed to create customer portal session",
                },
                { status: 500 },
            );
        }
    }

    return NextResponse.json({ ok: true, url: "/dashboard/billing" });
}
