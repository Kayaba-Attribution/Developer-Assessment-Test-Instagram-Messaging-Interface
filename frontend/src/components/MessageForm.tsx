import React, { useState, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { sendMessage, sendMessageWithAuth } from "../lib/api";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import { UnderConstructionAlert } from "./UnderConstructionAlert";

interface FormState {
  username: string;
  password: string;
  recipient: string;
  message: string;
}

export function MessageForm() {
  const { username: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    username: "",
    password: "",
    recipient: "",
    message: "",
  });
  const [jsonInput, setJsonInput] = useState("");
  const [showContent, setShowContent] = useState(false);

  if (!showContent) {
    return <UnderConstructionAlert onContinue={() => setShowContent(true)} />;
  }

  const handleCombinedSubmit = async (data: FormState) => {
    setLoading(true);
    try {
      const result = await sendMessageWithAuth(data);
      if (result.success) {
        toast.success("Message sent successfully");
        setFormData({ username: "", password: "", recipient: "", message: "" });
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
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white shadow-md">
          <CardContent className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-6">Send Message</h2>

            <Tabs defaultValue="main" className="w-full">
              <TabsList className="mb-4 grid grid-cols-3 gap-2">
                <TabsTrigger value="main" className="text-sm">
                  Quick Send
                </TabsTrigger>
                <TabsTrigger value="manual" className="text-sm">
                  Manual Input
                </TabsTrigger>
                <TabsTrigger value="api" className="text-sm">
                  API-Based
                </TabsTrigger>
              </TabsList>

              <TabsContent value="main">
                <form onSubmit={handleMainSubmit} className="space-y-4">
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
                      className="focus-visible:ring-2 focus-visible:ring-blue-500"
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
                      className="min-h-[120px] focus-visible:ring-2 focus-visible:ring-blue-500"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={
                      loading || !formData.recipient || !formData.message
                    }
                  >
                    {loading ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="manual">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCombinedSubmit(formData);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        className="focus-visible:ring-2 focus-visible:ring-blue-500"
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
                        className="focus-visible:ring-2 focus-visible:ring-blue-500"
                        required
                      />
                    </div>
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
                      className="focus-visible:ring-2 focus-visible:ring-blue-500"
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
                      className="min-h-[120px] focus-visible:ring-2 focus-visible:ring-blue-500"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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

              <TabsContent value="api">
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
                      className="min-h-[200px] font-mono text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={loading || !jsonInput.trim()}
                  >
                    Send Message
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MessageForm;
