"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DataObjectIcon from "@mui/icons-material/DataObject";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Box, Button, Chip, CircularProgress, MenuItem, Select, Stack, TextField, Tooltip, Typography } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_BG_COLOR, wrapEmailHtml } from "@/lib/render";
import { extractVariables } from "@/lib/template-vars";
import { GHOST_BTN } from "./dashboard-ui";
import { BORDER, GlassCard, SURFACE } from "./glass-card";
import ComposerToolbar from "./composer-toolbar";
import LixEditor from "./lix-editor";
import TemplateTestDialog from "./template-test-dialog";

const ACCENT = "#9b7bf7";
const TEXT_60 = "rgba(245,245,244,0.6)";

// Common email canvas colours offered as quick swatches (plus a custom picker).
const BG_PRESETS = ["#f4f4f7", "#ffffff", "#eef2ff", "#f0fdf4", "#0b0d12"];

// Email clients don't render diagrams/equations/PDF/TOC/syntax-highlighting —
// keep the editor focused on what survives in an inbox.
const EMAIL_FEATURES = {
    equations: false,
    mermaid: false,
    tableOfContents: false,
    pdf: false,
    codeHighlighting: false,
    linkPreview: false,
    dates: false,
    images: true,
    buttons: true,
    markdownLinks: true,
};

const darkField = {
    "& .MuiOutlinedInput-root": {
        color: "#f5f5f4",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.02)",
        "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
        "&:hover fieldset": { borderColor: "rgba(155,123,247,0.4)" },
        "&.Mui-focused fieldset": { borderColor: ACCENT },
    },
    "& .MuiInputBase-input": { fontSize: "0.95rem", py: 1.1 },
    "& .MuiInputBase-input::placeholder": { color: "rgba(245,245,244,0.35)", opacity: 1 },
};

const SAVE_BTN_SX = {
    textTransform: "none" as const,
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "#fff",
    px: 2.6,
    py: 1.1,
    borderRadius: "10px",
    background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
    boxShadow: "0 6px 18px rgba(124,92,255,0.32)",
    "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
    "&.Mui-disabled": { background: "rgba(255,255,255,0.06)", color: "rgba(245,245,244,0.4)" },
};

/**
 * lixeditor `uploadFile` hook: send a dropped/pasted image to our host upload
 * endpoint and return the optimized Cloudinary URL (never base64 in the email).
 */
async function uploadTemplateImage(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads/image", { method: "POST", body: form });
    const d: any = await res.json().catch(() => ({}));
    if (!res.ok || !d?.url) throw new Error(d?.message || d?.error || "Image upload failed");
    return d.url as string;
}

export default function TemplateComposer({ templateId }: { templateId?: string }) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [subject, setSubject] = useState("");
    const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
    const [productId, setProductId] = useState("");
    const [initialContent, setInitialContent] = useState<any[] | undefined>(undefined);
    const [blocks, setBlocks] = useState<any[]>([]);
    const apiRef = useRef<any>(null);
    // Images uploaded during this edit session — sent on save so the server can
    // delete any that didn't end up in the final content.
    const uploadedImagesRef = useRef<string[]>([]);

    // Single upload path for both drag/drop/paste (editor hook) and the toolbar:
    // upload to Cloudinary and remember the URL for cleanup.
    const handleUpload = useCallback(async (file: File) => {
        const url = await uploadTemplateImage(file);
        uploadedImagesRef.current.push(url);
        return url;
    }, []);

    const [loading, setLoading] = useState(Boolean(templateId));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedMsg, setSavedMsg] = useState(false);
    const [testOpen, setTestOpen] = useState(false);

    // Email canvas colour + true-to-inbox preview.
    const [bgColor, setBgColor] = useState(DEFAULT_BG_COLOR);
    const [showPreview, setShowPreview] = useState(true);
    const [previewHtml, setPreviewHtml] = useState("");

    // Load the tenant's products for the picker.
    useEffect(() => {
        let alive = true;
        fetch("/api/products")
            .then((r) => r.json())
            .then((d: any) => {
                if (!alive) return;
                if (d?.ok && Array.isArray(d.products)) {
                    setProducts(
                        d.products.map((p: any) => ({ id: String(p.id), name: String(p.name) })),
                    );
                }
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (!templateId) return;
        let alive = true;
        fetch(`/api/templates/${templateId}`)
            .then((r) => r.json())
            .then((d: any) => {
                if (!alive) return;
                if (d?.ok) {
                    const t = d.template;
                    setName(t.name || "");
                    setSlug(t.slug || "");
                    setSubject(t.subject || "");
                    setProductId(t.product_id ? String(t.product_id) : "");
                    setBgColor(t.bg_color || DEFAULT_BG_COLOR);
                    setInitialContent(Array.isArray(t.content) ? t.content : undefined);
                    setBlocks(Array.isArray(t.content) ? t.content : []);
                } else {
                    setError("Could not load this template.");
                }
            })
            .catch(() => alive && setError("Could not load this template."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [templateId]);

    // Live {{variable}} detection from the subject + editor content.
    const variables = useMemo(
        () => extractVariables(subject, JSON.stringify(blocks)),
        [subject, blocks],
    );

    // Gate saving: require the details (name + subject) and a non-trivial body.
    const bodyText = useMemo(() => blocksToPlainText(blocks), [blocks]);
    // New templates must belong to a product; editing keeps the existing rules.
    const canSave =
        name.trim().length > 0 &&
        subject.trim().length > 0 &&
        bodyText.length > 2 &&
        (Boolean(templateId) || productId.length > 0);

    // Debounced true-to-inbox preview: drop the editor's email-safe HTML into the
    // real email shell (chosen canvas colour + white card) so the user sees what
    // the recipient will see. {{variables}} are left literal in the preview.
    useEffect(() => {
        if (!showPreview) return;
        const id = setTimeout(() => {
            try {
                const html = apiRef.current ? apiRef.current.getHTML() : "";
                setPreviewHtml(wrapEmailHtml(html, bgColor));
            } catch {
                /* editor not mounted yet */
            }
        }, 350);
        return () => clearTimeout(id);
    }, [blocks, bgColor, showPreview]);

    async function save() {
        if (saving) return;
        if (!name.trim()) {
            setError("Give the template a name.");
            return;
        }
        setSaving(true);
        setError(null);
        setSavedMsg(false);
        try {
            const contentJson = apiRef.current ? apiRef.current.getBlocks() : blocks;
            const contentHtml = apiRef.current ? await apiRef.current.getHTML() : "";
            const payload: any = {
                name: name.trim(),
                slug: slug.trim() || undefined,
                subject,
                contentJson,
                contentHtml,
                bgColor,
                uploadedImages: uploadedImagesRef.current,
            };
            // Templates belong to a product; required on create.
            if (productId) payload.productId = productId;
            const url = templateId ? `/api/templates/${templateId}` : "/api/templates";
            const res = await fetch(url, {
                method: templateId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const d: any = await res.json().catch(() => ({}));
            if (!res.ok || !d?.ok) throw new Error(d?.message || d?.error || "Could not save.");
            if (!templateId && d.template?.id) {
                router.replace(`/dashboard/templates/${d.template.id}`);
            } else {
                setSavedMsg(true);
                setTimeout(() => setSavedMsg(false), 2500);
            }
        } catch (e: any) {
            setError(e?.message || "Could not save.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}>
                <CircularProgress sx={{ color: ACCENT }} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3, gap: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                    <Button
                        component={Link}
                        href="/dashboard/templates"
                        startIcon={<ArrowBackIcon sx={{ fontSize: "1.1rem !important" }} />}
                        sx={{ textTransform: "none", color: TEXT_60, minWidth: 0, "&:hover": { color: "#f5f5f4" } }}
                    >
                        Templates
                    </Button>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: "#f5f5f4", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {templateId ? name || "Edit template" : "New template"}
                    </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    {savedMsg && <Typography sx={{ color: "#86efac", fontSize: "0.85rem" }}>Saved</Typography>}
                    <Tooltip title={templateId ? "" : "Save the template first"} arrow disableHoverListener={Boolean(templateId)}>
                        <span>
                            <Button
                                onClick={() => setTestOpen(true)}
                                disabled={!templateId}
                                startIcon={<SendIcon sx={{ fontSize: "1.05rem !important" }} />}
                                sx={{
                                    ...GHOST_BTN,
                                    fontSize: "0.9rem",
                                    "&.Mui-disabled": { color: "rgba(245,245,244,0.4)", borderColor: "rgba(255,255,255,0.07)" },
                                }}
                            >
                                Test send
                            </Button>
                        </span>
                    </Tooltip>
                    <Button
                        onClick={save}
                        disabled={saving || !canSave}
                        startIcon={saving ? <CircularProgress size={16} sx={{ color: "rgba(245,245,244,0.6)" }} /> : <SaveIcon sx={{ fontSize: "1.1rem !important" }} />}
                        sx={SAVE_BTN_SX}
                    >
                        {templateId ? "Save changes" : "Create template"}
                    </Button>
                </Stack>
            </Stack>

            {error && (
                <Box sx={{ mb: 2.5, px: 2, py: 1.2, borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: "0.85rem" }}>
                    {error}
                </Box>
            )}

            <Stack spacing={2.5}>

                <GlassCard sx={{ p: 0, overflow: "hidden" }}>
                    <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#f5f5f4" }}>Compose the email body here - supports Rich Text</Typography>
                    </Box>
                    {/* Extra left padding so BlockNote's block handles (+ / drag)
                        — which sit in a left gutter outside the text — stay in view. */}
                    <Box sx={{ minHeight: 450, py: { xs: 2, md: 3 }, pr: { xs: 2, md: 3 }, pl: { xs: 5, md: 7, lg: 9 } }}>
                        <LixEditor
                            initialContent={initialContent}
                            features={EMAIL_FEATURES}
                            placeholder="Compose your email… type '/' for blocks, {{variables}} for dynamic values"
                            uploadFile={handleUpload}
                            variableSuggestions={variables}
                            buttonDefaults={{ color: "#7c5cff", align: "left" }}
                            onReady={(api) => {
                                apiRef.current = api;
                            }}
                            onChange={(ed: any) => setBlocks(ed?.document ?? [])}
                        />
                    </Box>
                    <ComposerToolbar
                        getEditor={() => apiRef.current?.getEditor?.() ?? null}
                        uploadImage={handleUpload}
                    />
                </GlassCard>

                {/* Inbox preview */}
                <GlassCard sx={{ p: 0, overflow: "hidden" }}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap", gap: 1 }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <VisibilityIcon sx={{ fontSize: 18, color: ACCENT }} />
                            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#f5f5f4" }}>
                                Inbox preview
                            </Typography>
                            <Typography sx={{ color: "rgba(245,245,244,0.45)", fontSize: "0.82rem", display: { xs: "none", md: "block" } }}>
                                — exactly how it lands in the recipient's inbox
                            </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography sx={{ color: TEXT_60, fontSize: "0.8rem", mr: 0.3 }}>Background</Typography>
                            {BG_PRESETS.map((c) => (
                                <Box
                                    key={c}
                                    onClick={() => setBgColor(c)}
                                    title={c}
                                    sx={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        background: c,
                                        border:
                                            bgColor.toLowerCase() === c.toLowerCase()
                                                ? `2px solid ${ACCENT}`
                                                : "1px solid rgba(255,255,255,0.18)",
                                    }}
                                />
                            ))}
                            <Box
                                component="label"
                                title="Custom colour"
                                sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 22,
                                    height: 22,
                                    borderRadius: "6px",
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    border: "1px solid rgba(255,255,255,0.18)",
                                    background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                                }}
                            >
                                <Box
                                    component="input"
                                    type="color"
                                    value={bgColor}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBgColor(e.target.value)}
                                    sx={{ width: 0, height: 0, opacity: 0, p: 0, m: 0, border: 0 }}
                                />
                            </Box>
                            <Button
                                onClick={() => setShowPreview((v) => !v)}
                                sx={{ ...GHOST_BTN, py: 0.5, px: 1.5, fontSize: "0.8rem", ml: 0.5 }}
                            >
                                {showPreview ? "Hide" : "Show"}
                            </Button>
                        </Stack>
                    </Stack>
                    {showPreview && (
                        <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                            <Box sx={{ mb: 1.2, px: 0.5 }}>
                                <Typography sx={{ color: "rgba(245,245,244,0.45)", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    Subject
                                </Typography>
                                <Typography sx={{ color: "#f5f5f4", fontSize: "0.95rem", fontWeight: 600 }}>
                                    {subject.trim() || "(no subject)"}
                                </Typography>
                            </Box>
                            <Box
                                component="iframe"
                                title="Email inbox preview"
                                srcDoc={previewHtml}
                                sx={{
                                    width: "100%",
                                    height: 560,
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: "10px",
                                    background: "#fff",
                                    display: "block",
                                }}
                            />
                        </Box>
                    )}
                </GlassCard>

                {/* Variables */}
                <GlassCard>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: variables.length ? 1.5 : 0 }}>
                        <DataObjectIcon sx={{ fontSize: 18, color: ACCENT }} />
                        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#f5f5f4" }}>
                            Variables {variables.length > 0 && `(${variables.length})`}
                        </Typography>
                        <Typography sx={{ color: "rgba(245,245,244,0.45)", fontSize: "0.82rem" }}>
                            — detected from {"{{double braces}}"} in the subject and body
                        </Typography>
                    </Stack>
                    {variables.length > 0 ? (
                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                            {variables.map((v) => (
                                <Chip
                                    key={v}
                                    label={`{{${v}}}`}
                                    size="small"
                                    sx={{
                                        fontFamily: "var(--font-geist-mono)",
                                        fontSize: "0.74rem",
                                        color: "#c4b5fd",
                                        bgcolor: "rgba(155,123,247,0.12)",
                                        border: "1px solid rgba(155,123,247,0.3)",
                                    }}
                                />
                            ))}
                        </Stack>
                    ) : (
                        <Typography sx={{ color: TEXT_60, fontSize: "0.85rem" }}>
                            No variables yet. Type{" "}
                            <Box component="span" sx={{ fontFamily: "var(--font-geist-mono)", color: "#86efac" }}>
                                {"{{name}}"}
                            </Box>{" "}
                            in the subject or body to add one.
                        </Typography>
                    )}
                </GlassCard>

                {/* Metadata — bottom */}
                <GlassCard>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#f5f5f4", mb: 2 }}>
                        Details
                    </Typography>
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                        <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                            <FieldLabel>Product</FieldLabel>
                            {!templateId && products.length === 0 ? (
                                <Typography sx={{ color: TEXT_60, fontSize: "0.85rem", py: 1 }}>
                                    No products yet.{" "}
                                    <Box
                                        component={Link}
                                        href="/dashboard/products"
                                        sx={{
                                            color: ACCENT,
                                            fontWeight: 600,
                                            textDecoration: "none",
                                            "&:hover": { textDecoration: "underline" },
                                        }}
                                    >
                                        Create a product first
                                    </Box>{" "}
                                    to add a template.
                                </Typography>
                            ) : (
                                <Select
                                    value={productId}
                                    onChange={(e) => setProductId(e.target.value)}
                                    fullWidth
                                    size="small"
                                    displayEmpty
                                    renderValue={(val) =>
                                        val
                                            ? products.find((p) => p.id === val)?.name ?? "Unknown product"
                                            : "Select a product"
                                    }
                                    sx={{
                                        color: "#f5f5f4",
                                        borderRadius: "10px",
                                        background: "rgba(255,255,255,0.02)",
                                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.12)" },
                                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(155,123,247,0.4)" },
                                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
                                        "& .MuiSelect-icon": { color: "rgba(245,245,244,0.4)" },
                                        "& .MuiSelect-select": { fontSize: "0.95rem", py: 1.1 },
                                    }}
                                    MenuProps={{
                                        slotProps: {
                                            paper: {
                                                sx: {
                                                    background: SURFACE,
                                                    border: `1px solid ${BORDER}`,
                                                    backgroundImage: "none",
                                                    "& .MuiMenuItem-root": { color: "#f5f5f4", fontSize: "0.9rem" },
                                                    "& .MuiMenuItem-root.Mui-selected": {
                                                        background: "rgba(155,123,247,0.12)",
                                                    },
                                                },
                                            },
                                        },
                                    }}
                                >
                                    {products.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            )}
                        </Box>
                        <Box>
                            <FieldLabel>Name</FieldLabel>
                            <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="Welcome email" fullWidth size="small" sx={darkField} />
                        </Box>
                        <Box>
                            <FieldLabel>Slug</FieldLabel>
                            <TextField value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="welcome-email (auto from name)" fullWidth size="small" sx={darkField} />
                        </Box>
                        <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                            <FieldLabel>Subject</FieldLabel>
                            <TextField value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Welcome to {{product}}, {{name}}!" fullWidth size="small" sx={darkField} />
                        </Box>
                    </Box>
                </GlassCard>

                {/* Create / save — below */}
                <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1.5}>
                    {savedMsg && <Typography sx={{ color: "#86efac", fontSize: "0.85rem" }}>Saved</Typography>}
                    {!canSave && (
                        <Typography sx={{ color: "rgba(245,245,244,0.45)", fontSize: "0.8rem" }}>
                            {!templateId && !productId
                                ? "Select a product, then add a name, subject, and a bit of body content to continue."
                                : "Add a name, subject, and a bit of body content to continue."}
                        </Typography>
                    )}
                    <Button
                        onClick={save}
                        disabled={saving || !canSave}
                        startIcon={saving ? <CircularProgress size={16} sx={{ color: "rgba(245,245,244,0.6)" }} /> : <SaveIcon sx={{ fontSize: "1.1rem !important" }} />}
                        sx={SAVE_BTN_SX}
                    >
                        {templateId ? "Save changes" : "Create template"}
                    </Button>
                </Stack>
            </Stack>

            {templateId && (
                <TemplateTestDialog
                    open={testOpen}
                    onClose={() => setTestOpen(false)}
                    templateId={templateId}
                    subject={subject}
                    variables={variables}
                    getContentHtml={async () => (apiRef.current ? await apiRef.current.getHTML() : "")}
                    bgColor={bgColor}
                />
            )}
        </Box>
    );
}

/** Flatten a BlockNote document to its plain text (for the min-length gate). */
function blocksToPlainText(blocks: any[]): string {
    if (!Array.isArray(blocks)) return "";
    let out = "";
    for (const b of blocks) {
        if (Array.isArray(b?.content)) {
            for (const c of b.content) if (typeof c?.text === "string") out += c.text;
        }
        if (Array.isArray(b?.children)) out += ` ${blocksToPlainText(b.children)}`;
        out += " ";
    }
    return out.trim();
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(245,245,244,0.4)", mb: 0.7 }}>
            {children}
        </Typography>
    );
}
