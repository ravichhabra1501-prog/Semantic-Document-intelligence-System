import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  currentAal: string | null;
  isLoading: boolean;
  requiresMfa: boolean;
  refreshAuthState: () => Promise<void>;
  session: Session | null;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [currentAal, setCurrentAal] = useState<string | null>(null);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuthState = async () => {
    if (!supabase) {
      setSession(null);
      setCurrentAal(null);
      setRequiresMfa(false);
      setIsLoading(false);
      return;
    }

    const [{ data, error }, aalResult] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (error) {
      console.error("Failed to restore Supabase session", error);
    }

    const nextSession = data.session ?? null;
    setSession(nextSession);

    if (!nextSession) {
      setCurrentAal(null);
      setRequiresMfa(false);
      setIsLoading(false);
      return;
    }

    setCurrentAal(aalResult.data.currentLevel ?? null);
    setRequiresMfa(
      aalResult.data.nextLevel === "aal2" &&
        aalResult.data.currentLevel !== aalResult.data.nextLevel,
    );
    setIsLoading(false);
  };

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    refreshAuthState().catch((error) => {
      if (isMounted) {
        console.error("Failed to refresh auth state", error);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession ?? null);
      refreshAuthState().catch((error) => {
        console.error("Failed to refresh auth state", error);
        setIsLoading(false);
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      currentAal,
      isLoading,
      refreshAuthState,
      requiresMfa,
      session,
      user: session?.user ?? null,
    }),
    [currentAal, isLoading, requiresMfa, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
