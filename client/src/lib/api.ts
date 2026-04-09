const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();

const normalizedApiBaseUrl = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/+$/, "")
  : "";

export function resolveApiUrl(path: string): string {
  if (!normalizedApiBaseUrl) {
    return path;
  }

  return new URL(path, `${normalizedApiBaseUrl}/`).toString();
}

export function getApiCredentialsMode(): RequestCredentials {
  if (!normalizedApiBaseUrl) {
    return "include";
  }

  try {
    const apiOrigin = new URL(normalizedApiBaseUrl).origin;
    return apiOrigin === window.location.origin ? "include" : "omit";
  } catch {
    return "include";
  }
}
