import { Route } from "wouter";
import MainLayout from "@/components/layout/main-layout";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  // Simplified protected route that doesn't perform any auth checks
  // Always allows access to all routes with the main layout
  return (
    <Route path={path}>
      <MainLayout>
        <Component />
      </MainLayout>
    </Route>
  );
}