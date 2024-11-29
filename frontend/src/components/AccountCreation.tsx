import { useState, useEffect } from "react";
import { toast } from "sonner";
import { registerUser, getRegistrationStatus } from "../lib/api";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { RegistrationStatus } from "../lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

const STATUS_MESSAGES = {
  INITIALIZED: 'Starting registration...',
  PROFILE_CREATED: 'Profile created, launching browser...',
  BROWSER_LAUNCHED: 'Browser ready, navigating to Instagram...',
  FORM_FILLING: 'Filling registration form...',
  AWAITING_VERIFICATION: 'Waiting for verification code...',
  VERIFICATION_SUBMITTED: 'Submitting verification...',
  COMPLETED: 'Registration completed!',
  FAILED: 'Registration failed'
};

const STATUS_PROGRESS = {
  INITIALIZED: 10,
  PROFILE_CREATED: 25,
  BROWSER_LAUNCHED: 40,
  FORM_FILLING: 60,
  AWAITING_VERIFICATION: 75,
  VERIFICATION_SUBMITTED: 90,
  COMPLETED: 100,
  FAILED: 100
};

interface CreatedAccount {
  username: string;
  timestamp: number;
  status: string;
}

export function AccountCreation() {
  const [loading, setLoading] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [numberOfAccounts, setNumberOfAccounts] = useState(1);
  const [currentStatus, setCurrentStatus] = useState<RegistrationStatus | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const { user, loginWithGoogle } = useAuth();
  const [createdAccounts, setCreatedAccounts] = useState<CreatedAccount[]>([]);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [isBulkCreating, setIsBulkCreating] = useState(false);

  useEffect(() => {
    let statusInterval: NodeJS.Timeout;

    if (registrationId) {
      const pollStatus = async () => {
        const response = await getRegistrationStatus(registrationId);
        if (response.success && response.data) {
          setCurrentStatus(response.data);
          
          if (['COMPLETED', 'FAILED'].includes(response.data.status)) {
            clearInterval(statusInterval);
            setLoading(false);
            setRegistrationId(null);
            
            if (response.data.status === 'COMPLETED') {
              if (response.data.details.username) {
                setCreatedAccounts(prev => [...prev, {
                  username: response.data.details.username,
                  timestamp: response.data.timestamp,
                  status: response.data.status
                }]);
              }
              toast.success('Account created successfully!', {
                description: response.data.details.username ? 
                  `Username: ${response.data.details.username}` : 
                  undefined
              });
              setCurrentStatus(null);
            } else {
              toast.error('Registration failed', {
                description: response.data.details.error
              });
            }
          }
        }
      };

      pollStatus();
      statusInterval = setInterval(pollStatus, 2000);
    }

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [registrationId]);

  const handleAccountCreation = async (count: number = 1) => {
    if (!user) {
      toast.error("Please login first");
      loginWithGoogle();
      return;
    }

    setLoading(true);
    setCurrentStatus(null);

    if (count > 1) {
      setIsBulkCreating(true);
      setBulkProgress(0);
      
      for (let i = 0; i < count; i++) {
        try {
          const response = await registerUser();

          if (response.success && response.registrationId) {
            setRegistrationId(response.registrationId);
            
            await new Promise<void>((resolve) => {
              const checkStatus = setInterval(async () => {
                const statusResponse = await getRegistrationStatus(response.registrationId);
                if (statusResponse.success && statusResponse.data) {
                  setCurrentStatus(statusResponse.data);
                  
                  if (['COMPLETED', 'FAILED'].includes(statusResponse.data.status)) {
                    clearInterval(checkStatus);
                    if (statusResponse.data.status === 'COMPLETED' && statusResponse.data.details.username) {
                      setCreatedAccounts(prev => [...prev, {
                        username: statusResponse.data.details.username,
                        timestamp: statusResponse.data.timestamp,
                        status: statusResponse.data.status
                      }]);
                    } else if (statusResponse.data.status === 'FAILED') {
                      toast.error(`Account creation failed: ${statusResponse.data.details.error}`);
                    }
                    resolve();
                  }
                }
              }, 2000);
            });

            setBulkProgress(Math.round(((i + 1) / count) * 100));
          }
        } catch (error) {
          console.error(error);
          toast.error(`Failed to create account ${i + 1}`);
        }
      }
      
      setIsBulkCreating(false);
      setLoading(false);
      setCurrentStatus(null);
      toast.success(`Bulk creation completed. Created ${createdAccounts.length} accounts.`);
    } else {
      try {
        const response = await registerUser();

        if (response.success && response.registrationId) {
          setRegistrationId(response.registrationId);
          setCurrentStatus({
            status: 'INITIALIZED',
            timestamp: Date.now(),
            details: {}
          });
        } else {
          if (response.error === 'Please login to create an account') {
            loginWithGoogle();
            return;
          }
          toast.error('Failed to start registration', {
            description: response.error
          });
          setLoading(false);
        }
      } catch (error: unknown) {
        console.error(error);
        toast.error("An unexpected error occurred");
        setLoading(false);
      }
    }
  };

  return (
    <Card className="max-w-4xl mx-auto mt-10">
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
            {(currentStatus || isBulkCreating) && (
              <div className="space-y-2">
                <Progress 
                  value={isBulkCreating ? bulkProgress : STATUS_PROGRESS[currentStatus?.status || 'INITIALIZED']} 
                />
                <p className="text-sm text-center text-gray-600">
                  {isBulkCreating 
                    ? `Creating accounts... (${Math.round(bulkProgress)}%)`
                    : STATUS_MESSAGES[currentStatus?.status || 'INITIALIZED']
                  }
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={() => handleAccountCreation(1)}
                disabled={loading}
                className="w-full"
              >
                {loading && !isBulkCreating ? (
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
                  {isBulkCreating ? (
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

            {createdAccounts.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Created Accounts</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {createdAccounts.map((account) => (
                      <TableRow key={account.username}>
                        <TableCell>{account.username}</TableCell>
                        <TableCell>{account.status}</TableCell>
                        <TableCell>
                          {new Date(account.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
