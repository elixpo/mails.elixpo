/**
 * Role guards for workspace API routes. Read the active-workspace role from the
 * session cookie and assert it meets a minimum. Returns a 401/403 response to
 * short-circuit, or the session to proceed.
 */

import { type NextRequest, NextResponse } from "next/server";
import { type SessionData, getSession, sessionRole } from "./session";
import { type Role, can, roleAtLeast } from "./workspace";

/**
 * Gate a mutating content handler (senders/products/templates/webhooks/sends) on
 * write access. Viewers are read-only. Returns a 403 response to short-circuit,
 * or null to proceed. Call right after the `getSession` null-check.
 */
export function requireWriteRole(session: SessionData): NextResponse | null {
    if (!can.editContent(sessionRole(session))) {
        return NextResponse.json(
            { error: "forbidden", message: "Your role in this workspace is read-only." },
            { status: 403 },
        );
    }
    return null;
}

/** Gate on workspace-admin (member/cosmetics management). */
export function requireAdminRole(session: SessionData): NextResponse | null {
    if (!can.manageWorkspace(sessionRole(session))) {
        return NextResponse.json(
            { error: "forbidden", message: "Only workspace admins can do this." },
            { status: 403 },
        );
    }
    return null;
}

export type Guarded =
    | { ok: true; session: SessionData; role: string }
    | { ok: false; response: NextResponse };

export async function guard(request: NextRequest, min: Role): Promise<Guarded> {
    const session = await getSession(request);
    if (!session) {
        return { ok: false, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
    }
    const role = sessionRole(session);
    if (!roleAtLeast(role, min)) {
        return { ok: false, response: NextResponse.json({ error: "forbidden", role }, { status: 403 }) };
    }
    return { ok: true, session, role };
}
