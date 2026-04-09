import {
    DEMO_AUTH_EVENT,
    getDemoAuthEmail,
    isSupabaseDemoMode,
    supabase,
} from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from "react";

type AuthContextValue = {
  currentAal: string | null;
  isLoading: boolean;
  requiresMfa: boolean;
  refreshAuthState: () => Promise<void>;
  session: Session | null;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function createDemoUser(email: string): User {
  const now = new Date().toISOString();

  return {
    id: "demo-user",
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: now,
    created_at: now,
    updated_at: now,
    last_sign_in_at: now,
    app_metadata: {},
    user_metadata: {},
  } as User;
}

function createDemoSession(email: string): Session {
  const user = createDemoUser(email);

  return {
    access_token: "demo-access-token",
    refresh_token: "demo-refresh-token",
    expires_in: 0,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  } as unknown as Session;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [currentAal, setCurrentAal] = useState<string | null>(null);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuthState = async () => {
    if (isSupabaseDemoMode) {
      const email = getDemoAuthEmail();
      setSession(email ? createDemoSession(email) : null);
      setCurrentAal(null);
      setRequiresMfa(false);
      setIsLoading(false);
      return;
    }

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

    const aalData = aalResult.data;

    if (!aalData) {
      setCurrentAal(null);
      setRequiresMfa(false);
      setIsLoading(false);
      return;
    }

    setCurrentAal(aalData.currentLevel ?? null);
    setRequiresMfa(
      aalData.nextLevel === "aal2" &&
        aalData.currentLevel !== aalData.nextLevel,
    );
    setIsLoading(false);
  };

  useEffect(() => {
    if (isSupabaseDemoMode) {
      const email = getDemoAuthEmail();
      setSession(email ? createDemoSession(email) : null);
      setIsLoading(false);

      const handleDemoAuthChanged = () => {
        refreshAuthState().catch((error) => {
          console.error("Failed to refresh demo auth state", error);
          setIsLoading(false);
        });
      };

      window.addEventListener(DEMO_AUTH_EVENT, handleDemoAuthChanged);

      return () => {
        window.removeEventListener(DEMO_AUTH_EVENT, handleDemoAuthChanged);
      };
    }

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
