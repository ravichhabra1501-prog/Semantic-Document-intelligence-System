import { useEffect, useState } from "react";
import { LoaderCircle, Shield, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type MfaFactor = {
  friendly_name?: string | null;
  id: string;
  status: string;
};

type EnrollmentState = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type AAL = "aal1" | "aal2" | null;

export function MfaSettingsCard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingEnrollment, setIsStartingEnrollment] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isRemovingFactorId, setIsRemovingFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifiedFactors, setVerifiedFactors] = useState<MfaFactor[]>([]);
  const [currentAal, setCurrentAal] = useState<AAL>(null);

  const loadMfaState = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [{ data: factors, error: factorsError }, { data: aalData, error: aalError }] =
        await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);

      if (factorsError) {
        throw factorsError;
      }

      if (aalError) {
        throw aalError;
      }

      setVerifiedFactors(factors.totp.filter((factor) => factor.status === "verified"));
      setCurrentAal((aalData.currentLevel as AAL) ?? null);
    } catch (error) {
      toast({
        title: "Unable to load MFA settings",
        description:
          error instanceof Error ? error.message : "Please try refreshing this page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMfaState();
  }, []);

  const startEnrollment = async () => {
    if (!supabase) {
      return;
    }

    setIsStartingEnrollment(true);

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Doc Intel Authenticator",
      });

      if (error) {
        throw error;
      }

      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setVerificationCode("");
    } catch (error) {
      toast({
        title: "Unable to start MFA enrollment",
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsStartingEnrollment(false);
    }
  };

  const cancelEnrollment = async () => {
    if (!supabase || !enrollment) {
      setEnrollment(null);
      return;
    }

    await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
    setEnrollment(null);
    setVerificationCode("");
  };

  const confirmEnrollment = async () => {
    if (!supabase || !enrollment) {
      return;
    }

    setIsSubmittingCode(true);

    try {
      const challenge = await supabase.auth.mfa.challenge({
        factorId: enrollment.factorId,
      });

      if (challenge.error) {
        throw challenge.error;
      }

      const verify = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challenge.data.id,
        code: verificationCode.trim(),
      });

      if (verify.error) {
        throw verify.error;
      }

      toast({
        title: "MFA enabled",
        description: "Your authenticator app is now protecting this account.",
      });

      setEnrollment(null);
      setVerificationCode("");
      await loadMfaState();
    } catch (error) {
      toast({
        title: "Unable to verify MFA code",
        description:
          error instanceof Error ? error.message : "Please try the latest authenticator code.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const removeFactor = async (factorId: string) => {
    if (!supabase) {
      return;
    }

    setIsRemovingFactorId(factorId);

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) {
        throw error;
      }

      toast({
        title: "MFA factor removed",
        description: "This authenticator app will no longer be required for sign-in.",
      });

      await loadMfaState();
    } catch (error) {
      toast({
        title: "Unable to remove MFA factor",
        description:
          error instanceof Error ? error.message : "You may need to verify MFA on this session first.",
        variant: "destructive",
      });
    } finally {
      setIsRemovingFactorId(null);
    }
  };

  return (
    <Card className="border-border/50 shadow-elevation glass-panel animate-fade-in-up">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/30">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          Multi-Factor Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Authenticator app protection</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Add a TOTP authenticator app so sign-in requires a second code after password login.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={verifiedFactors.length > 0 ? "secondary" : "outline"}>
              {verifiedFactors.length > 0 ? "Enabled" : "Not enabled"}
            </Badge>
            <Badge variant="outline">Session: {currentAal ?? "unknown"}</Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
            Loading MFA settings...
          </div>
        ) : (
          <>
            {verifiedFactors.length > 0 && (
              <div className="space-y-3">
                {verifiedFactors.map((factor) => (
                  <div
                    key={factor.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {factor.friendly_name || "Authenticator app"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Status: {factor.status}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => removeFactor(factor.id)}
                      disabled={isRemovingFactorId === factor.id}
                    >
                      {isRemovingFactorId === factor.id ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {enrollment ? (
              <div className="space-y-4 rounded-[1.75rem] border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Set up your authenticator app</p>
                    <p className="text-xs text-muted-foreground">
                      Scan the QR code or manually enter the secret, then confirm with a 6-digit code.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="flex justify-center rounded-2xl border border-white/10 bg-white p-4">
                    <img
                      src={enrollment.qrCode}
                      alt="Authenticator app QR code"
                      className="h-44 w-44"
                    />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Manual Setup Secret
                      </p>
                      <p className="mt-2 break-all font-mono text-sm text-foreground">
                        {enrollment.secret}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mfa-verify-code">Verification Code</Label>
                      <Input
                        id="mfa-verify-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={verificationCode}
                        onChange={(event) =>
                          setVerificationCode(event.target.value.replace(/\s+/g, ""))
                        }
                        placeholder="123456"
                        className="h-11 rounded-xl border-white/10 bg-black/20"
                        maxLength={6}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        className="rounded-xl"
                        onClick={confirmEnrollment}
                        disabled={isSubmittingCode || verificationCode.trim().length < 6}
                      >
                        {isSubmittingCode ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          "Enable MFA"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={cancelEnrollment}
                        disabled={isSubmittingCode}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                className="rounded-xl"
                onClick={startEnrollment}
                disabled={isStartingEnrollment}
              >
                {isStartingEnrollment ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Starting setup...
                  </>
                ) : verifiedFactors.length > 0 ? (
                  "Add another authenticator app"
                ) : (
                  "Enable MFA"
                )}
              </Button>
            )}

            <p className="text-xs leading-5 text-muted-foreground">
              Supabase’s current MFA flow uses authenticator assurance levels. If a verified factor exists, the next sign-in requires a second code before the app fully unlocks.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
