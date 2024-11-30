import { NavLink } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";
import {
  MessageSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { username, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                IG Storm - Postilize
              </span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              <NavLink
                to="/create-account"
                className={({ isActive }) =>
                  `inline-flex items-center px-4 py-2 text-sm font-medium ${
                    isActive
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`
                }
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </NavLink>
              <NavLink
                to="/accounts"
                className={({ isActive }) =>
                  `inline-flex items-center px-4 py-2 text-sm font-medium ${
                    isActive
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`
                }
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Accounts
              </NavLink>

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

          <div className="flex items-center">
            {username && (
              <div className="hidden sm:flex items-center space-x-4">
                <span className="text-sm text-gray-600 truncate max-w-[150px]">
                  {username}
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
            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-md text-gray-500"
              >
                {isOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <NavLink
                to="/messages"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-500 hover:bg-gray-50"
                  }`
                }
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Messages
                </div>
              </NavLink>
              <NavLink
                to="/create-account"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-500 hover:bg-gray-50"
                  }`
                }
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </div>
              </NavLink>
              <NavLink
                to="/accounts"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-500 hover:bg-gray-50"
                  }`
                }
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Accounts
                </div>
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-500 hover:bg-gray-50"
                  }`
                }
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Admin
                </div>
              </NavLink>
              {username && (
                <div className="px-3 py-2 space-y-2">
                  <div className="text-sm text-gray-600 truncate">
                    {username}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    className="flex items-center w-full justify-center"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
