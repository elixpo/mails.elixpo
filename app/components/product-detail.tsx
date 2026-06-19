"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import InventoryIcon from "@mui/icons-material/Inventory2";
import LanguageIcon from "@mui/icons-material/Language";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import WebhookIcon from "@mui/icons-material/Webhook";
import {
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Link as MuiLink,
    Menu,
    MenuItem,
    Select,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, GHOST_BTN, PRIMARY_BTN } from "./dashboard-ui";
import { BORDER, GlassCard, SURFACE } from "./glass-card";

const ACCENT = "#9b7bf7";
const TEXT = "#f5f5f4";
const TEXT_55 = "rgba(245,245,244,0.55)";

interface Product {
    id: string;
    name: string;
    client_id: string;
    has_secret: boolean;
    default_sender_id: string | null;
    description: string | null;
    homepage_url: string | null;
    support_email: string | null;
    logo_url: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}

interface Sender {
    id: string;
    email: string;
    display_name: string | null;
    is_default: boolean;
}

interface Webhook {
    id: string;
    product_id: string;
    template_id: string;
    name: string;
    endpoint_key: string;
    status: string;
    template_name: string;
    template_slug: string;
}

interface TemplateOpt {
    id: string;
    name: string;
    slug: string;
    variables: string[];
}

const darkField = {
    "& .MuiOutlinedInput-root": {
        color: TEXT,
        borderRadius: "10px",
        background: "rgba(255,255,255,0.02)",
        "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
        "&:hover fieldset": { borderColor: "rgba(155,123,247,0.4)" },
        "&.Mui-focused fieldset": { borderColor: ACCENT },
    },
    "& .MuiInputBase-input": { fontSize: "0.92rem" },
    "& .MuiInputBase-input::placeholder": { color: "rgba(245,245,244,0.35)", opacity: 1 },
};

const selectSx = {
    color: TEXT,
    borderRadius: "10px",
    background: "rgba(255,255,255,0.02)",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.12)" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(155,123,247,0.4)" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
    "& .MuiSelect-icon": { color: "rgba(245,245,244,0.4)" },
    "& .MuiSelect-select": { fontSize: "0.9rem", py: 1.1 },
};

const menuProps = {
    slotProps: {
        paper: {
            sx: {
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                backgroundImage: "none",
                "& .MuiMenuItem-root": { color: TEXT, fontSize: "0.9rem" },
                "& .MuiMenuItem-root.Mui-selected": { background: "rgba(155,123,247,0.12)" },
            },
        },
    },
} as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(245,245,244,0.4)", mb: 0.7 }}>
            {children}
        </Typography>
    );
}

/** Node.js HMAC-signing usage snippet for a webhook (mirrors webhooks-manager). */
function buildSnippet(origin: string, key: string, vars: string[]): string {
    const varsObj = vars.length ? `{ ${vars.map((v) => `"${v}": "…"`).join(", ")} }` : "{}";
    const sigLine =
        'const v1 = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");';
    return [
        'import crypto from "node:crypto";',
        "",
        'const secret = "YOUR_PRODUCT_SECRET"; // your product’s shared secret',
        `const url = "${origin}/v1/hooks/${key}";`,
        "",
        "const payload = JSON.stringify({",
        '  to: "user@example.com",',
        `  variables: ${varsObj},`,
        "});",
        "",
        "const t = Math.floor(Date.now() / 1000);",
        sigLine,
        "",
        "await fetch(url, {",
        '  method: "POST",',
        "  headers: {",
        '    "Content-Type": "application/json",',
        '    "X-Elixpo-Signature": `t=${t},v1=${v1}`,',
        "  },",
        "  body: payload,",
        "});",
    ].join("\n");
}

export default function ProductDetail({ id }: { id: string }) {
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [senders, setSenders] = useState<Sender[]>([]);
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [templates, setTemplates] = useState<TemplateOpt[]>([]);
    const [origin, setOrigin] = useState("");
    const [toast, setToast] = useState<string | null>(null);
    const [revealSecret, setRevealSecret] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => setOrigin(window.location.origin), []);

    const loadProduct = useCallback(async () => {
        try {
            const r = await fetch(`/api/products/${id}`);
            if (r.status === 404) {
                setNotFound(true);
                return;
            }
            const d: any = await r.json();
            if (d?.ok) setProduct(d.product as Product);
            else setNotFound(true);
        } catch {
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const loadWebhooks = useCallback(async () => {
        try {
            const d: any = await fetch(`/api/webhooks?productId=${id}`).then((x) => x.json());
            if (d?.ok) setWebhooks(d.webhooks as Webhook[]);
        } catch {
            /* ignore */
        }
    }, [id]);

    useEffect(() => {
        loadProduct();
        loadWebhooks();
        fetch("/api/senders")
            .then((r) => r.json())
            .then((d: any) => d?.ok && setSenders(d.senders as Sender[]))
            .catch(() => {});
        fetch("/api/templates")
            .then((r) => r.json())
            .then((d: any) => d?.ok && setTemplates(d.templates as TemplateOpt[]))
            .catch(() => {});
    }, [loadProduct, loadWebhooks]);

    const templateVars = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const t of templates) map.set(t.id, t.variables || []);
        return map;
    }, [templates]);

    function copy(text: string, label = "Copied") {
        navigator.clipboard?.writeText(text).then(() => setToast(label));
    }

    // ── Edit dialog ──────────────────────────────────────────────────────────
    const [editOpen, setEditOpen] = useState(false);

    async function rotateSecret() {
        try {
            const d: any = await fetch(`/api/products/${id}/rotate-secret`, { method: "POST" }).then((r) => r.json());
            if (d?.ok && d.secret) {
                setRevealSecret(d.secret);
                setProduct((p) => (p ? { ...p, has_secret: true } : p));
            } else setToast("Could not rotate the secret.");
        } catch {
            setToast("Could not rotate the secret.");
        }
    }

    async function deleteProduct() {
        try {
            const r = await fetch(`/api/products/${id}`, { method: "DELETE" });
            const d: any = await r.json().catch(() => ({}));
            if (r.ok && d?.ok) {
                router.push("/dashboard/products");
            } else {
                setToast(d?.message || "Could not delete this product.");
            }
        } catch {
            setToast("Could not delete this product.");
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}>
                <CircularProgress sx={{ color: ACCENT }} />
            </Box>
        );
    }
    if (notFound || !product) {
        return (
            <Box>
                <BackLink />
                <EmptyState
                    icon={InventoryIcon}
                    headline="Product not found"
                    subtext="This product doesn't exist or you don't have access to it."
                    cta={<Button component={Link} href="/dashboard/products" sx={GHOST_BTN}>Back to products</Button>}
                />
            </Box>
        );
    }

    const defaultSender = senders.find((s) => s.id === product.default_sender_id) || null;

    return (
        <Box>
            <BackLink />

            {/* Commercial header */}
            <GlassCard sx={{ mb: 2.5 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                        <Avatar
                            src={product.logo_url || undefined}
                            variant="rounded"
                            sx={{ width: 56, height: 56, bgcolor: "rgba(155,123,247,0.15)", color: ACCENT, fontWeight: 800, border: `1px solid ${BORDER}` }}
                        >
                            {product.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: TEXT, letterSpacing: "-0.01em" }}>
                                    {product.name}
                                </Typography>
                                <Chip
                                    label={product.status === "active" ? "Active" : "Disabled"}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        fontSize: "0.66rem",
                                        fontWeight: 700,
                                        color: product.status === "active" ? "#86efac" : "rgba(245,245,244,0.6)",
                                        bgcolor: product.status === "active" ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)",
                                        border: `1px solid ${product.status === "active" ? "rgba(52,211,153,0.3)" : BORDER}`,
                                    }}
                                />
                            </Stack>
                            {product.description && (
                                <Typography sx={{ color: TEXT_55, fontSize: "0.9rem", mt: 0.5, maxWidth: 560 }}>
                                    {product.description}
                                </Typography>
                            )}
                            <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}>
                                {product.homepage_url && (
                                    <MuiLink href={product.homepage_url} target="_blank" rel="noopener noreferrer" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: ACCENT, fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                                        <LanguageIcon sx={{ fontSize: 15 }} /> Homepage
                                    </MuiLink>
                                )}
                                {product.support_email && (
                                    <MuiLink href={`mailto:${product.support_email}`} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: TEXT_55, fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", "&:hover": { color: TEXT } }}>
                                        <MailOutlineIcon sx={{ fontSize: 15 }} /> {product.support_email}
                                    </MuiLink>
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                    <Button onClick={() => setEditOpen(true)} startIcon={<EditIcon sx={{ fontSize: "1.05rem !important" }} />} sx={{ ...GHOST_BTN, flexShrink: 0 }}>
                        Edit details
                    </Button>
                </Stack>
            </GlassCard>

            {/* Credentials */}
            <GlassCard sx={{ mb: 2.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: TEXT, mb: 0.4 }}>Credentials</Typography>
                <Typography sx={{ color: TEXT_55, fontSize: "0.85rem", mb: 2 }}>
                    Your service authenticates webhook calls with this product&rsquo;s shared secret.
                </Typography>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                    <Box>
                        <FieldLabel>Client ID</FieldLabel>
                        <CopyField value={product.client_id} onCopy={() => copy(product.client_id, "Client ID copied")} />
                    </Box>
                    <Box>
                        <FieldLabel>Shared secret</FieldLabel>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                                label={product.has_secret ? "Secret set" : "No secret"}
                                size="small"
                                sx={{ height: 30, borderRadius: "10px", fontSize: "0.8rem", color: product.has_secret ? "#86efac" : "rgba(245,245,244,0.6)", bgcolor: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}
                            />
                            <Button onClick={rotateSecret} startIcon={<AutorenewIcon sx={{ fontSize: "1rem !important" }} />} sx={{ ...GHOST_BTN, py: 0.7 }}>
                                Rotate
                            </Button>
                        </Stack>
                    </Box>
                </Box>
                <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                    <Meta label="Default sender" value={defaultSender ? defaultSender.email : "Tenant default"} />
                    <Meta label="Created" value={fmtDate(product.created_at)} />
                    <Meta label="Updated" value={fmtDate(product.updated_at)} />
                </Stack>
            </GlassCard>

            {/* Webhooks */}
            <WebhooksSection
                productId={id}
                origin={origin}
                webhooks={webhooks}
                templates={templates}
                templateVars={templateVars}
                expanded={expanded}
                setExpanded={setExpanded}
                onChanged={loadWebhooks}
                onCopy={copy}
                onToast={setToast}
            />

            {editOpen && (
                <EditDialog
                    product={product}
                    senders={senders}
                    onClose={() => setEditOpen(false)}
                    onSaved={(p) => {
                        setProduct(p);
                        setEditOpen(false);
                        setToast("Saved");
                    }}
                    onDelete={deleteProduct}
                />
            )}

            <SecretRevealDialog secret={revealSecret} onClose={() => setRevealSecret(null)} onCopy={() => revealSecret && copy(revealSecret, "Secret copied")} />

            <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast(null)} message={toast || ""} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
        </Box>
    );
}

function BackLink() {
    return (
        <Button component={Link} href="/dashboard/products" startIcon={<ArrowBackIcon sx={{ fontSize: "1.1rem !important" }} />} sx={{ textTransform: "none", color: TEXT_55, mb: 2, "&:hover": { color: TEXT } }}>
            Products
        </Button>
    );
}

function Meta({ label, value }: { label: string; value: string }) {
    return (
        <Box>
            <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(245,245,244,0.4)" }}>{label}</Typography>
            <Typography sx={{ fontSize: "0.85rem", color: "rgba(245,245,244,0.8)", mt: 0.3 }}>{value}</Typography>
        </Box>
    );
}

function CopyField({ value, onCopy }: { value: string; onCopy: () => void }) {
    return (
        <Stack direction="row" alignItems="center" sx={{ px: 1.4, py: 0.9, borderRadius: "10px", border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)", gap: 1 }}>
            <Typography sx={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.82rem", color: "rgba(245,245,244,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {value}
            </Typography>
            <Tooltip title="Copy" arrow>
                <IconButton size="small" onClick={onCopy} sx={{ color: TEXT_55, "&:hover": { color: ACCENT } }}>
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </Tooltip>
        </Stack>
    );
}

// ── Webhooks section ─────────────────────────────────────────────────────────

function WebhooksSection({
    productId,
    origin,
    webhooks,
    templates,
    templateVars,
    expanded,
    setExpanded,
    onChanged,
    onCopy,
    onToast,
}: {
    productId: string;
    origin: string;
    webhooks: Webhook[];
    templates: TemplateOpt[];
    templateVars: Map<string, string[]>;
    expanded: string | null;
    setExpanded: (v: string | null) => void;
    onChanged: () => void;
    onCopy: (text: string, label?: string) => void;
    onToast: (m: string) => void;
}) {
    const [createOpen, setCreateOpen] = useState(false);
    const [menuFor, setMenuFor] = useState<{ el: HTMLElement; wh: Webhook } | null>(null);
    const [renaming, setRenaming] = useState<Webhook | null>(null);

    async function patch(wh: Webhook, body: Record<string, unknown>) {
        await fetch(`/api/webhooks/${wh.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        onChanged();
    }
    async function remove(wh: Webhook) {
        await fetch(`/api/webhooks/${wh.id}`, { method: "DELETE" });
        onChanged();
        onToast("Webhook deleted");
    }

    return (
        <GlassCard>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: webhooks.length ? 2 : 0.5 }}>
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <WebhookIcon sx={{ fontSize: 19, color: ACCENT }} />
                        <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: TEXT }}>Webhooks</Typography>
                    </Stack>
                    <Typography sx={{ color: TEXT_55, fontSize: "0.85rem", mt: 0.4 }}>
                        Attach a template to this product — each webhook is a signed endpoint you trigger to send it.
                    </Typography>
                </Box>
                <Button
                    onClick={() => setCreateOpen(true)}
                    disabled={templates.length === 0}
                    startIcon={<AddIcon sx={{ fontSize: "1.1rem !important" }} />}
                    sx={{ ...PRIMARY_BTN, flexShrink: 0 }}
                >
                    New webhook
                </Button>
            </Stack>

            {webhooks.length === 0 ? (
                <Box sx={{ py: 3, textAlign: "center" }}>
                    <Typography sx={{ color: TEXT_55, fontSize: "0.9rem" }}>
                        {templates.length === 0 ? (
                            <>
                                Create a{" "}
                                <Box component={Link} href="/dashboard/templates" sx={{ color: ACCENT, fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                                    template
                                </Box>{" "}
                                first, then add a webhook to attach it here.
                            </>
                        ) : (
                            "No webhooks yet. Add one to attach a template and get a signed trigger endpoint."
                        )}
                    </Typography>
                </Box>
            ) : (
                <Stack spacing={1.5}>
                    {webhooks.map((wh) => {
                        const url = origin ? `${origin}/v1/hooks/${wh.endpoint_key}` : "Loading endpoint…";
                        const open = expanded === wh.id;
                        return (
                            <Box key={wh.id} sx={{ p: 1.6, borderRadius: "12px", border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.015)" }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography sx={{ fontFamily: "var(--font-geist-mono)", fontWeight: 700, fontSize: "0.9rem", color: TEXT }}>
                                                {wh.name}
                                            </Typography>
                                            <Chip
                                                label={wh.status === "active" ? "Active" : "Disabled"}
                                                size="small"
                                                sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, color: wh.status === "active" ? "#86efac" : "rgba(245,245,244,0.6)", bgcolor: wh.status === "active" ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)", border: `1px solid ${wh.status === "active" ? "rgba(52,211,153,0.3)" : BORDER}` }}
                                            />
                                        </Stack>
                                        <Typography sx={{ color: TEXT_55, fontSize: "0.8rem", mt: 0.3 }}>
                                            → template <strong style={{ color: "rgba(245,245,244,0.8)" }}>{wh.template_name}</strong>
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Button onClick={() => setExpanded(open ? null : wh.id)} sx={{ ...GHOST_BTN, py: 0.5, px: 1.4, fontSize: "0.78rem" }}>
                                            {open ? "Hide" : "Usage"}
                                        </Button>
                                        <IconButton size="small" onClick={(e) => setMenuFor({ el: e.currentTarget, wh })} sx={{ color: TEXT_55, "&:hover": { color: TEXT } }}>
                                            <MoreVertIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Stack>
                                </Stack>

                                <Stack direction="row" alignItems="center" sx={{ mt: 1.2, px: 1.2, py: 0.7, borderRadius: "8px", border: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.2)", gap: 1 }}>
                                    <Typography sx={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.76rem", color: "rgba(245,245,244,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                        {url}
                                    </Typography>
                                    <Tooltip title="Copy URL" arrow>
                                        <IconButton size="small" disabled={!origin} onClick={() => onCopy(url, "Endpoint copied")} sx={{ color: TEXT_55, "&:hover": { color: ACCENT } }}>
                                            <ContentCopyIcon sx={{ fontSize: 15 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>

                                <Collapse in={open} unmountOnExit>
                                    <Box sx={{ mt: 1.2 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
                                            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(245,245,244,0.4)" }}>
                                                Send with Node.js
                                            </Typography>
                                            <Tooltip title="Copy code sample" arrow>
                                                <IconButton size="small" onClick={() => onCopy(buildSnippet(origin, wh.endpoint_key, templateVars.get(wh.template_id) || []), "Code copied")} sx={{ color: TEXT_55, "&:hover": { color: ACCENT } }}>
                                                    <ContentCopyIcon sx={{ fontSize: 15 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                        <Box component="pre" sx={{ m: 0, p: 1.4, borderRadius: "8px", background: "#0b0d12", border: `1px solid ${BORDER}`, overflow: "auto", fontFamily: "var(--font-geist-mono)", fontSize: "0.74rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                                            {buildSnippet(origin, wh.endpoint_key, templateVars.get(wh.template_id) || [])}
                                        </Box>
                                        <Typography sx={{ color: "rgba(245,245,244,0.4)", fontSize: "0.74rem", mt: 0.8 }}>
                                            Sign every request with the product&rsquo;s shared secret. We reject signatures older than 5 minutes. The secret is shown once when you create or rotate it.
                                        </Typography>
                                    </Box>
                                </Collapse>
                            </Box>
                        );
                    })}
                </Stack>
            )}

            <Menu open={Boolean(menuFor)} anchorEl={menuFor?.el} onClose={() => setMenuFor(null)} {...menuProps}>
                <MenuItem
                    onClick={() => {
                        if (menuFor) setRenaming(menuFor.wh);
                        setMenuFor(null);
                    }}
                >
                    Rename
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (menuFor) patch(menuFor.wh, { status: menuFor.wh.status === "active" ? "disabled" : "active" });
                        setMenuFor(null);
                    }}
                >
                    {menuFor?.wh.status === "active" ? "Disable" : "Enable"}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (menuFor) remove(menuFor.wh);
                        setMenuFor(null);
                    }}
                    sx={{ color: "#f87171 !important" }}
                >
                    Delete
                </MenuItem>
            </Menu>

            {createOpen && (
                <CreateWebhookDialog
                    productId={productId}
                    templates={templates}
                    onClose={() => setCreateOpen(false)}
                    onCreated={() => {
                        setCreateOpen(false);
                        onChanged();
                        onToast("Webhook created");
                    }}
                    onError={onToast}
                />
            )}
            {renaming && (
                <RenameDialog
                    initial={renaming.name}
                    onClose={() => setRenaming(null)}
                    onSave={async (name) => {
                        await patch(renaming, { name });
                        setRenaming(null);
                    }}
                />
            )}
        </GlassCard>
    );
}

// ── Dialogs ──────────────────────────────────────────────────────────────────

const dialogPaper = {
    sx: { background: SURFACE, border: `1px solid ${BORDER}`, backgroundImage: "none", borderRadius: "16px", width: "100%", maxWidth: 460 },
} as const;

function EditDialog({
    product,
    senders,
    onClose,
    onSaved,
    onDelete,
}: {
    product: Product;
    senders: Sender[];
    onClose: () => void;
    onSaved: (p: Product) => void;
    onDelete: () => void;
}) {
    const [name, setName] = useState(product.name);
    const [description, setDescription] = useState(product.description ?? "");
    const [homepageUrl, setHomepageUrl] = useState(product.homepage_url ?? "");
    const [supportEmail, setSupportEmail] = useState(product.support_email ?? "");
    const [logoUrl, setLogoUrl] = useState(product.logo_url ?? "");
    const [defaultSenderId, setDefaultSenderId] = useState(product.default_sender_id ?? "");
    const [status, setStatus] = useState(product.status);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    async function save() {
        setSaving(true);
        try {
            const d: any = await fetch(`/api/products/${product.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, homepageUrl, supportEmail, logoUrl, defaultSenderId: defaultSenderId || null, status }),
            }).then((r) => r.json());
            if (d?.ok && d.product) onSaved(d.product as Product);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open onClose={onClose} slotProps={{ paper: dialogPaper }}>
            <DialogTitle sx={{ color: TEXT, fontWeight: 800 }}>Edit product</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <Box>
                        <FieldLabel>Name</FieldLabel>
                        <TextField value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" sx={darkField} />
                    </Box>
                    <Box>
                        <FieldLabel>Description</FieldLabel>
                        <TextField value={description} onChange={(e) => setDescription(e.target.value)} fullWidth size="small" multiline minRows={2} maxRows={4} sx={darkField} placeholder="What this product is — shown on its page." />
                    </Box>
                    <Box>
                        <FieldLabel>Homepage URL</FieldLabel>
                        <TextField value={homepageUrl} onChange={(e) => setHomepageUrl(e.target.value)} fullWidth size="small" sx={darkField} placeholder="https://yourproduct.com" />
                    </Box>
                    <Box>
                        <FieldLabel>Support email</FieldLabel>
                        <TextField value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} fullWidth size="small" sx={darkField} placeholder="support@yourproduct.com" />
                    </Box>
                    <Box>
                        <FieldLabel>Logo URL</FieldLabel>
                        <TextField value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} fullWidth size="small" sx={darkField} placeholder="https://…/logo.png" />
                    </Box>
                    <Box>
                        <FieldLabel>Default sender</FieldLabel>
                        <Select value={defaultSenderId} onChange={(e) => setDefaultSenderId(e.target.value)} fullWidth size="small" displayEmpty renderValue={(v) => (v ? senders.find((s) => s.id === v)?.email ?? "Unknown" : "Tenant default")} sx={selectSx} MenuProps={menuProps}>
                            <MenuItem value="">Tenant default</MenuItem>
                            {senders.map((s) => (
                                <MenuItem key={s.id} value={s.id}>{s.email}</MenuItem>
                            ))}
                        </Select>
                    </Box>
                    <Box>
                        <FieldLabel>Status</FieldLabel>
                        <Select value={status} onChange={(e) => setStatus(e.target.value)} fullWidth size="small" sx={selectSx} MenuProps={menuProps}>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="disabled">Disabled</MenuItem>
                        </Select>
                    </Box>

                    {confirmDelete ? (
                        <Box sx={{ p: 1.4, borderRadius: "10px", border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.06)" }}>
                            <Typography sx={{ color: "#fca5a5", fontSize: "0.82rem", mb: 1 }}>Delete this product? Its webhooks are removed. This can&rsquo;t be undone.</Typography>
                            <Stack direction="row" spacing={1}>
                                <Button onClick={onDelete} sx={{ textTransform: "none", fontWeight: 700, color: "#fff", background: "#dc2626", borderRadius: "9px", px: 2, "&:hover": { background: "#b91c1c" } }}>Delete</Button>
                                <Button onClick={() => setConfirmDelete(false)} sx={{ ...GHOST_BTN, py: 0.6 }}>Cancel</Button>
                            </Stack>
                        </Box>
                    ) : (
                        <Button onClick={() => setConfirmDelete(true)} startIcon={<DeleteOutlineIcon sx={{ fontSize: "1rem !important" }} />} sx={{ textTransform: "none", color: "#f87171", alignSelf: "flex-start", fontSize: "0.84rem", "&:hover": { background: "rgba(248,113,113,0.08)" } }}>
                            Delete product
                        </Button>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} sx={{ ...GHOST_BTN, py: 0.7 }}>Cancel</Button>
                <Button onClick={save} disabled={saving || !name.trim()} sx={PRIMARY_BTN}>
                    {saving ? "Saving…" : "Save"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function CreateWebhookDialog({
    productId,
    templates,
    onClose,
    onCreated,
    onError,
}: {
    productId: string;
    templates: TemplateOpt[];
    onClose: () => void;
    onCreated: () => void;
    onError: (m: string) => void;
}) {
    const [templateId, setTemplateId] = useState("");
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);

    async function create() {
        if (!templateId || !name.trim()) return;
        setBusy(true);
        try {
            const r = await fetch("/api/webhooks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ templateId, name: name.trim() }),
            });
            const d: any = await r.json().catch(() => ({}));
            if (r.ok && d?.ok) onCreated();
            else onError(d?.message || d?.error || "Could not create the webhook.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open onClose={onClose} slotProps={{ paper: dialogPaper }}>
            <DialogTitle sx={{ color: TEXT, fontWeight: 800 }}>New webhook</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <Box>
                        <FieldLabel>Template (required)</FieldLabel>
                        <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} fullWidth size="small" displayEmpty renderValue={(v) => (v ? templates.find((t) => t.id === v)?.name ?? "Unknown" : "Choose a template")} sx={selectSx} MenuProps={menuProps}>
                            {templates.map((t) => (
                                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                            ))}
                        </Select>
                    </Box>
                    <Box>
                        <FieldLabel>Event name (required)</FieldLabel>
                        <TextField value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" sx={darkField} placeholder="order.paid" onKeyDown={(e) => e.key === "Enter" && create()} />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} sx={{ ...GHOST_BTN, py: 0.7 }}>Cancel</Button>
                <Button onClick={create} disabled={busy || !templateId || !name.trim()} sx={PRIMARY_BTN}>
                    {busy ? "Creating…" : "Create"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function RenameDialog({ initial, onClose, onSave }: { initial: string; onClose: () => void; onSave: (name: string) => void }) {
    const [name, setName] = useState(initial);
    return (
        <Dialog open onClose={onClose} slotProps={{ paper: dialogPaper }}>
            <DialogTitle sx={{ color: TEXT, fontWeight: 800 }}>Rename webhook</DialogTitle>
            <DialogContent>
                <TextField autoFocus value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" sx={{ ...darkField, mt: 0.5 }} onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} sx={{ ...GHOST_BTN, py: 0.7 }}>Cancel</Button>
                <Button onClick={() => name.trim() && onSave(name.trim())} disabled={!name.trim()} sx={PRIMARY_BTN}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}

function SecretRevealDialog({ secret, onClose, onCopy }: { secret: string | null; onClose: () => void; onCopy: () => void }) {
    return (
        <Dialog open={Boolean(secret)} onClose={onClose} slotProps={{ paper: dialogPaper }}>
            <DialogTitle sx={{ color: TEXT, fontWeight: 800 }}>New shared secret</DialogTitle>
            <DialogContent>
                <Typography sx={{ color: "#fca5a5", fontSize: "0.84rem", mb: 1.5 }}>
                    Copy it now — it won&rsquo;t be shown again. The previous secret stays valid for a short grace window.
                </Typography>
                <Stack direction="row" alignItems="center" sx={{ px: 1.4, py: 1, borderRadius: "10px", border: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.25)", gap: 1 }}>
                    <Typography sx={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.82rem", color: "#86efac", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {secret}
                    </Typography>
                    <Tooltip title="Copy" arrow>
                        <IconButton size="small" onClick={onCopy} sx={{ color: TEXT_55, "&:hover": { color: ACCENT } }}>
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} sx={PRIMARY_BTN}>Done</Button>
            </DialogActions>
        </Dialog>
    );
}

function fmtDate(s: string): string {
    try {
        return new Date(s.replace(" ", "T") + "Z").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
        return s;
    }
}
