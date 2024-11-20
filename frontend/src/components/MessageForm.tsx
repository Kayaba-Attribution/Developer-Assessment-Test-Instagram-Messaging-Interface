// src/components/MessageForm.tsx
import { useState, FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { sendMessage } from "../lib/api";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";

interface FormState {
  recipient: string;
  message: string;
}

interface JsonInputData {
  username: string;
  password: string;
  recipient: string;
  message: string;
}

export function MessageForm() {
  const { username, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    recipient: "",
    message: "",
  });
  const [jsonInput, setJsonInput] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username) return;

    setLoading(true);

    try {
      const result = await sendMessage({
        username: formData.recipient,
        from_username: username,
        content: formData.message,
      });

      if (result.success) {
        toast.success("Message sent successfully");
        setFormData({ recipient: "", message: "" });
      } else {
        toast.error(result.error || "Failed to send message");
      }
    } catch (error) {
      toast.error(`An unexpected error occurred: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJsonSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const data = JSON.parse(jsonInput) as JsonInputData;

      setFormData({
        recipient: data.recipient,
        message: data.message,
      });
      toast.success("Form fields updated from JSON");
    } catch {
      toast.error("Invalid JSON format");
    }
  };

  const isFormValid = formData.recipient.trim() && formData.message.trim();

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Send Message</h2>
          <div className="space-x-4">
            <span className="text-sm text-gray-600">
              Logged in as: {username}
            </span>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="manual">Manual Input</TabsTrigger>
            <TabsTrigger value="json">JSON Input</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form
              onSubmit={handleSubmit}
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
                disabled={loading || !isFormValid}
              >
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="json">
            <form
              onSubmit={handleJsonSubmit}
              className="bg-white p-6 rounded-lg shadow space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="json">JSON Input</Label>
                <Textarea
                  id="json"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`{
  "username": "example",
  "password": "pass",
  "recipient": "user",
  "message": "Hello"
}`}
                  rows={6}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!jsonInput.trim()}
              >
                Parse JSON
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


