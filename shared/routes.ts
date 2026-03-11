import { z } from 'zod';
import { insertDocumentSchema, insertEntitySchema, insertTagSchema, documents, entities, tags } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  documents: {
    list: {
      method: 'GET' as const,
      path: '/api/documents' as const,
      input: z.object({
        query: z.string().optional(), // Semantic search query
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof documents.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/documents/:id' as const,
      responses: {
        200: z.custom<typeof documents.$inferSelect & { entities: typeof entities.$inferSelect[]; tags: typeof tags.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/documents' as const,
      // FormData for upload, so no strict JSON input schema here
      responses: {
        201: z.custom<typeof documents.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/documents/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  tags: {
    create: {
      method: 'POST' as const,
      path: '/api/documents/:id/tags' as const,
      input: insertTagSchema,
      responses: {
        201: z.custom<typeof tags.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/tags/:tagId' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type DocumentResponse = z.infer<typeof api.documents.list.responses[200]>[0];
export type DocumentDetailResponse = z.infer<typeof api.documents.get.responses[200]>;
