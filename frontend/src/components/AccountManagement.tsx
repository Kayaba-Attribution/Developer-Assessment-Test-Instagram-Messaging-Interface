import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { getInstagramAccounts } from "@/lib/api";
import { InstagramAccount } from "@/lib/types";
import { toast } from "sonner";

export function AccountManagement() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await getInstagramAccounts();
      if (response.success && response.data) {
        setAccounts(response.data);
      } else {
        toast.error(response.error || "Failed to fetch accounts");
      }
    } catch (error) {
      toast.error("An error occurred while fetching accounts");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map((account) => account.username));
    }
  };

  const toggleSelect = (username: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  };

  if (loading) {
    return <div className="p-4">Loading accounts...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h2 className="text-2xl font-bold mb-4">Instagram Account Management</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    accounts.length > 0 &&
                    selectedAccounts.length === accounts.length
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all accounts"
                />
              </TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.username}>
                <TableCell>
                  <Checkbox
                    checked={selectedAccounts.includes(account.username)}
                    onCheckedChange={() => toggleSelect(account.username)}
                    aria-label={`Select ${account.username}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{account.username}</TableCell>
                <TableCell>
                  <Badge
                    variant={account.isSessionValid ? "success" : "destructive"}
                  >
                    {account.isSessionValid ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(account.lastActivity).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No accounts found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 