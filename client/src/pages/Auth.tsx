import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authConfigError, signIn } from "@/lib/auth";
import { LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

type AuthPageProps = {
  configError?: string | null;
};

export default function AuthPage({ configError }: AuthPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSignIn = async () => {
    setIsSubmitting(true);

    try {
      await signIn();
      toast({
        title: "Signed in",
        description: "Redirecting to Supabase OAuth authorization.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start Supabase OAuth sign in.";

      toast({
        title: "Sign-in failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveConfigError = configError ?? authConfigError;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16 lg:px-10">
      <div className="pointer-events-none absolute inset-0 signal-grid opacity-[0.18]" />
      <div className="pointer-events-none absolute left-[12%] top-[14%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[8%] right-[10%] h-96 w-96 rounded-full bg-emerald-400/12 blur-3xl" />

      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="mesh-panel panel-outline rounded-[2rem] p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Supabase Auth
          </div>

          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight text-foreground lg:text-6xl">
            Protect document intelligence with
            <span className="bg-gradient-to-r from-primary via-cyan-300 to-amber-300 bg-clip-text text-transparent">
              {" "}
              enterprise identity
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground lg:text-base">
            Sign in with your configured OAuth provider. Access tokens are sent
            to the API so protected endpoints are accessible only for
            authenticated sessions.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Secure sessions",
                description:
                  "OAuth and MFA policies are handled by your identity provider.",
              },
              {
                title: "Token-based API",
                description:
                  "The frontend obtains an access token and sends it with API requests.",
              },
              {
                title: "Fast session restore",
                description:
                  "The app restores your auth session automatically after reload.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,15,26,0.96),rgba(7,11,19,0.92))] shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle>Sign in to Doc Intel</CardTitle>
            <CardDescription>
              Use Supabase OAuth to access the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <Button
                type="button"
                className="h-11 w-full rounded-xl font-semibold"
                onClick={handleSignIn}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              {effectiveConfigError ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-muted-foreground">
                  The app expects a valid Supabase project URL, publishable key,
                  and OAuth provider configuration.
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
                  Supabase OAuth configuration detected. You can sign in now.
                </div>
              )}

              {effectiveConfigError && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                  {effectiveConfigError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
