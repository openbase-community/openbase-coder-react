import DashboardLayout from "@/components/layouts/ExampleLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { User } from "lucide-react";
import React from "react";

const Settings: React.FC = () => {
  const { logout } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-light mb-2">Settings</h1>
          <p className="text-gray-600">
            Manage your connection settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Authentication
            </CardTitle>
            <CardDescription>Openbase bearer JWT connection</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={logout}>
              Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
