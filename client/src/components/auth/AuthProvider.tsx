import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from "react";

import { createClient } from "@/lib/client";
import { getSignedInUser } from "@/lib/entra";

type AuthUser = {
  email: string;
  id: string;
  name: string | null;
  tenantId: string | null;
};

type AuthContextValue = {
  isLoading: boolean;
  refreshAuthState: () => Promise<void>;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const refreshAuthState = useCallback(async () => {
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      setUser(null);
      return;
    }

    setUser(getSignedInUser(supabaseUser));
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        await refreshAuthState();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshAuthState();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refreshAuthState, supabase]);

  const value = useMemo(
    () => ({
      isLoading,
      refreshAuthState,
      user,
    }),
    [isLoading, refreshAuthState, user],
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
