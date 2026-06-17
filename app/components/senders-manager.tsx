"use client";

import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DnsIcon from "@mui/icons-material/Dns";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import SendIcon from "@mui/icons-material/Send";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import {
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
    InputAdornment,
    Link as MuiLink,
    Menu,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useState } from "react";
import { EmptyState, GHOST_BTN, PRIMARY_BTN } from "./dashboard-ui";
import { BORDER, GlassCard, SURFACE } from "./glass-card";

// ── Palette ─────────────────────────────────────────────────────────────────
const ACCENT = "#9b7bf7";
const GREEN = "#86efac";
const RED = "#fca5a5";
const TEXT = "#f5f5f4";
const TEXT_55 = "rgba(245,245,244,0.55)";
const TEXT_40 = "rgba(245,245,244,0.4)";

const GMAIL_HELP = "https://support.google.com/accounts/answer/185833";

// ── Types ───────────────────────────────────────────────────────────────────
interface Sender {
    id: string;
    email: string;
    display_name: string | null;
    smtp_host: string;
    smtp_port: number;
    smtp_secure: string; // "tls" | "starttls"
    username: string | null;
    status: string; // "active" | "disabled"
    last_verified_at: string | null;
    created_at: string;
}

// ── Relative-time formatter (no deps) ───────────────────────────────────────
function relativeTime(iso: string | null): string {
    if (!iso) return "";
    // D1 stores `datetime('now')` as "YYYY-MM-DD HH:MM:SS" (UTC, no tz). Treat as UTC.
    const normalized = iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`;
    const then = new Date(normalized).getTime();
    if (Number.isNaN(then)) return "";
    const diff = Date.now() - then;
    const sec = Math.round(diff / 1000);
    if (sec < 5) return "just now";
    if (sec < 60) return `${sec} seconds ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    const day = Math.round(hr / 24);
    if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
    const mon = Math.round(day / 30);
    if (mon < 12) return `${mon} month${mon === 1 ? "" : "s"} ago`;
    const yr = Math.round(mon / 12);
    return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

// ── Shared dark TextField styling (matches workspace-name-form) ──────────────
const darkField = {
    "& .MuiOutlinedInput-root": {
        color: TEXT,
        borderRadius: "10px",
        background: "rgba(255,255,255,0.02)",
        "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
        "&:hover fieldset": { borderColor: "rgba(155,123,247,0.4)" },
        "&.Mui-focused fieldset": { borderColor: ACCENT },
        "&.Mui-disabled fieldset": { borderColor: "rgba(255,255,255,0.07)" },
    },
    "& .MuiInputBase-input": { fontSize: "0.92rem", py: 1.05 },
    "& .MuiInputBase-input.Mui-disabled": {
        WebkitTextFillColor: TEXT_40,
    },
    "& .MuiInputBase-input::placeholder": { color: "rgba(245,245,244,0.35)", opacity: 1 },
    "& .MuiInputAdornment-root .MuiSvgIcon-root": { color: TEXT_40 },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            sx={{
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: TEXT_40,
                mb: 0.7,
            }}
        >
            {children}
        </Typography>
    );
}

function FieldHelp({ children }: { children: React.ReactNode }) {
    return (
        <Typography sx={{ fontSize: "0.74rem", color: TEXT_40, mt: 0.6 }}>{children}</Typography>
    );
}

// ── Status chip ─────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
    const active = status === "active";
    return (
        <Chip
            label={active ? "Active" : "Disabled"}
            size="small"
            sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.02em",
                color: active ? GREEN : TEXT_55,
                bgcolor: active ? "rgba(134,239,172,0.1)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${active ? "rgba(134,239,172,0.28)" : BORDER}`,
            }}
        />
    );
}

// ── Gmail hint note ─────────────────────────────────────────────────────────
function GmailHint() {
    return (
        <Box
            sx={{
                display: "flex",
                gap: 1.2,
                p: 1.6,
                borderRadius: "10px",
                background: "rgba(95,182,255,0.06)",
                border: "1px solid rgba(95,182,255,0.22)",
            }}
        >
            <InfoOutlinedIcon sx={{ fontSize: 18, color: "#5fb6ff", flexShrink: 0, mt: 0.2 }} />
            <Typography sx={{ fontSize: "0.8rem", color: "rgba(245,245,244,0.7)", lineHeight: 1.6 }}>
                For Gmail you need 2-Step Verification enabled, then a 16-character{" "}
                <MuiLink
                    href={GMAIL_HELP}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                        color: "#5fb6ff",
                        fontWeight: 600,
                        textDecorationColor: "rgba(95,182,255,0.4)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.3,
                    }}
                >
                    App Password
                    <OpenInNewIcon sx={{ fontSize: 13 }} />
                </MuiLink>{" "}
                — not your normal account password. The proven default is port 465 / Implicit TLS.
            </Typography>
        </Box>
    );
}

// ── Connect / Edit dialog ───────────────────────────────────────────────────
interface FormState {
    email: string;
    displayName: string;
    appPassword: string;
    smtpHost: string;
    smtpPort: string;
    smtpSecure: string;
    username: string;
}

function emptyForm(): FormState {
    return {
        email: "",
        displayName: "",
        appPassword: "",
        smtpHost: "smtp.gmail.com",
        smtpPort: "465",
        smtpSecure: "tls",
        username: "",
    };
}

function SenderDialog({
    open,
    editing,
    onClose,
    onSaved,
}: {
    open: boolean;
    editing: Sender | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = editing != null;
    const [form, setForm] = useState<FormState>(emptyForm());
    const [showPass, setShowPass] = useState(false);
    const [advanced, setAdvanced] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset the form each time the dialog opens (for create or a specific sender).
    useEffect(() => {
        if (!open) return;
        setError(null);
        setSaving(false);
        setShowPass(false);
        setAdvanced(false);
        if (editing) {
            setForm({
                email: editing.email,
                displayName: editing.display_name || "",
                appPassword: "",
                smtpHost: editing.smtp_host || "smtp.gmail.com",
                smtpPort: String(editing.smtp_port ?? 465),
                smtpSecure: editing.smtp_secure || "tls",
                username: editing.username || "",
            });
        } else {
            setForm(emptyForm());
        }
    }, [open, editing]);

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const canSubmit =
        !saving &&
        (isEdit || emailValid) &&
        (isEdit || form.appPassword.length >= 4);

    async function submit() {
        if (!canSubmit) return;
        setSaving(true);
        setError(null);

        const port = Number(form.smtpPort);
        const payload: Record<string, unknown> = {
            displayName: form.displayName.trim() || null,
            smtpHost: form.smtpHost.trim() || "smtp.gmail.com",
            smtpPort: Number.isFinite(port) ? port : undefined,
            smtpSecure: form.smtpSecure,
            username: form.username.trim() || null,
        };
        if (!isEdit) payload.email = form.email.trim();
        // Send appPassword on create always; on edit only when rotating.
        if (!isEdit || form.appPassword.length > 0) payload.appPassword = form.appPassword;

        try {
            const url = isEdit ? `/api/senders/${editing.id}` : "/api/senders";
            const res = await fetch(url, {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data: any = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                throw new Error(data?.message || data?.error || "Could not save the sender.");
            }
            onSaved();
            onClose();
        } catch (e: any) {
            setError(e?.message || "Could not save the sender.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog
            open={open}
            onClose={() => !saving && onClose()}
            fullWidth
            maxWidth="sm"
            slotProps={{
                paper: {
                    sx: {
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                        borderRadius: "16px",
                        backgroundImage: "none",
                    },
                },
            }}
        >
            <DialogTitle sx={{ color: TEXT, fontWeight: 800, fontSize: "1.2rem", pb: 1 }}>
                {isEdit ? "Edit sender" : "Connect a sender"}
            </DialogTitle>
            <DialogContent sx={{ pb: 1 }}>
                <Stack spacing={2.2} sx={{ mt: 0.5 }}>
                    <GmailHint />

                    <Box>
                        <FieldLabel>Email {isEdit ? "" : "(required)"}</FieldLabel>
                        <TextField
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="you@yourdomain.com"
                            fullWidth
                            size="small"
                            disabled={isEdit}
                            sx={darkField}
                        />
                        {isEdit && (
                            <FieldHelp>The email is the unique key and can&rsquo;t be changed.</FieldHelp>
                        )}
                    </Box>

                    <Box>
                        <FieldLabel>Display name (optional)</FieldLabel>
                        <TextField
                            value={form.displayName}
                            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                            placeholder="Acme Notifications"
                            fullWidth
                            size="small"
                            sx={darkField}
                        />
                    </Box>

                    <Box>
                        <FieldLabel>
                            {isEdit ? "Rotate app password (optional)" : "App password (required)"}
                        </FieldLabel>
                        <TextField
                            value={form.appPassword}
                            onChange={(e) => setForm((f) => ({ ...f, appPassword: e.target.value }))}
                            placeholder={isEdit ? "Leave blank to keep current" : "16-character app password"}
                            fullWidth
                            size="small"
                            type={showPass ? "text" : "password"}
                            autoComplete="new-password"
                            sx={darkField}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPass((v) => !v)}
                                            edge="end"
                                            size="small"
                                            sx={{ color: TEXT_40 }}
                                            aria-label={showPass ? "Hide password" : "Show password"}
                                        >
                                            {showPass ? (
                                                <VisibilityOff sx={{ fontSize: 18 }} />
                                            ) : (
                                                <Visibility sx={{ fontSize: 18 }} />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    {/* Advanced (SMTP) */}
                    <Box>
                        <Button
                            onClick={() => setAdvanced((v) => !v)}
                            endIcon={
                                <ExpandMoreIcon
                                    sx={{
                                        transition: "transform .2s",
                                        transform: advanced ? "rotate(180deg)" : "none",
                                    }}
                                />
                            }
                            sx={{
                                textTransform: "none",
                                color: TEXT_55,
                                fontWeight: 600,
                                fontSize: "0.84rem",
                                px: 0,
                                "&:hover": { background: "transparent", color: TEXT },
                            }}
                        >
                            Advanced (SMTP)
                        </Button>
                        <Collapse in={advanced}>
                            <Stack spacing={2} sx={{ pt: 1 }}>
                                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" } }}>
                                    <Box>
                                        <FieldLabel>SMTP host</FieldLabel>
                                        <TextField
                                            value={form.smtpHost}
                                            onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
                                            placeholder="smtp.gmail.com"
                                            fullWidth
                                            size="small"
                                            sx={darkField}
                                        />
                                    </Box>
                                    <Box>
                                        <FieldLabel>Port</FieldLabel>
                                        <TextField
                                            value={form.smtpPort}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    smtpPort: e.target.value.replace(/[^0-9]/g, ""),
                                                }))
                                            }
                                            placeholder="465"
                                            fullWidth
                                            size="small"
                                            inputProps={{ inputMode: "numeric" }}
                                            sx={darkField}
                                        />
                                    </Box>
                                </Box>
                                <Box>
                                    <FieldLabel>Security</FieldLabel>
                                    <Select
                                        value={form.smtpSecure}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setForm((f) => ({
                                                ...f,
                                                smtpSecure: next,
                                                // Nudge the port to the conventional value for the mode.
                                                smtpPort:
                                                    next === "starttls" && f.smtpPort === "465"
                                                        ? "587"
                                                        : next === "tls" && f.smtpPort === "587"
                                                          ? "465"
                                                          : f.smtpPort,
                                            }));
                                        }}
                                        fullWidth
                                        size="small"
                                        sx={{
                                            color: TEXT,
                                            borderRadius: "10px",
                                            background: "rgba(255,255,255,0.02)",
                                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.12)" },
                                            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(155,123,247,0.4)" },
                                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
                                            "& .MuiSelect-icon": { color: TEXT_40 },
                                            "& .MuiSelect-select": { fontSize: "0.92rem", py: 1.05 },
                                        }}
                                        MenuProps={{
                                            slotProps: {
                                                paper: {
                                                    sx: {
                                                        background: SURFACE,
                                                        border: `1px solid ${BORDER}`,
                                                        backgroundImage: "none",
                                                        "& .MuiMenuItem-root": { color: TEXT, fontSize: "0.9rem" },
                                                        "& .MuiMenuItem-root.Mui-selected": {
                                                            background: "rgba(155,123,247,0.12)",
                                                        },
                                                    },
                                                },
                                            },
                                        }}
                                    >
                                        <MenuItem value="tls">Implicit TLS (465)</MenuItem>
                                        <MenuItem value="starttls">STARTTLS (587)</MenuItem>
                                    </Select>
                                </Box>
                                <Box>
                                    <FieldLabel>Username (optional)</FieldLabel>
                                    <TextField
                                        value={form.username}
                                        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                                        placeholder="Defaults to the email"
                                        fullWidth
                                        size="small"
                                        sx={darkField}
                                    />
                                    <FieldHelp>Defaults to the email if left blank.</FieldHelp>
                                </Box>
                            </Stack>
                        </Collapse>
                    </Box>

                    {error && (
                        <Stack direction="row" spacing={0.8} alignItems="flex-start">
                            <ErrorOutlineIcon sx={{ fontSize: 16, color: RED, mt: 0.2 }} />
                            <Typography sx={{ fontSize: "0.82rem", color: RED, lineHeight: 1.5 }}>
                                {error}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2.2, gap: 1 }}>
                <Button onClick={onClose} disabled={saving} sx={GHOST_BTN}>
                    Cancel
                </Button>
                <Button
                    onClick={submit}
                    disabled={!canSubmit}
                    sx={{
                        ...PRIMARY_BTN,
                        minWidth: 130,
                        "&.Mui-disabled": {
                            background: "rgba(255,255,255,0.06)",
                            color: "rgba(245,245,244,0.35)",
                            boxShadow: "none",
                        },
                    }}
                >
                    {saving ? (
                        <CircularProgress size={18} sx={{ color: "rgba(245,245,244,0.6)" }} />
                    ) : isEdit ? (
                        "Save changes"
                    ) : (
                        "Connect sender"
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ── Delete confirm dialog ───────────────────────────────────────────────────
function DeleteDialog({
    sender,
    onClose,
    onDeleted,
}: {
    sender: Sender | null;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (sender) {
            setBusy(false);
            setError(null);
        }
    }, [sender]);

    async function confirm() {
        if (!sender || busy) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/senders/${sender.id}`, { method: "DELETE" });
            const data: any = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                throw new Error(data?.message || data?.error || "Could not remove the sender.");
            }
            onDeleted();
            onClose();
        } catch (e: any) {
            setError(e?.message || "Could not remove the sender.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog
            open={sender != null}
            onClose={() => !busy && onClose()}
            fullWidth
            maxWidth="xs"
            slotProps={{
                paper: {
                    sx: {
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                        borderRadius: "16px",
                        backgroundImage: "none",
                    },
                },
            }}
        >
            <DialogTitle sx={{ color: TEXT, fontWeight: 800, fontSize: "1.1rem" }}>
                Remove sender
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ color: TEXT_55, fontSize: "0.9rem", lineHeight: 1.6 }}>
                    Remove sender <strong style={{ color: TEXT }}>{sender?.email}</strong>? Products
                    using it will fall back to no default sender.
                </Typography>
                {error && (
                    <Stack direction="row" spacing={0.8} alignItems="flex-start" sx={{ mt: 1.6 }}>
                        <ErrorOutlineIcon sx={{ fontSize: 16, color: RED, mt: 0.2 }} />
                        <Typography sx={{ fontSize: "0.82rem", color: RED }}>{error}</Typography>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2.2, gap: 1 }}>
                <Button onClick={onClose} disabled={busy} sx={GHOST_BTN}>
                    Cancel
                </Button>
                <Button
                    onClick={confirm}
                    disabled={busy}
                    sx={{
                        ...PRIMARY_BTN,
                        minWidth: 100,
                        background: "linear-gradient(135deg, #f87171 0%, #ef4444 100%)",
                        boxShadow: "0 8px 24px rgba(239,68,68,0.3)",
                        "&:hover": { background: "linear-gradient(135deg, #fca5a5 0%, #f87171 100%)" },
                        "&.Mui-disabled": { background: "rgba(255,255,255,0.06)", color: "rgba(245,245,244,0.35)", boxShadow: "none" },
                    }}
                >
                    {busy ? <CircularProgress size={18} sx={{ color: "rgba(245,245,244,0.6)" }} /> : "Remove"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ── Sender card ─────────────────────────────────────────────────────────────
type TestState = { phase: "loading" } | { phase: "ok"; text: string } | { phase: "err"; text: string } | null;

function SenderCard({
    sender,
    onEdit,
    onDelete,
    onToggleStatus,
    onTested,
}: {
    sender: Sender;
    onEdit: () => void;
    onDelete: () => void;
    onToggleStatus: () => void;
    onTested: () => void;
}) {
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [test, setTest] = useState<TestState>(null);
    const verified = !!sender.last_verified_at;
    const active = sender.status === "active";

    async function sendTest() {
        setTest({ phase: "loading" });
        try {
            // Sends to the sender's own address (self-verification).
            const res = await fetch(`/api/senders/${sender.id}/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data: any = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                throw new Error(data?.error || data?.message || "Test send failed.");
            }
            const resp = typeof data.response === "string" && data.response ? ` — ${data.response}` : "";
            setTest({ phase: "ok", text: `Test delivered to ${data.to}${resp}` });
            onTested(); // refresh verified state
        } catch (e: any) {
            setTest({ phase: "err", text: e?.message || "Test send failed." });
        }
    }

    return (
        <GlassCard>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={2}
                alignItems={{ sm: "flex-start" }}
            >
                {/* Identity + meta */}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1.2} sx={{ flexWrap: "wrap", rowGap: 0.6 }}>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                fontSize: "1.02rem",
                                color: TEXT,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {sender.email}
                        </Typography>
                        <StatusChip status={sender.status} />
                    </Stack>

                    {sender.display_name && (
                        <Typography sx={{ color: TEXT_55, fontSize: "0.86rem", mt: 0.3 }}>
                            {sender.display_name}
                        </Typography>
                    )}

                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ mt: 1.2, flexWrap: "wrap", rowGap: 0.6 }}
                        alignItems="center"
                    >
                        <Typography
                            sx={{
                                fontSize: "0.78rem",
                                color: TEXT_55,
                                fontFamily: "var(--font-geist-mono)",
                            }}
                        >
                            {sender.smtp_host}:{sender.smtp_port}
                        </Typography>
                        <Box sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: TEXT_40 }} />
                        <Typography sx={{ fontSize: "0.78rem", color: TEXT_55 }}>
                            {sender.smtp_secure === "starttls" ? "STARTTLS" : "Implicit TLS"}
                        </Typography>
                    </Stack>

                    <Stack direction="row" spacing={0.7} alignItems="center" sx={{ mt: 1 }}>
                        {verified ? (
                            <>
                                <CheckCircleIcon sx={{ fontSize: 15, color: GREEN }} />
                                <Typography sx={{ fontSize: "0.78rem", color: GREEN }}>
                                    Verified {relativeTime(sender.last_verified_at)}
                                </Typography>
                            </>
                        ) : (
                            <Typography sx={{ fontSize: "0.78rem", color: TEXT_40 }}>
                                Not verified yet
                            </Typography>
                        )}
                    </Stack>
                </Box>

                {/* Action row */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Tooltip title={`Sends a verification email to ${sender.email}`} arrow>
                        <span>
                            <Button
                                onClick={sendTest}
                                disabled={test?.phase === "loading"}
                                startIcon={
                                    test?.phase === "loading" ? (
                                        <CircularProgress size={15} sx={{ color: "rgba(245,245,244,0.6)" }} />
                                    ) : (
                                        <SendIcon sx={{ fontSize: "1rem !important" }} />
                                    )
                                }
                                sx={{
                                    ...GHOST_BTN,
                                    fontSize: "0.84rem",
                                    "&.Mui-disabled": { color: "rgba(245,245,244,0.4)", borderColor: BORDER },
                                }}
                            >
                                Send test
                            </Button>
                        </span>
                    </Tooltip>

                    <IconButton
                        onClick={(e) => setMenuAnchor(e.currentTarget)}
                        size="small"
                        sx={{
                            color: TEXT_55,
                            border: "1px solid rgba(255,255,255,0.16)",
                            borderRadius: "10px",
                            "&:hover": { borderColor: "rgba(155,123,247,0.5)", background: "rgba(155,123,247,0.06)" },
                        }}
                        aria-label="More actions"
                    >
                        <MoreVertIcon sx={{ fontSize: 19 }} />
                    </IconButton>

                    <Menu
                        anchorEl={menuAnchor}
                        open={!!menuAnchor}
                        onClose={() => setMenuAnchor(null)}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                        slotProps={{
                            paper: {
                                sx: {
                                    background: SURFACE,
                                    border: `1px solid ${BORDER}`,
                                    borderRadius: "12px",
                                    backgroundImage: "none",
                                    minWidth: 180,
                                    "& .MuiMenuItem-root": {
                                        fontSize: "0.86rem",
                                        color: TEXT,
                                        gap: 1.2,
                                        py: 1,
                                    },
                                },
                            },
                        }}
                    >
                        <MenuItem
                            onClick={() => {
                                setMenuAnchor(null);
                                onEdit();
                            }}
                        >
                            <EditOutlinedIcon sx={{ fontSize: 18, color: TEXT_55 }} />
                            Edit
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                setMenuAnchor(null);
                                onToggleStatus();
                            }}
                        >
                            {active ? (
                                <PauseCircleOutlineIcon sx={{ fontSize: 18, color: TEXT_55 }} />
                            ) : (
                                <PlayCircleOutlineIcon sx={{ fontSize: 18, color: GREEN }} />
                            )}
                            {active ? "Disable" : "Enable"}
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                setMenuAnchor(null);
                                onDelete();
                            }}
                            sx={{ color: `${RED} !important` }}
                        >
                            <DeleteOutlineIcon sx={{ fontSize: 18, color: RED }} />
                            Delete
                        </MenuItem>
                    </Menu>
                </Stack>
            </Stack>

            {/* Test result line */}
            {test && test.phase !== "loading" && (
                <Stack direction="row" spacing={0.8} alignItems="flex-start" sx={{ mt: 1.8 }}>
                    {test.phase === "ok" ? (
                        <CheckCircleIcon sx={{ fontSize: 16, color: GREEN, mt: 0.2 }} />
                    ) : (
                        <ErrorOutlineIcon sx={{ fontSize: 16, color: RED, mt: 0.2 }} />
                    )}
                    <Typography
                        sx={{
                            fontSize: "0.82rem",
                            color: test.phase === "ok" ? GREEN : RED,
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                        }}
                    >
                        {test.text}
                    </Typography>
                </Stack>
            )}
        </GlassCard>
    );
}

// ── Manager (root) ──────────────────────────────────────────────────────────
export default function SendersManager() {
    const [senders, setSenders] = useState<Sender[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Sender | null>(null);
    const [deleting, setDeleting] = useState<Sender | null>(null);

    async function load() {
        try {
            const res = await fetch("/api/senders");
            const data: any = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                throw new Error(data?.message || data?.error || "Could not load senders.");
            }
            setSenders(Array.isArray(data.senders) ? (data.senders as Sender[]) : []);
            setLoadError(null);
        } catch (e: any) {
            setLoadError(e?.message || "Could not load senders.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    function openCreate() {
        setEditing(null);
        setDialogOpen(true);
    }
    function openEdit(s: Sender) {
        setEditing(s);
        setDialogOpen(true);
    }

    async function toggleStatus(s: Sender) {
        const next = s.status === "active" ? "disabled" : "active";
        // Optimistic; reconcile from server response.
        setSenders((list) => list.map((x) => (x.id === s.id ? { ...x, status: next } : x)));
        try {
            const res = await fetch(`/api/senders/${s.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: next }),
            });
            const data: any = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) throw new Error("status");
            setSenders((list) => list.map((x) => (x.id === s.id ? (data.sender as Sender) : x)));
        } catch {
            // Revert on failure.
            setSenders((list) => list.map((x) => (x.id === s.id ? { ...x, status: s.status } : x)));
        }
    }

    // ── Render states ──
    if (loading) {
        return (
            <GlassCard sx={{ py: { xs: 6, md: 8 } }}>
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress size={28} sx={{ color: ACCENT }} />
                    <Typography sx={{ color: TEXT_55, fontSize: "0.9rem" }}>Loading senders…</Typography>
                </Stack>
            </GlassCard>
        );
    }

    if (loadError) {
        return (
            <GlassCard>
                <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <ErrorOutlineIcon sx={{ fontSize: 18, color: RED }} />
                        <Typography sx={{ color: RED, fontSize: "0.9rem" }}>{loadError}</Typography>
                    </Stack>
                    <Button
                        onClick={() => {
                            setLoading(true);
                            load();
                        }}
                        sx={GHOST_BTN}
                    >
                        Retry
                    </Button>
                </Stack>
            </GlassCard>
        );
    }

    return (
        <Box>
            {senders.length === 0 ? (
                <EmptyState
                    icon={DnsIcon}
                    accent={ACCENT}
                    headline="No senders yet"
                    subtext="A sender is your own mailbox — the email and app password we relay your mail through, so it sends on your domain and reputation. Connect one to start delivering."
                    cta={
                        <Button onClick={openCreate} startIcon={<AddIcon sx={{ fontSize: "1.1rem !important" }} />} sx={PRIMARY_BTN}>
                            Connect a sender
                        </Button>
                    }
                />
            ) : (
                <Box>
                    <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                        <Button onClick={openCreate} startIcon={<AddIcon sx={{ fontSize: "1.1rem !important" }} />} sx={PRIMARY_BTN}>
                            Connect a sender
                        </Button>
                    </Stack>
                    <Stack spacing={2}>
                        {senders.map((s) => (
                            <SenderCard
                                key={s.id}
                                sender={s}
                                onEdit={() => openEdit(s)}
                                onDelete={() => setDeleting(s)}
                                onToggleStatus={() => toggleStatus(s)}
                                onTested={load}
                            />
                        ))}
                    </Stack>
                </Box>
            )}

            <SenderDialog
                open={dialogOpen}
                editing={editing}
                onClose={() => setDialogOpen(false)}
                onSaved={load}
            />
            <DeleteDialog sender={deleting} onClose={() => setDeleting(null)} onDeleted={load} />
        </Box>
    );
}
