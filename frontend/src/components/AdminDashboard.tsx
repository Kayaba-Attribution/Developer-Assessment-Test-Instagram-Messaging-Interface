import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getMessageHistory } from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "./ui/input";
import { Message } from "../lib/types";

export function AdminDashboard() {
  const { username } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      if (!username) return;

      setLoading(true);
      const response = await getMessageHistory(username, searchTerm);
      if (response.success && response.data) {
        setMessages(response.data);
        setError("");
      } else {
        setError(response.error || "Failed to fetch messages");
        setMessages([]);
      }
      setLoading(false);
    };

    const delayDebounce = setTimeout(fetchMessages, 500);
    return () => clearTimeout(delayDebounce);
  }, [username, searchTerm]);

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Message History</CardTitle>
          <Input
            placeholder="Search by recipient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm mt-2"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center">Loading messages...</p>
          ) : error ? (
            <p className="text-red-500 text-center">{error}</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-500">No messages found</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className="border rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">To: {msg.recipient}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        msg.status === "sent"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {msg.status}
                    </span>
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
