import { randomToken, sha256Base64Url } from "./crypto";

// Endpoint OAuth 2.0 / OpenID Connect di Google.
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleUser {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

export function generateState(): string {
  return randomToken(32);
}

export function generateCodeVerifier(): string {
  return randomToken(32);
}

/** URL di autorizzazione Google con PKCE (S256). */
export async function buildAuthorizationUrl(
  cfg: GoogleOAuthConfig,
  state: string,
  codeVerifier: string,
): Promise<string> {
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Scambia il code per un access token e recupera il profilo utente. */
export async function exchangeCodeForUser(
  cfg: GoogleOAuthConfig,
  code: string,
  codeVerifier: string,
): Promise<GoogleUser> {
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Scambio token fallito: ${tokenRes.status}`);
  }
  const token = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!userRes.ok) {
    throw new Error(`Recupero profilo fallito: ${userRes.status}`);
  }
  const info = (await userRes.json()) as {
    sub: string;
    email: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  return {
    sub: info.sub,
    email: info.email,
    emailVerified: info.email_verified ?? false,
    name: info.name ?? null,
    picture: info.picture ?? null,
  };
}
