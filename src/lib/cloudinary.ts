/**
 * Cloudinary image hosting for template media. lixeditor would otherwise inline
 * images as base64 `data:` URLs, which email clients strip and which bloat the
 * document. We host them instead and serve an `f_auto,q_auto` (auto format +
 * quality, width-capped) delivery URL so emails ship small, optimized images.
 *
 * Uploads are signed server-side (api_secret never reaches the client). Assets
 * land under a `mail-elixpo/<tenant>` folder so they're identifiable as coming
 * from the mail service. Edge-safe (Web Crypto, FormData, fetch).
 */

import { toHex } from "./crypto";
import { getEnv } from "./env";

export interface CloudinaryConfig {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
}

/** Resolve Cloudinary creds from env, or null if not configured. */
export async function cloudinaryConfig(): Promise<CloudinaryConfig | null> {
    const [cloudName, apiKey, apiSecret] = await Promise.all([
        getEnv("CLOUDINARY_CLOUD_NAME"),
        getEnv("CLOUDINARY_API_KEY"),
        getEnv("CLOUDINARY_API_SECRET"),
    ]);
    if (!cloudName || !apiKey || !apiSecret) return null;
    return { cloudName, apiKey, apiSecret };
}

async function sha1Hex(input: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
    return toHex(digest);
}

/**
 * Insert delivery transformations into a Cloudinary secure URL: auto format +
 * quality, capped to a sane email width (never upscales).
 */
export function compressedUrl(
    secureUrl: string,
    transform = "f_auto,q_auto,w_1400,c_limit",
): string {
    return secureUrl.replace("/image/upload/", `/image/upload/${transform}/`);
}

export interface UploadResult {
    url: string; // transformed (compressed) delivery URL — use this in emails
    secureUrl: string; // original Cloudinary URL
    publicId: string;
    bytes: number;
    format: string;
}

/** Signed upload of an image File to Cloudinary under the given folder. */
export async function uploadImage(
    cfg: CloudinaryConfig,
    file: File,
    folder: string,
): Promise<UploadResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    // Cloudinary signs every param except file/api_key/cloud_name/resource_type,
    // sorted alphabetically, joined with `&`, then the api_secret appended.
    const toSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = await sha1Hex(`${toSign}${cfg.apiSecret}`);

    const form = new FormData();
    form.append("file", file, file.name || "upload");
    form.append("api_key", cfg.apiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
        { method: "POST", body: form },
    );
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || !data?.secure_url) {
        throw new Error(data?.error?.message || `cloudinary upload failed (${res.status})`);
    }
    return {
        url: compressedUrl(data.secure_url),
        secureUrl: data.secure_url,
        publicId: data.public_id,
        bytes: Number(data.bytes) || 0,
        format: data.format,
    };
}
