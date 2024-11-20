// src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { Login } from "./components/Login";
import { MessageForm } from "./components/MessageForm";
import { ProtectedRoute } from "./components/ProtectedRoute";

export function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessageForm />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/messages" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
