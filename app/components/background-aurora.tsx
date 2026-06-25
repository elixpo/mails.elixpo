"use client";

import { Box } from "@mui/material";
import { usePathname } from "next/navigation";

const BackgroundAurora = () => {
    const pathname = usePathname() || "";
    const isDashboard = pathname.startsWith("/dashboard");

    if (isDashboard) {
        // Dark Enterprise Green/Navy/Near-Black Command-Center theme for Dashboard
        return (
            <Box
                aria-hidden
                sx={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 0,
                    pointerEvents: "none",
                    overflow: "hidden",
                    background: "#0c0d12", // Near-black base
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        top: "-10vmax",
                        left: "20%",
                        width: "60vmax",
                        height: "40vmax",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(0, 60, 51, 0.28) 0%, transparent 70%)", // Deep green glow
                        filter: "blur(80px)",
                    },
                    "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: "-15vmax",
                        right: "10%",
                        width: "50vmax",
                        height: "50vmax",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(7, 24, 41, 0.25) 0%, transparent 70%)", // Dark navy glow
                        filter: "blur(90px)",
                    }
                }}
            />
        );
    }

    // Flat Canvas White theme for Home, Pricing, Docs, Legal, and Login
    return (
        <Box
            aria-hidden
            sx={{
                position: "fixed",
                inset: 0,
                zIndex: 0,
                pointerEvents: "none",
                background: "#ffffff", // Pure Canvas White
            }}
        />
    );
};

export default BackgroundAurora;

