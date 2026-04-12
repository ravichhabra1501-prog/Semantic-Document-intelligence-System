import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { signOutFromEntra } from "@/lib/entra";
import { Building2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function MfaSettingsCard() {
  const { user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await signOutFromEntra();
      toast({
        title: "Signed out",
        description: "Microsoft Entra session ended.",
      });
    } catch (error) {
      toast({
        title: "Unable to sign out",
        description:
          error instanceof Error
            ? error.message
            : "Could not sign out of Microsoft Entra ID.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-elevation glass-panel animate-fade-in-up">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/30">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Microsoft Entra ID
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Identity provider
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Authentication is managed by your Microsoft tenant. MFA and
              conditional access are enforced there, not in the app.
            </p>
          </div>
          <Badge variant="secondary">Entra connected</Badge>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {user?.name ?? "Signed-in account"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.email ?? "No account available"}
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Signing out...
            </>
          ) : (
            "Sign out of Microsoft"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
