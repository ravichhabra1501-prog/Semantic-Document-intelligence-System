import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function AuthMfaPage() {
  const { refreshAuthState } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFactor, setIsLoadingFactor] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIsLoadingFactor(false);
      return;
    }

    supabase.auth.mfa
      .listFactors()
      .then(({ data, error }) => {
        if (error) {
          throw error;
        }

        const verifiedFactor = data.totp.find((factor) => factor.status === "verified");
        setFactorId(verifiedFactor?.id ?? null);
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Unable to load your authenticator settings.";
        setErrorMessage(message);
      })
      .finally(() => {
        setIsLoadingFactor(false);
      });
  }, []);

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !factorId) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });

      if (challenge.error) {
        throw challenge.error;
      }

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });

      if (verify.error) {
        throw verify.error;
      }

      await refreshAuthState();
      toast({
        title: "Verification complete",
        description: "Multi-factor authentication is active for this session.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The code could not be verified.";
      setErrorMessage(message);
      toast({
        title: "Verification failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16 lg:px-10">
      <div className="pointer-events-none absolute inset-0 signal-grid opacity-[0.18]" />
      <div className="pointer-events-none absolute left-[12%] top-[14%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[8%] right-[10%] h-96 w-96 rounded-full bg-emerald-400/12 blur-3xl" />

      <Card className="relative w-full max-w-lg border-white/10 bg-[linear-gradient(180deg,rgba(10,15,26,0.96),rgba(7,11,19,0.92))] shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>Verify your authenticator code</CardTitle>
          <CardDescription>
            This workspace requires a second verification step before documents and analytics become available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingFactor ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">
              Loading your multi-factor settings...
            </div>
          ) : !factorId ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
              No verified authenticator app was found for this account. Open Settings after sign-in to enroll MFA, or check your Supabase auth setup.
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleVerify}>
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Authenticator Code</Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\s+/g, ""))}
                  placeholder="123456"
                  className="h-11 rounded-xl border-white/10 bg-black/20"
                  minLength={6}
                  maxLength={6}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full rounded-xl font-semibold"
                disabled={isSubmitting || code.trim().length < 6}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Continue to workspace"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
