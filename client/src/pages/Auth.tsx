import { useState } from "react";
import { LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
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
import { isSupabaseConfigured, supabase, supabaseConfigError } from "@/lib/supabase";

type AuthMode = "sign-in" | "sign-up";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      toast({
        title: "Login is not configured",
        description:
          supabaseConfigError ??
          "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the project .env file.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        toast({
          title: "Signed in",
          description: "Your workspace is ready.",
        });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          throw error;
        }

        const needsEmailConfirmation = !data.session;

        toast({
          title: needsEmailConfirmation ? "Check your inbox" : "Account created",
          description: needsEmailConfirmation
            ? "Supabase sent a confirmation email before the first sign-in."
            : "Your account was created and signed in.",
        });

        if (needsEmailConfirmation) {
          setMode("sign-in");
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong during authentication.";

      toast({
        title: mode === "sign-in" ? "Unable to sign in" : "Unable to create account",
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

      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="mesh-panel panel-outline rounded-[2rem] p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure workspace access
          </div>

          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight text-foreground lg:text-6xl">
            Protect document intelligence with
            <span className="bg-gradient-to-r from-primary via-cyan-300 to-amber-300 bg-clip-text text-transparent">
              {" "}secure access
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground lg:text-base">
            Sign in before entering the analysis workspace. Email and password flows
            are handled through the app's secure login flow, while the existing app screens stay behind a
            single authenticated shell.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Session restore",
                description: "Users stay signed in between refreshes with browser session persistence.",
              },
              {
                title: "Protected UI",
                description: "Dashboard, analytics, settings, and document pages only render after auth.",
              },
              {
                title: "VS Code friendly",
                description: "Env-driven setup keeps the project easy to run locally from this workspace.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
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
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle>
              {mode === "sign-in" ? "Sign in to Doc Intel" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "sign-in"
                ? "Use your email and password to open the workspace."
                : "New users can register here. Email confirmation may be required before first access."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 rounded-xl border-white/10 bg-black/20 pl-10"
                    required
                    disabled={isSubmitting || !isSupabaseConfigured}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="h-11 rounded-xl border-white/10 bg-black/20"
                  minLength={6}
                  required
                  disabled={isSubmitting || !isSupabaseConfigured}
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl font-semibold"
                disabled={isSubmitting || !isSupabaseConfigured}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Working...
                  </>
                ) : mode === "sign-in" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"))
                }
                disabled={isSubmitting}
              >
                {mode === "sign-in"
                  ? "Need an account? Sign up"
                  : "Already have an account? Sign in"}
              </Button>

              {!isSupabaseConfigured && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                  {supabaseConfigError ??
                    "Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the root `.env` file before using auth."}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
