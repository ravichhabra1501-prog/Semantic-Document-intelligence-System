import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function getSslConfig() {
  const sslMode = (
    process.env.PGSSLMODE ||
    process.env.DATABASE_SSL ||
    ""
  )
    .trim()
    .toLowerCase();

  if (sslMode === "require" || sslMode === "true" || sslMode === "1") {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslConfig(),
});
export const db = drizzle(pool, { schema });

let schemaInitPromise: Promise<void> | null = null;

export async function initializeDatabase() {
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id serial PRIMARY KEY,
          filename text NOT NULL,
          original_name text NOT NULL,
          mime_type text NOT NULL,
          size integer NOT NULL,
          content text,
          summary text,
          classification text,
          workflow text,
          diagram text,
          status text NOT NULL DEFAULT 'pending',
          error text,
          created_at timestamp DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS entities (
          id serial PRIMARY KEY,
          document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          entity_type text NOT NULL,
          value text NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tags (
          id serial PRIMARY KEY,
          document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          name text NOT NULL,
          color text DEFAULT 'gray',
          created_at timestamp DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_entities_document_id ON entities(document_id);
        CREATE INDEX IF NOT EXISTS idx_tags_document_id ON tags(document_id);
        CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
      `);
    })().catch((err) => {
      schemaInitPromise = null;
      throw err;
    });
  }

  return schemaInitPromise;
}
