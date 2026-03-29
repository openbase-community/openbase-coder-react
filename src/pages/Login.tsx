import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { refreshAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onContinue = async () => {
    setIsLoading(true);
    try {
      await refreshAuth();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Unable to verify local login.";
      setMessage(description);
      toast({
        title: "Unable to continue",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-white to-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-light text-center mb-2 text-gray-900">
            Openbase Coder Console
          </h1>
          <p className="text-sm text-gray-500 text-center mb-8">
            Authentication is managed by the local CLI
          </p>
          {message ? (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </div>
          ) : null}

          <div className="space-y-6">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              Run <code className="font-mono">openbase-coder login</code> in a terminal on
              this machine, then return here and continue.
            </div>

            <Button
              type="button"
              onClick={onContinue}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
            >
              {isLoading ? "Checking login..." : "I already logged in"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
