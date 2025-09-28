import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const pageConfig = {
  "/": {
    title: "Chat Assistant",
    description: "AI-powered conversation interface",
  },
  "/project-planning": {
    title: "Project Planning",
    description: "Software architecture and design tools",
  },
  "/code-analysis": {
    title: "Code Analysis",
    description: "Review and optimize your code",
  },
  "/web-search": {
    title: "Web Search",
    description: "Multi-engine search and content analysis",
  },
  "/document-analysis": {
    title: "Document Analysis",
    description: "Process and analyze uploaded documents",
  },
  "/integrations": {
    title: "Integrations",
    description: "Connect external services and APIs",
  },
  "/settings": {
    title: "Settings",
    description: "Configure your AI assistant",
  },
};

export default function Header() {
  const [location] = useLocation();
  const config = pageConfig[location as keyof typeof pageConfig] || { title: "AI Assistant", description: "" };

  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-lg text-card-foreground" data-testid="page-title">{config.title}</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 status-pulse"></div>
              LLM Ready
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" data-testid="button-export">
            <i className="fas fa-download w-3 h-3 mr-2"></i>
            Export
          </Button>
          
          <Button variant="ghost" size="sm" data-testid="button-history">
            <i className="fas fa-history w-3 h-3 mr-2"></i>
            History
          </Button>
          
          <div className="h-4 w-px bg-border"></div>
          
          <Button size="sm" data-testid="button-new">
            <i className="fas fa-plus w-3 h-3 mr-2"></i>
            New
          </Button>
        </div>
      </div>
    </header>
  );
}
