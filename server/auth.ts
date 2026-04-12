import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

function trimEnv(value?: string) {
  return value?.trim() || "";
}

const tenantId = trimEnv(process.env.ENTRA_TENANT_ID);
const clientId = trimEnv(process.env.ENTRA_CLIENT_ID);
const authority =
  trimEnv(process.env.ENTRA_AUTHORITY) ||
  (tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : "");
const apiAudience = trimEnv(process.env.ENTRA_API_AUDIENCE) || clientId;
const requiredScope = trimEnv(process.env.ENTRA_API_SCOPE);

const isEntraConfigured = !!tenantId && !!clientId && !!authority && !!apiAudience;

const jwks = tenantId
  ? createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      ),
    )
  : null;

function getBearerToken(authorizationHeader?: string) {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

function sendConfigError(res: any) {
  res.status(500).send({
    message:
      "Microsoft Entra authentication is not configured. Set ENTRA_TENANT_ID, ENTRA_CLIENT_ID, and ENTRA_API_AUDIENCE.",
  });
}

function isScopeAuthorized(scopeClaim: unknown) {
  if (!requiredScope) {
    return true;
  }

  if (typeof scopeClaim !== "string" || !scopeClaim.trim()) {
    return false;
  }

  return scopeClaim
    .split(" ")
    .map((scope) => scope.trim())
    .filter(Boolean)
    .includes(requiredScope);
}

type EntraClaims = JWTPayload & {
  oid?: string;
  tid?: string;
  preferred_username?: string;
  upn?: string;
  email?: string;
  name?: string;
  scp?: string;
};

export async function requireAuthenticatedUser(req: any, res: any) {
  if (!isEntraConfigured || !jwks) {
    sendConfigError(res);
    return null;
  }

  const accessToken = getBearerToken(req.headers.authorization);

  if (!accessToken) {
    res.status(401).send({ message: "Authentication required" });
    return null;
  }

  try {
    const { payload } = await jwtVerify<EntraClaims>(accessToken, jwks, {
      issuer: authority,
      audience: [apiAudience, `api://${clientId}`, clientId].filter(
        Boolean,
      ) as string[],
    });

    if (!isScopeAuthorized(payload.scp)) {
      res.status(403).send({
        message: `Missing required scope${requiredScope ? `: ${requiredScope}` : ""}`,
      });
      return null;
    }

    return {
      id: payload.oid || payload.sub || "entra-user",
      email:
        payload.preferred_username ||
        payload.upn ||
        payload.email ||
        "unknown@local",
      name: payload.name ?? null,
      role: "authenticated",
      tenantId: payload.tid ?? tenantId,
    };
  } catch (error) {
    console.error("Failed to validate Microsoft Entra access token:", error);
    res.status(401).send({ message: "Invalid or expired session" });
    return null;
  }
}
