import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getMessageHistory } from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCcw } from "lucide-react";
import type { Message } from "../lib/types";
import { UnderConstructionAlert } from "./UnderConstructionAlert";

export function AdminDashboard() {
  const { username } = useAuth();
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [userInput, setUserInput] = useState("");
  const [currentUser, setCurrentUser] = useState(username);
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed">(
    "all"
  );
  const [showContent, setShowContent] = useState(false);

  const fetchMessages = async (targetUser: string) => {
    if (!targetUser) return;
    setLoading(true);
    const response = await getMessageHistory(targetUser);
    if (response.success && response.data) {
      setAllMessages(response.data);
      setError("");
    } else {
      setError(response.error || "Failed to fetch messages");
      setAllMessages([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages(currentUser || "");
  }, [currentUser]);

  const handleUserSubmit = () => {
    if (userInput) {
      setCurrentUser(userInput);
    }
  };

  useEffect(() => {
    let filtered = [...allMessages];

    if (statusFilter !== "all") {
      filtered = filtered.filter((msg) => msg.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter((msg) =>
        msg.recipient.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    );
    setFilteredMessages(filtered);
  }, [allMessages, searchTerm, statusFilter]);

  if (!showContent) {
    return <UnderConstructionAlert onContinue={() => setShowContent(true)} />;
  }

  return (
    <div className="p-4 md:p-8 md:mx-64">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-xl md:text-2xl">
              Message History - {currentUser}
            </CardTitle>
            <Button
              onClick={() => fetchMessages(currentUser || "")}
              variant="outline"
              size="icon"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex gap-2 w-full md:w-auto">
              <Input
                placeholder="Enter username to view"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleUserSubmit}>View</Button>
            </div>
            <div className="flex gap-2 flex-col sm:flex-row w-full md:w-auto">
              <Input
                placeholder="Search recipient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48"
              />
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "sent" | "failed") =>
                  setStatusFilter(value)
                }
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center">Loading messages...</p>
          ) : error ? (
            <p className="text-red-500 text-center">{error}</p>
          ) : filteredMessages.length === 0 ? (
            <p className="text-center text-gray-500">No messages found</p>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((msg, idx) => (
                <div key={idx} className="border rounded-lg p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <span className="font-semibold">To: {msg.recipient}</span>
                    <span className="text-sm text-gray-500 w-full sm:w-auto text-left sm:text-right">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "Unknown date"}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <div className="mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        msg.status === "sent"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {msg.status}
                    </span>
                    {msg.error && (
                      <span className="text-sm text-red-600 break-words">
                        {msg.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
