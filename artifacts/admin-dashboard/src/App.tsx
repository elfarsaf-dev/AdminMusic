import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Overview from "@/pages/overview";
import Users from "@/pages/users";
import UserDetail from "@/pages/user-detail";
import Usage from "@/pages/usage";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, params }: any) {
  const { adminKey, isChecking } = useAuth();
  
  if (isChecking) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading console...</div>;
  }
  
  if (!adminKey) {
    return <Login />;
  }

  return (
    <Shell>
      <Component params={params} />
    </Shell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => <ProtectedRoute component={Overview} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedRoute component={Users} />}
      </Route>
      <Route path="/users/:id">
        {(params) => <ProtectedRoute component={UserDetail} params={params} />}
      </Route>
      <Route path="/usage">
        {() => <ProtectedRoute component={Usage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="audiops-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
