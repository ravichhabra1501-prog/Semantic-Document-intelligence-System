export async function requireAuthenticatedUser(req: any, res: any) {
  return {
    id: "local-user",
    email: "local@workspace",
    name: "Local User",
    role: "authenticated",
    tenantId: null,
  };
}
