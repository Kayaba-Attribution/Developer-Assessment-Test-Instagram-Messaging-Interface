// src/contexts/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { checkSession } from "../lib/api";
import { SessionResponse } from "../lib/types";

interface AuthState {
  username: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType {
  username: string | null;
  isLoading: boolean;
  error: string | null;
  setUsername: (username: string | null) => void;
  checkAuthStatus: () => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    username: localStorage.getItem("instagram_username"),
    isLoading: false,
    error: null,
  });

  const setUsername = (username: string | null) => {
    setState((prev) => ({ ...prev, username }));
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    if (!state.username) return false;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result: SessionResponse = await checkSession(state.username);

      if (!result.success) {
        setState((prev) => ({
          ...prev,
          username: null,
          error: result.error || "Session invalid",
        }));
        localStorage.removeItem("instagram_username");
        return false;
      }

      return true;
    } catch {
      setState((prev) => ({
        ...prev,
        error: "Failed to check session status",
      }));
      return false;
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const logout = () => {
    setState({
      username: null,
      isLoading: false,
      error: null,
    });
    localStorage.removeItem("instagram_username");
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    username: state.username,
    isLoading: state.isLoading,
    error: state.error,
    setUsername,
    checkAuthStatus,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
