import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { LLMService } from "./services/llm-service";
import { SearchService } from "./services/search-service";
import { FileService } from "./services/file-service";
import { GitHubService } from "./services/github-service";
import { TemplateService } from "./services/template-service";
import { ProjectGeneratorService } from "./services/project-generator";
import { GitHubExportService } from "./services/github-export";
import multer from "multer";
import { z } from "zod";
import { 
  insertConversationSchema,
  insertMessageSchema,
  insertProjectSchema,
  insertLLMConfigurationSchema,
  insertSearchEngineSchema,
  insertUserPreferencesSchema,
  insertUserSchema,
  insertProjectTemplateSchema
} from "@shared/schema";

// Validation schema for project generation request
const generateProjectSchema = z.object({
  projectName: z.string().min(1, "Project name is required").max(100, "Project name too long"),
  description: z.string().max(500, "Description too long").optional()
});

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  const llmService = new LLMService();
  const searchService = new SearchService();
  const fileService = new FileService();
  const githubService = new GitHubService();
  const templateService = new TemplateService();
  const projectGenerator = new ProjectGeneratorService();
  const githubExportService = new GitHubExportService();

  // Initialize default templates if none exist
  await templateService.initializeDefaultTemplates();

  // Simple session-based auth (for demo purposes)
  const sessionStore = new Map();

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId || !sessionStore.has(sessionId)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.user = sessionStore.get(sessionId);
    next();
  };

  // Get current user endpoint
  app.get('/api/auth/me', requireAuth, (req: any, res: any) => {
    res.json({ user: req.user });
  });

  // Auto-login for development (creates demo user if none exists)
  app.post('/api/auth/demo-login', async (req: any, res: any) => {
    try {
      let user = await storage.getUserByUsername('demo-user');
      
      if (!user) {
        user = await storage.createUser({
          username: 'demo-user',
          password: 'demo' // In production, this should be hashed
        });
      }
      
      const sessionId = `session_${Date.now()}_${Math.random()}`;
      sessionStore.set(sessionId, user);
      
      res.json({ user, sessionId });
    } catch (error) {
      console.error('Demo login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Helper function to get userId from request
  const getUserId = (req: any): string => {
    // For development, use demo user or create one
    return req.user?.id || 'demo-user';
  };

  // Conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = getUserId(req);
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const userId = getUserId(req);
      const data = insertConversationSchema.parse({ ...req.body, userId });
      const conversation = await storage.createConversation(data);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteConversation(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Conversation not found" });
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Messages
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessagesByConversationId(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const data = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(data);
      
      // Update conversation timestamp
      await storage.updateConversation(data.conversationId!, { updatedAt: new Date() });
      
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // LLM Integration
  app.post("/api/llm/chat", async (req, res) => {
    try {
      const { configId, messages, temperature, maxTokens } = req.body;
      
      const config = await storage.getLLMConfiguration(configId);
      if (!config) {
        return res.status(404).json({ error: "LLM configuration not found" });
      }

      const response = await llmService.sendMessage(config, {
        messages,
        temperature,
        maxTokens,
      });

      res.json(response);
    } catch (error) {
      console.error("Error in LLM chat:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to process LLM request" });
    }
  });

  app.post("/api/llm/test-connection", async (req, res) => {
    try {
      const { endpoint, model } = req.body;
      
      if (!endpoint || !model) {
        return res.status(400).json({ error: "endpoint and model are required" });
      }

      const isConnected = await llmService.testConnection(endpoint, model);
      res.json({ connected: isConnected });
    } catch (error) {
      console.error("Error testing LLM connection:", error);
      res.status(500).json({ error: "Failed to test LLM connection" });
    }
  });

  app.get("/api/llm/models", async (req, res) => {
    try {
      const { endpoint } = req.query;
      
      if (!endpoint || typeof endpoint !== 'string') {
        return res.status(400).json({ error: "endpoint is required" });
      }

      const models = await llmService.getAvailableModels(endpoint);
      res.json({ models });
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch models" });
    }
  });

  // LLM Configurations
  app.get("/api/llm-configurations", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const configs = await storage.getLLMConfigurationsByUserId(userId);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching LLM configurations:", error);
      res.status(500).json({ error: "Failed to fetch LLM configurations" });
    }
  });

  app.post("/api/llm-configurations", async (req, res) => {
    try {
      const data = insertLLMConfigurationSchema.parse(req.body);
      const config = await storage.createLLMConfiguration(data);
      res.json(config);
    } catch (error) {
      console.error("Error creating LLM configuration:", error);
      res.status(500).json({ error: "Failed to create LLM configuration" });
    }
  });

  app.put("/api/llm-configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const config = await storage.updateLLMConfiguration(id, updates);
      
      if (config) {
        res.json(config);
      } else {
        res.status(404).json({ error: "LLM configuration not found" });
      }
    } catch (error) {
      console.error("Error updating LLM configuration:", error);
      res.status(500).json({ error: "Failed to update LLM configuration" });
    }
  });

  app.delete("/api/llm-configurations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteLLMConfiguration(id);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "LLM configuration not found" });
      }
    } catch (error) {
      console.error("Error deleting LLM configuration:", error);
      res.status(500).json({ error: "Failed to delete LLM configuration" });
    }
  });

  // Search
  app.post("/api/search", async (req, res) => {
    try {
      const { query, userId, maxResults = 10 } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "query is required" });
      }

      const engines = await storage.getEnabledSearchEngines(userId);
      const results = await searchService.search(engines, query, maxResults);
      
      // Add informational message if no results and engines are missing API keys
      if (results.totalResults === 0 && engines.length > 0) {
        const missingKeys = engines.filter(engine => 
          (engine.name.toLowerCase() === 'google' && (!engine.apiKey && !process.env.GOOGLE_API_KEY)) ||
          (engine.name.toLowerCase() === 'bing' && (!engine.apiKey && !process.env.BING_API_KEY))
        );
        
        if (missingKeys.length > 0) {
          results.message = `No results found. ${missingKeys.map(e => e.name).join(', ')} require${missingKeys.length === 1 ? 's' : ''} API key configuration.`;
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error performing search:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  app.post("/api/search/fetch-content", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "url is required" });
      }

      const content = await searchService.fetchWebContent(url);
      res.json({ content });
    } catch (error) {
      console.error("Error fetching web content:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch web content" });
    }
  });

  // Search Engines
  app.get("/api/search-engines", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const engines = await storage.getSearchEnginesByUserId(userId || "");
      // Don't return API keys for security - only indicate if they exist
      const safeEngines = engines.map(engine => ({
        ...engine,
        hasApiKey: !!engine.apiKey,
        apiKey: undefined
      }));
      res.json(safeEngines);
    } catch (error) {
      console.error("Error fetching search engines:", error);
      res.status(500).json({ error: "Failed to fetch search engines" });
    }
  });

  app.put("/api/search-engines/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const engine = await storage.updateSearchEngine(id, updates);
      
      if (engine) {
        res.json(engine);
      } else {
        res.status(404).json({ error: "Search engine not found" });
      }
    } catch (error) {
      console.error("Error updating search engine:", error);
      res.status(500).json({ error: "Failed to update search engine" });
    }
  });

  // User Preferences
  app.get("/api/user-preferences", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ error: "Failed to fetch user preferences" });
    }
  });

  app.put("/api/user-preferences", async (req, res) => {
    try {
      const { userId, ...updates } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const preferences = await storage.updateUserPreferences(userId, updates);
      if (preferences) {
        res.json(preferences);
      } else {
        res.status(404).json({ error: "User preferences not found" });
      }
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ error: "Failed to update user preferences" });
    }
  });

  // Data management endpoints
  app.post("/api/data/export", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const userData = {
        conversations: await storage.getConversationsByUserId(userId),
        projects: await storage.getProjectsByUserId(userId),
        files: await storage.getFilesByUserId(userId),
        llmConfigurations: await storage.getLLMConfigurationsByUserId(userId),
        searchEngines: await storage.getSearchEnginesByUserId(userId),
        preferences: await storage.getUserPreferences(userId),
        exportDate: new Date().toISOString(),
      };

      res.json(userData);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  app.post("/api/data/clear-cache", async (req, res) => {
    try {
      // In a real implementation, this would clear actual cache
      res.json({ success: true, message: "Cache cleared successfully" });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  app.post("/api/data/reset-settings", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Reset to default preferences
      const defaultPrefs = {
        theme: "dark",
        compactMode: false,
        animations: true,
        fontSize: "medium",
        codeFont: "jetbrains",
        maxConcurrentRequests: 5,
        cacheDuration: 30,
        autoSaveConversations: true,
        analyticsCollection: false,
      };

      const preferences = await storage.updateUserPreferences(userId, defaultPrefs);
      res.json(preferences);
    } catch (error) {
      console.error("Error resetting settings:", error);
      res.status(500).json({ error: "Failed to reset settings" });
    }
  });

  // File Upload and Analysis
  app.post("/api/files/upload", upload.single('file'), async (req, res) => {
    try {
      const { userId } = req.body;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const savedFile = await fileService.saveFile(
        userId,
        file.originalname,
        file.buffer,
        file.mimetype
      );

      res.json(savedFile);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/api/files", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const files = await storage.getFilesByUserId(userId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.get("/api/files/:id/content", async (req, res) => {
    try {
      const { id } = req.params;
      const file = await storage.getFile(id);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      const content = await fileService.getFileContent(file);
      
      res.set({
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
      });
      
      res.send(content);
    } catch (error) {
      console.error("Error fetching file content:", error);
      res.status(500).json({ error: "Failed to fetch file content" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await fileService.deleteFile(id);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const projects = await storage.getProjectsByUserId(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const project = await storage.updateProject(id, updates);
      
      if (project) {
        res.json(project);
      } else {
        res.status(404).json({ error: "Project not found" });
      }
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteProject(id);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Project not found" });
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // GitHub Integration
  app.get("/api/github/repositories", async (req, res) => {
    try {
      const repositories = await githubService.getUserRepositories();
      res.json(repositories);
    } catch (error) {
      console.error("Error fetching GitHub repositories:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch repositories" });
    }
  });

  app.get("/api/github/repositories/:owner/:repo/contents", async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const { path = "" } = req.query;
      
      const contents = await githubService.getRepositoryContents(owner, repo, path as string);
      res.json(contents);
    } catch (error) {
      console.error("Error fetching repository contents:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch repository contents" });
    }
  });

  app.get("/api/github/repositories/:owner/:repo/analyze", async (req, res) => {
    try {
      const { owner, repo } = req.params;
      
      const analysis = await githubService.analyzeRepository(owner, repo);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing repository:", error);
      
      // Provide more specific error messaging
      let errorMessage = "Failed to analyze repository";
      if (error instanceof Error) {
        if (error.message.includes('GitHub not connected') || error.message.includes('X_REPLIT_TOKEN not found')) {
          errorMessage = "GitHub authentication not configured. Please set up GitHub integration in your Replit account.";
        } else if (error.message.includes('403') || error.message.includes('rate limit')) {
          errorMessage = "GitHub API rate limit exceeded or access denied. Please try again later.";
        } else if (error.message.includes('404')) {
          errorMessage = "Repository not found or not accessible. Please check the repository URL and permissions.";
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/github/repositories", async (req, res) => {
    try {
      const { name, description, private: isPrivate = false } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Repository name is required" });
      }

      const repository = await githubService.createRepository(name, description, isPrivate);
      res.json(repository);
    } catch (error) {
      console.error("Error creating repository:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create repository" });
    }
  });

  // Project Templates API
  app.get("/api/project-templates", async (req, res) => {
    try {
      const { category } = req.query;
      
      let templates;
      if (category && typeof category === 'string') {
        templates = await storage.getProjectTemplatesByCategory(category);
      } else {
        templates = await storage.getProjectTemplates();
      }
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching project templates:", error);
      res.status(500).json({ error: "Failed to fetch project templates" });
    }
  });

  app.get("/api/project-templates/:id", async (req, res) => {
    try {
      const template = await storage.getProjectTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Project template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching project template:", error);
      res.status(500).json({ error: "Failed to fetch project template" });
    }
  });

  app.post("/api/project-templates", async (req, res) => {
    try {
      const templateData = insertProjectTemplateSchema.parse(req.body);
      const template = await storage.createProjectTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating project template:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid template data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create project template" });
      }
    }
  });

  app.post("/api/project-templates/:id/generate", requireAuth, async (req, res) => {
    try {
      // Validate request body with Zod
      const validationResult = generateProjectSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validationResult.error.errors 
        });
      }

      const { projectName, description } = validationResult.data;
      const templateId = req.params.id;

      // Check if template exists
      const template = await storage.getProjectTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const userId = getUserId(req);
      const result = await projectGenerator.generateProjectFromTemplate(
        templateId,
        projectName.trim(),
        description?.trim() || '',
        userId
      );

      // Return the generated project with download information
      res.json({
        project: result.project,
        downloadUrl: result.downloadUrl,
        message: "Project generated successfully! Files have been created and packaged for download."
      });
    } catch (error) {
      console.error("Error generating project from template:", error);
      const message = error instanceof Error ? error.message : "Failed to generate project from template";
      
      // Return appropriate status code based on error type
      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }
      if (message.includes('Path traversal') || message.includes('Absolute paths') || message.includes('Path escapes')) {
        return res.status(400).json({ error: "Invalid file path in template" });
      }
      
      res.status(500).json({ error: message });
    }
  });

  // Project download endpoint
  app.get("/api/download/project/:id", requireAuth, async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Validate project ID format (should be UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(projectId)) {
        return res.status(400).json({ error: "Invalid project ID format" });
      }

      // Check if project exists and user owns it
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const userId = getUserId(req);
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied: you don't own this project" });
      }

      const zipPath = await projectGenerator.getProjectDownload(projectId);
      
      if (!zipPath) {
        return res.status(404).json({ error: "Project download not found" });
      }

      const filename = `${project.name.toLowerCase().replace(/\s+/g, '-')}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.download(zipPath);
    } catch (error) {
      console.error("Error downloading project:", error);
      res.status(500).json({ error: "Failed to download project" });
    }
  });

  // GitHub Export endpoint
  app.post("/api/export/github", async (req, res) => {
    try {
      const { repoName = 'ai-assistant-studio', description = 'AI development companion with local LLM integration', isPrivate = false } = req.body;
      
      console.log(`Starting GitHub export for repository: ${repoName}`);
      const result = await githubExportService.exportProject(repoName, description, isPrivate);
      
      if (result.success) {
        res.json({
          success: true,
          repositoryUrl: result.repositoryUrl,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("GitHub export failed:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Export functionality
  app.post("/api/export/conversation", async (req, res) => {
    try {
      const { conversationId, format = 'json' } = req.body;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const messages = await storage.getMessagesByConversationId(conversationId);
      
      const exportData = {
        conversation,
        messages,
        exportedAt: new Date().toISOString(),
      };

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.json"`);
        res.json(exportData);
      } else if (format === 'markdown') {
        let markdown = `# ${conversation.title}\n\n`;
        markdown += `**Created:** ${conversation.createdAt}\n`;
        markdown += `**Updated:** ${conversation.updatedAt}\n\n`;
        
        messages.forEach(message => {
          markdown += `## ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}\n\n`;
          markdown += `${message.content}\n\n`;
          markdown += `*${message.createdAt}*\n\n---\n\n`;
        });

        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.md"`);
        res.send(markdown);
      } else {
        res.status(400).json({ error: "Unsupported export format. Use 'json' or 'markdown'" });
      }
    } catch (error) {
      console.error("Error exporting conversation:", error);
      res.status(500).json({ error: "Failed to export conversation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
