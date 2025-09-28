import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ProjectPlanning from "@/pages/project-planning";
import ProjectTemplates from "@/pages/project-templates";
import CodeAnalysis from "@/pages/code-analysis";
import WebSearch from "@/pages/web-search";
import DocumentAnalysis from "@/pages/document-analysis";
import Integrations from "@/pages/integrations";
import Settings from "@/pages/settings";
import MainLayout from "@/components/layout/main-layout";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/project-planning" component={ProjectPlanning} />
        <Route path="/project-templates" component={ProjectTemplates} />
        <Route path="/code-analysis" component={CodeAnalysis} />
        <Route path="/web-search" component={WebSearch} />
        <Route path="/document-analysis" component={DocumentAnalysis} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
