import { useState } from "react";
import { toast } from "sonner";
import { registerUser } from "../lib/api";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Input } from "./ui/input";

export function AccountCreation() {
  const [loading, setLoading] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [numberOfAccounts, setNumberOfAccounts] = useState(1);
  const { user, loginWithGoogle } = useAuth();


  const handleAccountCreation = async (count: number = 1) => {
    if (!user) {
      toast.error("Please login first");
      loginWithGoogle();
      return;
    }

    setLoading(true);

    try {
      // Create accounts sequentially
      for (let i = 0; i < count; i++) {
        const response = await registerUser();

        if (response.success) {
          toast.success(`Account ${i + 1}/${count} created successfully!`, {
            description: response.data?.username ? 
              `Username: ${response.data.username}` : 
              undefined
          });
        } else {
          if (response.error === 'Please login to create an account') {
            loginWithGoogle();
            return;
          }
          toast.error(`Failed to create account ${i + 1}/${count}`, {
            description: response.error
          });
          break; // Stop on first error
        }
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
      if (bulkMode) setBulkMode(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle className="text-center">Instagram Account Creation</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {!user ? (
          <Button 
            onClick={loginWithGoogle}
            className="w-full"
          >
            Login with Google to Create Accounts
          </Button>
        ) : (
          <>
            <div className="flex gap-4">
              <Button
                onClick={() => handleAccountCreation(1)}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <Button
                onClick={() => setBulkMode(true)}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Bulk Create
              </Button>
            </div>

            {bulkMode && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Number of Accounts
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={numberOfAccounts}
                    onChange={(e) => setNumberOfAccounts(parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <Button
                  onClick={() => handleAccountCreation(numberOfAccounts)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating {numberOfAccounts} Accounts...
                    </>
                  ) : (
                    `Create ${numberOfAccounts} Accounts`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
