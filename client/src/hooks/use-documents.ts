import { getApiCredentialsMode, resolveApiUrl } from "@/lib/api";
import { getEntraAuthHeaders } from "@/lib/entra";
import {
    api,
    buildUrl
} from "@shared/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

async function getResponseErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  const contentType = res.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = await res.json();
      if (body && typeof body.message === "string" && body.message.trim()) {
        return body.message;
      }
    } else {
      const text = (await res.text()).trim();
      if (text) {
        return text.length > 240 ? `${text.slice(0, 240)}...` : text;
      }
    }
  } catch {
    // fall through to status-based fallback
  }

  if (res.status === 404) {
    return "API endpoint was not found. Set VITE_API_BASE_URL to your backend URL when frontend and API are deployed separately.";
  }

  return fallback;
}

export function useDocuments(query?: string) {
  return useQuery({
    queryKey: [api.documents.list.path, query],
    queryFn: async () => {
      const url = new URL(
        resolveApiUrl(api.documents.list.path),
        window.location.origin,
      );
      if (query) url.searchParams.set("query", query);
      const authHeaders = await getEntraAuthHeaders();

      const res = await fetch(url.toString(), {
        credentials: getApiCredentialsMode(),
        headers: authHeaders,
      });
      if (!res.ok) {
        throw new Error(
          await getResponseErrorMessage(res, "Failed to fetch documents"),
        );
      }

      const data = await res.json();
      return api.documents.list.responses[200].parse(data);
    },
  });
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: [api.documents.get.path, id],
    queryFn: async () => {
      const url = resolveApiUrl(buildUrl(api.documents.get.path, { id }));
      const authHeaders = await getEntraAuthHeaders();
      const res = await fetch(url, {
        credentials: getApiCredentialsMode(),
        headers: authHeaders,
      });

      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(
          await getResponseErrorMessage(
            res,
            "Failed to fetch document details",
          ),
        );
      }

      const data = await res.json();
      // Notice: Dates come as strings from JSON, Zod will coerce if schema has it,
      // but let's parse robustly
      return api.documents.get.responses[200].parse(data);
    },
    enabled: !!id && !isNaN(id),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const authHeaders = await getEntraAuthHeaders();

      const res = await fetch(resolveApiUrl(api.documents.upload.path), {
        method: api.documents.upload.method,
        body: formData,
        headers: authHeaders,
        credentials: getApiCredentialsMode(),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.documents.upload.responses[400].parse(
            await res.json(),
          );
          throw new Error(error.message);
        }
        throw new Error(await getResponseErrorMessage(res, "Upload failed"));
      }

      return api.documents.upload.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = resolveApiUrl(buildUrl(api.documents.delete.path, { id }));
      const authHeaders = await getEntraAuthHeaders();
      const res = await fetch(url, {
        method: api.documents.delete.method,
        headers: authHeaders,
        credentials: getApiCredentialsMode(),
      });

      if (res.status === 404) throw new Error("Document not found");
      if (!res.ok) {
        throw new Error(
          await getResponseErrorMessage(res, "Failed to delete document"),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
    },
  });
}
