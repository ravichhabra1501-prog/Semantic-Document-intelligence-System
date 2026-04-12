# Semantic-Document-intelligence-System

## Setup

This project uses Supabase for authentication and PostgreSQL for data storage.

Before running locally, install dependencies and build:

```bash
npm install
npm run build
```

Create a `.env` file from `.env.example` and set:

- `DATABASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_AUTH_ENDPOINT`
- `VITE_SUPABASE_TOKEN_ENDPOINT`
- `VITE_SUPABASE_OAUTH_PROVIDER`

Run the app:

```bash
npm run dev
```
