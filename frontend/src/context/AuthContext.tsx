// AuthContext.tsx
import {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";

interface User {
  _id: string;
  email: string;
  name: string;
  googleId: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/user', {
        credentials: 'include',  // Important!
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setState({ user: data.user, isLoading: false });
      } else {
        setState({ user: null, isLoading: false });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setState({ user: null, isLoading: false });
    }
  };
  
  const loginWithGoogle = () => {
    window.location.href = 'http://localhost:3000/api/auth/google';
  };

  const logout = async () => {
    await fetch('http://localhost:3000/api/auth/logout', {
      credentials: 'include'
    });
    setState({ user: null, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ 
      user: state.user, 
      isLoading: state.isLoading,
      loginWithGoogle,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
