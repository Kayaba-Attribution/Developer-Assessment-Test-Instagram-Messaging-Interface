import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

interface UnderConstructionAlertProps {
  onContinue: () => void;
}

export function UnderConstructionAlert({ onContinue }: UnderConstructionAlertProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center text-yellow-500 mb-4">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-bold text-center mb-2">Under Construction</h2>
        <p className="text-gray-600 text-center mb-6">
          This page is currently under development. Some features may not work as expected.
        </p>
        <Button 
          onClick={onContinue}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Continue Anyway
        </Button>
      </div>
    </div>
  );
} 