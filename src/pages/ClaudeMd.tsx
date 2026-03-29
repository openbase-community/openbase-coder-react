import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const ClaudeMd = () => {
  const [searchParams] = useSearchParams();
  const dirPath = searchParams.get("path") || "";
  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContent = useCallback(async () => {
    const params = dirPath ? `?path=${encodeURIComponent(dirPath)}` : "";
    const res = await apiFetch(`/api/claude-md/${params}`);
    if (res.ok) {
      const data = await res.json();
      setContent(data.content);
      setFilePath(data.path);
    }
    setLoading(false);
  }, [dirPath]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleSave = async () => {
    setSaving(true);
    const params = dirPath ? `?path=${encodeURIComponent(dirPath)}` : "";
    const res = await apiFetch(`/api/claude-md/${params}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("CLAUDE.md saved");
    } else {
      toast.error("Failed to save CLAUDE.md");
    }
  };

  const title = dirPath ? `CLAUDE.md for ${dirPath}` : "Global CLAUDE.md";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-light mb-2">{title}</h1>
          <p className="text-gray-600 text-sm">{filePath}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Editor</CardTitle>
            <CardDescription>
              Edit your CLAUDE.md instructions file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-gray-400">
                Loading...
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-96 font-mono text-sm p-4 border rounded-lg resize-y bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="# CLAUDE.md instructions..."
              />
            )}
            <Button onClick={handleSave} disabled={saving || loading}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClaudeMd;
