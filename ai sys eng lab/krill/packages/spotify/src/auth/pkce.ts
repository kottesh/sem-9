import { createHash, randomBytes } from "node:crypto";

/** Encode a buffer as unpadded, URL-safe base64 (RFC 4648 §5). */
export function base64UrlEncode(buf: Buffer): string {
    return buf
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

/**
 * Generate a PKCE code verifier: 43-128 chars from the unreserved set.
 * 32 random bytes → base64url ≈ 43 chars.
 */
export function createVerifier(): string {
    return base64UrlEncode(randomBytes(32));
}

/** Derive the S256 code challenge from a verifier. */
export function challengeFromVerifier(verifier: string): string {
    return base64UrlEncode(createHash("sha256").update(verifier).digest());
}
