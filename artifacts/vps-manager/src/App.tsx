import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import AddServer from "@/pages/add-server";
import ServerHome from "@/pages/server/home";
import ServerFiles from "@/pages/server/files";
import ServerTerminal from "@/pages/server/terminal";
import ServerProcesses from "@/pages/server/processes";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ThemeSetter() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  return null;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/add-server" component={AddServer} />
        <Route path="/servers/:id" component={ServerHome} />
        <Route path="/servers/:id/files" component={ServerFiles} />
        <Route path="/servers/:id/terminal" component={ServerTerminal} />
        <Route path="/servers/:id/processes" component={ServerProcesses} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSetter />
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
