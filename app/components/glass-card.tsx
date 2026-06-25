"use client";

import { Box } from "@mui/material";
import { usePathname } from "next/navigation";
import type React from "react";

/** Surface tokens — solid, neutral, commercial. No gradients. */
export const SURFACE_DARK = "#17171c"; // Near-Black Primary
export const BORDER_DARK = "rgba(255,255,255,0.08)";

export const SURFACE = SURFACE_DARK; // compatibility export
export const BORDER = BORDER_DARK;   // compatibility export

export const SURFACE_LIGHT = "#ffffff"; // Canvas White
export const BORDER_LIGHT = "#d9d9dd"; // Hairline

/** Frosted-glass surface card used across marketing and dashboard surfaces. */
export function GlassCard({
    children,
    sx,
}: {
    children: React.ReactNode;
    sx?: any;
}) {
    const pathname = usePathname() || "";
    const isDashboard = pathname.startsWith("/dashboard");

    return (
        <Box
            sx={{
                background: isDashboard ? SURFACE_DARK : SURFACE_LIGHT,
                border: `1px solid ${isDashboard ? BORDER_DARK : BORDER_LIGHT}`,
                borderRadius: "16px", // md radius token
                p: { xs: 2.5, md: 3 },
                boxShadow: isDashboard ? "none" : "0 1px 2px rgba(0,0,0,0.03)",
                color: isDashboard ? "#f5f5f4" : "#212121",
                ...sx,
            }}
        >
            {children}
        </Box>
    );
}

export default GlassCard;
