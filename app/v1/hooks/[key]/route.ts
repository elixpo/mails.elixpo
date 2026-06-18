export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { sha256Hex, timingSafeEqual } from "@/lib/crypto";
import { getDatabase } from "@/lib/d1-client";
import { deliveryToPublic, findByIdempotencyKey } from "@/lib/deliveries";
import { nowIso } from "@/lib/ids";
import { getProduct } from "@/lib/products";
import { deliverTemplate } from "@/lib/send-pipeline";
import { getTemplate } from "@/lib/templates";
import { getWebhookByEndpointKey } from "@/lib/webhooks";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: any, status = 200) {
    return NextResponse.json(body, { status });
}

/** Pull the Bearer token from Authorization (or x-elixpo-secret as a fallback). */
function extractSecret(request: NextRequest): string {
    const auth = request.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1].trim();
    return (request.headers.get("x-elixpo-secret") || "").trim();
}

/**
 * POST /v1/hooks/:key — public trigger endpoint.
 *
 * Auth: the parent product's shared secret as a Bearer token
 *   Authorization: Bearer lix_mail_xxx
 * We store only sha256(secret); the presented token is hashed and compared to
 * the current secret (and the previous one during a rotation grace window).
 *
 * Body (JSON):
 *   { "to": "user@example.com", "variables": { ... }, "idempotency_key"?: "..." }
 *
 * Renders the webhook's template with the variables, sends it through the
 * resolved sender (template → product default → tenant default), and records a
 * delivery log row for the outcome (success OR failure).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
    const { key } = await params;
    const db = await getDatabase();

    const webhook = await getWebhookByEndpointKey(db, key);
    if (!webhook) return json({ ok: false, error: "unknown_endpoint" }, 404);
    if (webhook.status !== "active") {
        return json({ ok: false, error: "webhook_disabled" }, 403);
    }

    const product = await getProduct(db, webhook.tenant_id, webhook.product_id);
    if (!product) return json({ ok: false, error: "unknown_product" }, 404);
    if (product.status !== "active") {
        return json({ ok: false, error: "product_disabled" }, 403);
    }
    if (!product.secret_hash) {
        return json({ ok: false, error: "no_credentials" }, 403);
    }

    // ── Authenticate with the shared secret (Bearer) ──────────────────────────
    const presented = extractSecret(request);
    if (!presented) {
        return json(
            { ok: false, error: "missing_credentials", message: "Send Authorization: Bearer <product secret>." },
            401,
        );
    }
    const presentedHash = await sha256Hex(presented);
    let authed = timingSafeEqual(presentedHash, product.secret_hash);
    if (!authed && product.prev_secret_hash && product.prev_secret_expires_at) {
        // Previous secret is honored until its grace window expires.
        if (product.prev_secret_expires_at > nowIso()) {
            authed = timingSafeEqual(presentedHash, product.prev_secret_hash);
        }
    }
    if (!authed) return json({ ok: false, error: "invalid_credentials" }, 401);

    // ── Parse + validate the payload ──────────────────────────────────────────
    let body: any;
    try {
        body = await request.json();
    } catch {
        return json({ ok: false, error: "invalid_json" }, 400);
    }

    const to = typeof body?.to === "string" ? body.to.trim() : "";
    if (!EMAIL_RE.test(to)) {
        return json({ ok: false, error: "invalid_recipient", message: "Provide a valid `to` email." }, 400);
    }
    const vars =
        body?.variables && typeof body.variables === "object"
            ? body.variables
            : body?.vars && typeof body.vars === "object"
              ? body.vars
              : {};
    const idempotencyKey =
        typeof body?.idempotency_key === "string"
            ? body.idempotency_key
            : request.headers.get("idempotency-key") || null;

    // ── Idempotency: replay a prior result instead of double-sending ──────────
    if (idempotencyKey) {
        const prior = await findByIdempotencyKey(db, webhook.tenant_id, idempotencyKey);
        if (prior) {
            return json({
                ok: prior.status === "sent",
                deduped: true,
                id: prior.id,
                status: prior.status,
                delivery: deliveryToPublic(prior),
            });
        }
    }

    const template = await getTemplate(db, webhook.tenant_id, webhook.template_id);
    if (!template) return json({ ok: false, error: "template_missing" }, 500);

    const result = await deliverTemplate(db, {
        tenantId: webhook.tenant_id,
        template,
        product,
        webhookId: webhook.id,
        to,
        vars,
        idempotencyKey,
    });

    const payload = {
        ok: result.ok,
        id: result.deliveryId,
        status: result.status,
        to,
        subject: result.subject,
        ...(result.ok ? {} : { error: result.error }),
    };
    // 200 when the mail was accepted by the SMTP server; 502 when the downstream
    // send failed (the attempt is still logged either way).
    return json(payload, result.ok ? 200 : 502);
}
