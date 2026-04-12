import {
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
  type PopupRequest,
} from "@azure/msal-browser";

function trimEnv(value?: string) {
  return value?.trim() || "";
}

const tenantId = trimEnv(import.meta.env.VITE_ENTRA_TENANT_ID);
const clientId = trimEnv(import.meta.env.VITE_ENTRA_CLIENT_ID);
const authority =
  trimEnv(import.meta.env.VITE_ENTRA_AUTHORITY) ||
  (tenantId ? `https://login.microsoftonline.com/${tenantId}` : "");
const apiScope =
  trimEnv(import.meta.env.VITE_ENTRA_API_SCOPE) ||
  (clientId ? `api://${clientId}/access_as_user` : "");

export const entraConfigError = !tenantId
  ? "Missing VITE_ENTRA_TENANT_ID in .env."
  : !clientId
    ? "Missing VITE_ENTRA_CLIENT_ID in .env."
    : !authority
      ? "Microsoft Entra authority could not be determined."
      : !apiScope
        ? "Missing VITE_ENTRA_API_SCOPE in .env."
        : null;

export const isEntraConfigured = !entraConfigError;

const msalConfig = isEntraConfigured
  ? {
      auth: {
        clientId,
        authority,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: "localStorage" as const,
        storeAuthStateInCookie: false,
      },
    }
  : null;

export const loginRequest: PopupRequest | null = apiScope
  ? {
      scopes: [apiScope],
    }
  : null;

export const entraMsalInstance = msalConfig
  ? new PublicClientApplication(msalConfig)
  : null;

export function getSignedInUser(account: AccountInfo | null | undefined) {
  if (!account) {
    return null;
  }

  return {
    id: account.homeAccountId,
    email: account.username || account.name || "unknown@local",
    name: account.name ?? null,
    tenantId: account.tenantId ?? null,
  };
}

export function getActiveAccount(): AccountInfo | null {
  if (!entraMsalInstance) {
    return null;
  }

  return entraMsalInstance.getActiveAccount() ?? entraMsalInstance.getAllAccounts()[0] ?? null;
}

export async function initializeEntraAuth() {
  if (!entraMsalInstance) {
    return null;
  }

  await entraMsalInstance.initialize();

  const redirectResult = await entraMsalInstance.handleRedirectPromise();
  if (redirectResult?.account) {
    entraMsalInstance.setActiveAccount(redirectResult.account);
  }

  const activeAccount = getActiveAccount();
  if (activeAccount) {
    entraMsalInstance.setActiveAccount(activeAccount);
  }

  return activeAccount;
}

export async function signInWithEntra() {
  if (!entraMsalInstance || !loginRequest) {
    throw new Error(
      entraConfigError ?? "Microsoft Entra authentication is not configured.",
    );
  }

  const result = await entraMsalInstance.loginPopup(loginRequest);
  if (result.account) {
    entraMsalInstance.setActiveAccount(result.account);
  }

  return result;
}

export async function signOutFromEntra() {
  if (!entraMsalInstance) {
    return;
  }

  const account = getActiveAccount();
  if (account) {
    entraMsalInstance.setActiveAccount(account);
  }

  await entraMsalInstance.logoutPopup({
    account: account ?? undefined,
    postLogoutRedirectUri: window.location.origin,
  });
}

async function getAccessToken(): Promise<string | null> {
  if (!entraMsalInstance || !loginRequest) {
    return null;
  }

  const account = getActiveAccount();
  if (!account) {
    return null;
  }

  try {
    const result: AuthenticationResult =
      await entraMsalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
    return result.accessToken;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      ((error as { name?: string }).name === "InteractionRequiredAuthError" ||
        (error as { name?: string }).name === "BrowserAuthError")
    ) {
      return null;
    }

    throw error;
  }
}

export async function getEntraAuthHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();

  return accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : {};
}
