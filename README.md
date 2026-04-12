# Semantic-Document-intelligence-System

## Azure deployment

This repository now includes an Azure Functions root at the project root, uses Azure PostgreSQL for storage, and authenticates with Microsoft Entra ID.

Before deploying, run:

```bash
npm run build
```

Then deploy the repository root to Azure Functions. The `host.json` file at the root and the `api/function.json` catch-all route let Azure load the app without the missing project-root error.

For Azure Database for PostgreSQL Flexible Server, set `DATABASE_URL` to the Azure connection string and add `PGSSLMODE=require` if your connection string does not already include SSL settings.

For Microsoft Entra ID, create an app registration for the SPA, expose an API scope, and set the `VITE_ENTRA_*` and `ENTRA_*` variables in `.env` to the tenant and app IDs from that registration.

For GitHub Actions deployment, add:

- Repository variable `AZURE_FUNCTIONAPP_NAME`
- Repository secret `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
