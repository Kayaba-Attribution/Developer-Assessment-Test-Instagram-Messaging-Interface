import { NavLink } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";
import { MessageSquare, LayoutDashboard, LogOut } from "lucide-react";

export function Navbar() {
  const { username, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-900">
                MessageApp - JD version
              </span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              <NavLink
                to="/messages"
                className={({ isActive }) =>
                  `inline-flex items-center px-4 py-2 text-sm font-medium ${
                    isActive
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`
                }
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `inline-flex items-center px-4 py-2 text-sm font-medium ${
                    isActive
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Admin
              </NavLink>
            </div>
          </div>
          {username && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Logged in as: {username}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
