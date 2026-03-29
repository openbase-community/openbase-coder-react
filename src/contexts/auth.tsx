import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  getCurrentAccessToken,
  getValidAccessToken,
  getLocalAuthSession,
  logoutFromOpenbase,
  subscribeToAuthChanges,
} from "@/lib/jwt-auth";

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncToken = useCallback(async () => {
    const nextToken = await getValidAccessToken();
    setToken(nextToken ?? getCurrentAccessToken());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void syncToken();

    const unsubscribe = subscribeToAuthChanges(() => {
      void syncToken();
    });

    const handleFocus = () => {
      void syncToken();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncToken();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncToken]);

  const refreshAuth = useCallback(async () => {
    const session = await getLocalAuthSession();
    if (!session.loggedIn) {
      setToken(null);
      throw new Error("Login required. Run 'openbase-coder login' first.");
    }
    await syncToken();
  }, [syncToken]);

  const logout = useCallback(async () => {
    await logoutFromOpenbase();
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated: !!token, isLoading, refreshAuth, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
