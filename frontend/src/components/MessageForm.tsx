import React, { useState, FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { sendMessage, sendMessageWithAuth } from "../lib/api";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";

interface FormState {
  username: string;
  password: string;
  recipient: string;
  message: string;
}

export function MessageForm() {
  const { username: currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    username: "",
    password: "",
    recipient: "",
    message: "",
  });

  const [jsonInput, setJsonInput] = useState("");
  const handleCombinedSubmit = async (data: FormState) => {
    setLoading(true);
    try {
      const result = await sendMessageWithAuth({
        username: data.username,
        password: data.password,
        recipient: data.recipient,
        message: data.message,
      });

      if (result.success) {
        toast.success("Message sent successfully");
        // Clear form data
        setFormData({
          username: "",
          password: "",
          recipient: "",
          message: "",
        });
      } else {
        toast.error(result.error || "Failed to send message");
      }
    } catch (error) {
      toast.error(`An unexpected error occurred: ${error}`);
    } finally {
      setLoading(false);
    }
  };
  const handleMainSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await sendMessage({
        username: formData.recipient,
        from_username: currentUser || "",
        content: formData.message,
      });

      if (result.success) {
        toast.success("Message sent successfully");
        setFormData((prev) => ({ ...prev, recipient: "", message: "" }));
      } else {
        toast.error(result.error || "Failed to send message");
      }
    } catch (error) {
      toast.error(`An unexpected error occurred: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJsonSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const data = JSON.parse(jsonInput);
      await handleCombinedSubmit(data);
    } catch (error) {
      toast.error(`Invalid JSON format: ${error}`);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Send Message</h2>
          {currentUser && (
            <div className="space-x-4">
              <span className="text-sm text-gray-600">
                Logged in as: {currentUser}
              </span>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="main" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="main">Quick Send</TabsTrigger>
            <TabsTrigger value="manual">Manual Input</TabsTrigger>
            <TabsTrigger value="api">API-Based</TabsTrigger>
          </TabsList>

          {/* Main Tab - Quick Send */}
          <TabsContent value="main">
            <form
              onSubmit={handleMainSubmit}
              className="space-y-4 bg-white p-6 rounded-lg shadow"
            >
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Username</Label>
                <Input
                  id="recipient"
                  value={formData.recipient}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recipient: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  required
                  rows={4}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !formData.recipient || !formData.message}
              >
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </TabsContent>

          {/* Manual Input Tab */}
          <TabsContent value="manual">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCombinedSubmit(formData);
              }}
              className="space-y-4 bg-white p-6 rounded-lg shadow"
            >
              <div className="space-y-2">
                <Label htmlFor="manual-username">Username</Label>
                <Input
                  id="manual-username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-password">Password</Label>
                <Input
                  id="manual-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-recipient">Recipient Username</Label>
                <Input
                  id="manual-recipient"
                  value={formData.recipient}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recipient: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-message">Message</Label>
                <Textarea
                  id="manual-message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  required
                  rows={4}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  !formData.username ||
                  !formData.password ||
                  !formData.recipient ||
                  !formData.message
                }
              >
                {loading ? "Processing..." : "Send Message"}
              </Button>
            </form>
          </TabsContent>

          {/* API-Based Tab */}
          <TabsContent value="api">
            <div className="space-y-4 bg-white p-6 rounded-lg shadow">
              <form onSubmit={handleJsonSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="json">JSON Input</Label>
                  <Textarea
                    id="json"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder={`{
  "username": "example_username",
  "password": "example_password",
  "recipient": "instagram_user",
  "message": "Hello, this is a test message!"
}`}
                    rows={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !jsonInput.trim()}
                >
                  Send Message
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default MessageForm;
