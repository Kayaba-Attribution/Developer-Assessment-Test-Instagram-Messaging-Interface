// src/components/Login.tsx
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

export function Login() {
  const { loginWithGoogle } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Sign in</h2>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={loginWithGoogle}
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );
}