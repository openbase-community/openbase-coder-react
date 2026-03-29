import DashboardLayout from "@/components/layouts/ExampleLayout";
import { usePluginRegistry } from "@/plugin-registry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "react-router-dom";

const ProjectView = () => {
  const { pluginProjectViews } = usePluginRegistry();
  const [searchParams] = useSearchParams();
  const projectPath = searchParams.get("path") || "";
  const stack = searchParams.get("stack") || "";

  const view = pluginProjectViews.find((item) => item.stack === stack);

  if (!projectPath || !stack) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Missing Project Context</CardTitle>
          </CardHeader>
          <CardContent>
            Project path and stack are required to render this project view.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!view) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>No Visualizer for Stack</CardTitle>
          </CardHeader>
          <CardContent>
            No plugin project visualizer is installed for stack <code>{stack}</code>.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const Component = view.component;

  return (
    <DashboardLayout noPadding>
      <Component projectPath={projectPath} stack={stack} pluginId={view.pluginId} />
    </DashboardLayout>
  );
};

export default ProjectView;
