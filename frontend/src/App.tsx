// src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { Login } from "./components/Login";
import { MessageForm } from "./components/MessageForm";
import { AdminDashboard } from "./components/AdminDashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navbar } from "./components/Navbar";
import { AccountCreation } from "./components/AccountCreation";
import { AccountManagement } from "./components/AccountManagement";

export function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <Routes>
                    <Route path="/messages" element={<MessageForm />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/create-account" element={<AccountCreation />} />
                    <Route path="/accounts" element={<AccountManagement />} />
                    <Route
                      path="/"
                      element={<Navigate to="/create-account" replace />}
                    />
                  </Routes>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}
