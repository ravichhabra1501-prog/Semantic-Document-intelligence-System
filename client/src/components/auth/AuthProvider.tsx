import { EventType, type AccountInfo } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import {
  entraMsalInstance,
  getSignedInUser,
  initializeEntraAuth,
} from "@/lib/entra";

type AuthUser = {
  email: string;
  id: string;
  name: string | null;
  tenantId: string | null;
  account: AccountInfo;
};

type AuthContextValue = {
  isLoading: boolean;
  refreshAuthState: () => Promise<void>;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const { instance, accounts } = useMsal();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuthState = async () => {
    if (!entraMsalInstance) {
      setAccount(null);
      setIsLoading(false);
      return;
    }

    await initializeEntraAuth();

    const activeAccount =
      entraMsalInstance.getActiveAccount() ??
      entraMsalInstance.getAllAccounts()[0] ??
      null;

    if (activeAccount) {
      entraMsalInstance.setActiveAccount(activeAccount);
    }

    setAccount(activeAccount);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!entraMsalInstance) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    refreshAuthState().catch((error) => {
      if (isMounted) {
        console.error("Failed to refresh Entra auth state", error);
        setIsLoading(false);
      }
    });

    const callbackId = instance.addEventCallback((event) => {
      if (
        !isMounted ||
        !event ||
        ![EventType.LOGIN_SUCCESS, EventType.LOGOUT_SUCCESS, EventType.ACCOUNT_ADDED, EventType.ACCOUNT_REMOVED].includes(
          event.eventType,
        )
      ) {
        return;
      }

      refreshAuthState().catch((error) => {
        console.error("Failed to refresh Entra auth state", error);
        setIsLoading(false);
      });
    });

    return () => {
      isMounted = false;
      if (callbackId) {
        instance.removeEventCallback(callbackId);
      }
    };
  }, [instance]);

  useEffect(() => {
    if (!entraMsalInstance || accounts.length === 0) {
      return;
    }

    const nextAccount =
      entraMsalInstance.getActiveAccount() ?? accounts[0] ?? null;

    if (nextAccount) {
      entraMsalInstance.setActiveAccount(nextAccount);
      setAccount(nextAccount);
    }
  }, [accounts]);

  const value = useMemo(
    () => ({
      isLoading,
      refreshAuthState,
      user: account ? { ...getSignedInUser(account), account } : null,
    }),
    [account, isLoading],
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
