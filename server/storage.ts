import { 
  type User, 
  type InsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Project,
  type InsertProject,
  type File,
  type InsertFile,
  type LLMConfiguration,
  type InsertLLMConfiguration,
  type SearchEngine,
  type InsertSearchEngine,
  type UserPreferences,
  type InsertUserPreferences,
  type ProjectTemplate,
  type InsertProjectTemplate,
  type ProjectPlanVersion,
  type InsertProjectPlanVersion,
  users,
  conversations,
  messages,
  projects,
  files,
  llmConfigurations,
  searchEngines,
  userPreferences,
  projectTemplates,
  projectPlanVersions
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Conversation methods
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;

  // Message methods
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: string): Promise<boolean>;

  // Project methods
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // File methods
  getFile(id: string): Promise<File | undefined>;
  getFilesByUserId(userId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: string, updates: Partial<File>): Promise<File | undefined>;
  deleteFile(id: string): Promise<boolean>;

  // LLM Configuration methods
  getLLMConfiguration(id: string): Promise<LLMConfiguration | undefined>;
  getLLMConfigurationsByUserId(userId: string): Promise<LLMConfiguration[]>;
  getDefaultLLMConfiguration(userId: string): Promise<LLMConfiguration | undefined>;
  createLLMConfiguration(config: InsertLLMConfiguration): Promise<LLMConfiguration>;
  updateLLMConfiguration(id: string, updates: Partial<LLMConfiguration>): Promise<LLMConfiguration | undefined>;
  deleteLLMConfiguration(id: string): Promise<boolean>;

  // Search Engine methods
  getSearchEngine(id: string): Promise<SearchEngine | undefined>;
  getSearchEnginesByUserId(userId: string): Promise<SearchEngine[]>;
  getEnabledSearchEngines(userId: string): Promise<SearchEngine[]>;
  createSearchEngine(engine: InsertSearchEngine): Promise<SearchEngine>;
  updateSearchEngine(id: string, updates: Partial<SearchEngine>): Promise<SearchEngine | undefined>;
  deleteSearchEngine(id: string): Promise<boolean>;

  // User Preferences methods
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined>;

  // Project Template methods
  getProjectTemplate(id: string): Promise<ProjectTemplate | undefined>;
  getProjectTemplates(): Promise<ProjectTemplate[]>;
  getProjectTemplatesByCategory(category: string): Promise<ProjectTemplate[]>;
  createProjectTemplate(template: InsertProjectTemplate): Promise<ProjectTemplate>;
  updateProjectTemplate(id: string, updates: Partial<ProjectTemplate>): Promise<ProjectTemplate | undefined>;
  deleteProjectTemplate(id: string): Promise<boolean>;

  // Project Plan Version methods
  getProjectPlanVersion(id: string): Promise<ProjectPlanVersion | undefined>;
  getProjectPlanVersionsByProjectId(projectId: string): Promise<ProjectPlanVersion[]>;
  getLatestProjectPlanVersion(projectId: string): Promise<ProjectPlanVersion | undefined>;
  createProjectPlanVersion(version: InsertProjectPlanVersion): Promise<ProjectPlanVersion>;
  updateProjectPlanVersion(id: string, updates: Partial<ProjectPlanVersion>): Promise<ProjectPlanVersion | undefined>;
  deleteProjectPlanVersion(id: string): Promise<boolean>;
  getProjectPlanVersionHistory(projectId: string): Promise<ProjectPlanVersion[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private projects: Map<string, Project>;
  private files: Map<string, File>;
  private llmConfigurations: Map<string, LLMConfiguration>;
  private searchEngines: Map<string, SearchEngine>;
  private userPreferences: Map<string, UserPreferences>;
  private projectTemplates: Map<string, ProjectTemplate>;
  private projectPlanVersions: Map<string, ProjectPlanVersion>;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.projects = new Map();
    this.files = new Map();
    this.llmConfigurations = new Map();
    this.searchEngines = new Map();
    this.userPreferences = new Map();
    this.projectTemplates = new Map();
    this.projectPlanVersions = new Map();

    // Initialize with default search engines and LLM configurations
    this.initializeDefaultSearchEngines();
    this.initializeDefaultLLMConfiguration();
  }

  private initializeDefaultSearchEngines() {
    const defaultEngines = [
      { name: "Google", enabled: true, apiKey: null },
      { name: "Bing", enabled: true, apiKey: null },
      { name: "DuckDuckGo", enabled: false, apiKey: null }
    ];

    defaultEngines.forEach(engine => {
      const id = randomUUID();
      this.searchEngines.set(id, {
        id,
        userId: null,
        ...engine,
        createdAt: new Date()
      });
    });
  }

  private initializeDefaultLLMConfiguration() {
    const id = randomUUID();
    const defaultConfig: LLMConfiguration = {
      id,
      userId: null, // Global default configuration
      name: "Ollama Local",
      endpoint: "http://localhost:11434",
      model: "llama2-7b-chat",
      temperature: 70, // 0.7 * 100
      maxTokens: 2048,
      isDefault: true,
      createdAt: new Date()
    };
    
    this.llmConfigurations.set(id, defaultConfig);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Conversation methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => b.updatedAt!.getTime() - a.updatedAt!.getTime());
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = {
      userId: insertConversation.userId || null,
      title: insertConversation.title,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;

    const updated = { ...conversation, ...updates, updatedAt: new Date() };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: string): Promise<boolean> {
    return this.conversations.delete(id);
  }

  // Message methods
  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      conversationId: insertMessage.conversationId || null,
      role: insertMessage.role,
      content: insertMessage.content,
      metadata: insertMessage.metadata || null,
      id,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async deleteMessage(id: string): Promise<boolean> {
    return this.messages.delete(id);
  }

  // Project methods
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values())
      .filter(project => project.userId === userId)
      .sort((a, b) => b.updatedAt!.getTime() - a.updatedAt!.getTime());
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    const project: Project = {
      userId: insertProject.userId || null,
      name: insertProject.name,
      description: insertProject.description || null,
      githubUrl: insertProject.githubUrl || null,
      status: insertProject.status || null,
      metadata: insertProject.metadata || null,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updated = { ...project, ...updates, updatedAt: new Date() };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  // File methods
  async getFile(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesByUserId(userId: string): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const file: File = {
      userId: insertFile.userId || null,
      filename: insertFile.filename,
      originalName: insertFile.originalName,
      mimeType: insertFile.mimeType,
      size: insertFile.size,
      path: insertFile.path,
      analysis: insertFile.analysis || null,
      id,
      createdAt: new Date()
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: string, updates: Partial<File>): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;

    const updated = { ...file, ...updates };
    this.files.set(id, updated);
    return updated;
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  // LLM Configuration methods
  async getLLMConfiguration(id: string): Promise<LLMConfiguration | undefined> {
    return this.llmConfigurations.get(id);
  }

  async getLLMConfigurationsByUserId(userId: string): Promise<LLMConfiguration[]> {
    return Array.from(this.llmConfigurations.values())
      .filter(config => config.userId === userId || config.userId === null) // Include global configs
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getDefaultLLMConfiguration(userId: string): Promise<LLMConfiguration | undefined> {
    return Array.from(this.llmConfigurations.values())
      .find(config => (config.userId === userId || config.userId === null) && config.isDefault);
  }

  async createLLMConfiguration(insertConfig: InsertLLMConfiguration): Promise<LLMConfiguration> {
    const id = randomUUID();
    const config: LLMConfiguration = {
      userId: insertConfig.userId || null,
      name: insertConfig.name,
      endpoint: insertConfig.endpoint,
      model: insertConfig.model,
      temperature: insertConfig.temperature || null,
      maxTokens: insertConfig.maxTokens || null,
      isDefault: insertConfig.isDefault || null,
      id,
      createdAt: new Date()
    };
    this.llmConfigurations.set(id, config);
    return config;
  }

  async updateLLMConfiguration(id: string, updates: Partial<LLMConfiguration>): Promise<LLMConfiguration | undefined> {
    const config = this.llmConfigurations.get(id);
    if (!config) return undefined;

    const updated = { ...config, ...updates };
    this.llmConfigurations.set(id, updated);
    return updated;
  }

  async deleteLLMConfiguration(id: string): Promise<boolean> {
    return this.llmConfigurations.delete(id);
  }

  // Search Engine methods
  async getSearchEngine(id: string): Promise<SearchEngine | undefined> {
    return this.searchEngines.get(id);
  }

  async getSearchEnginesByUserId(userId: string): Promise<SearchEngine[]> {
    return Array.from(this.searchEngines.values())
      .filter(engine => engine.userId === userId || engine.userId === null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getEnabledSearchEngines(userId: string): Promise<SearchEngine[]> {
    return Array.from(this.searchEngines.values())
      .filter(engine => engine.enabled && (engine.userId === userId || engine.userId === null));
  }

  async createSearchEngine(insertEngine: InsertSearchEngine): Promise<SearchEngine> {
    const id = randomUUID();
    const engine: SearchEngine = {
      userId: insertEngine.userId || null,
      name: insertEngine.name,
      enabled: insertEngine.enabled || null,
      apiKey: insertEngine.apiKey || null,
      id,
      createdAt: new Date()
    };
    this.searchEngines.set(id, engine);
    return engine;
  }

  async updateSearchEngine(id: string, updates: Partial<SearchEngine>): Promise<SearchEngine | undefined> {
    const engine = this.searchEngines.get(id);
    if (!engine) return undefined;

    const updated = { ...engine, ...updates };
    this.searchEngines.set(id, updated);
    return updated;
  }

  async deleteSearchEngine(id: string): Promise<boolean> {
    return this.searchEngines.delete(id);
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const preferences = Array.from(this.userPreferences.values())
      .find(prefs => prefs.userId === userId);
    
    // Return default preferences if none exist
    if (!preferences) {
      const defaultPrefs: UserPreferences = {
        id: randomUUID(),
        userId,
        theme: "dark",
        compactMode: false,
        animations: true,
        fontSize: "medium",
        codeFont: "jetbrains",
        maxConcurrentRequests: 5,
        cacheDuration: 30,
        autoSaveConversations: true,
        analyticsCollection: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.userPreferences.set(defaultPrefs.id, defaultPrefs);
      return defaultPrefs;
    }
    
    return preferences;
  }

  async createUserPreferences(insertPrefs: InsertUserPreferences): Promise<UserPreferences> {
    const id = randomUUID();
    const preferences: UserPreferences = {
      id,
      userId: insertPrefs.userId || null,
      theme: insertPrefs.theme || "dark",
      compactMode: insertPrefs.compactMode || false,
      animations: insertPrefs.animations || true,
      fontSize: insertPrefs.fontSize || "medium",
      codeFont: insertPrefs.codeFont || "jetbrains",
      maxConcurrentRequests: insertPrefs.maxConcurrentRequests || 5,
      cacheDuration: insertPrefs.cacheDuration || 30,
      autoSaveConversations: insertPrefs.autoSaveConversations || true,
      analyticsCollection: insertPrefs.analyticsCollection || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userPreferences.set(id, preferences);
    return preferences;
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined> {
    const existing = await this.getUserPreferences(userId);
    if (!existing) return undefined;

    const updated: UserPreferences = { 
      ...existing, 
      ...updates, 
      userId: existing.userId,
      updatedAt: new Date() 
    };
    this.userPreferences.set(existing.id, updated);
    return updated;
  }

  // Project Template methods
  async getProjectTemplate(id: string): Promise<ProjectTemplate | undefined> {
    return this.projectTemplates.get(id);
  }

  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return Array.from(this.projectTemplates.values())
      .filter(template => template.isPublic);
  }

  async getProjectTemplatesByCategory(category: string): Promise<ProjectTemplate[]> {
    return Array.from(this.projectTemplates.values())
      .filter(template => template.isPublic && template.category === category);
  }

  async createProjectTemplate(insertTemplate: InsertProjectTemplate): Promise<ProjectTemplate> {
    const id = randomUUID();
    const template: ProjectTemplate = {
      id,
      name: insertTemplate.name,
      description: insertTemplate.description,
      category: insertTemplate.category,
      techStack: insertTemplate.techStack,
      files: insertTemplate.files,
      dependencies: insertTemplate.dependencies || null,
      instructions: insertTemplate.instructions || null,
      difficulty: insertTemplate.difficulty || "beginner",
      estimatedTime: insertTemplate.estimatedTime || null,
      tags: insertTemplate.tags || null,
      isPublic: insertTemplate.isPublic !== undefined ? insertTemplate.isPublic : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projectTemplates.set(id, template);
    return template;
  }

  async updateProjectTemplate(id: string, updates: Partial<ProjectTemplate>): Promise<ProjectTemplate | undefined> {
    const existing = this.projectTemplates.get(id);
    if (!existing) return undefined;

    const updated: ProjectTemplate = { 
      ...existing, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.projectTemplates.set(id, updated);
    return updated;
  }

  async deleteProjectTemplate(id: string): Promise<boolean> {
    return this.projectTemplates.delete(id);
  }

  // Project Plan Version methods
  async getProjectPlanVersion(id: string): Promise<ProjectPlanVersion | undefined> {
    return this.projectPlanVersions.get(id);
  }

  async getProjectPlanVersionsByProjectId(projectId: string): Promise<ProjectPlanVersion[]> {
    return Array.from(this.projectPlanVersions.values())
      .filter(version => version.projectId === projectId)
      .sort((a, b) => b.version - a.version); // Sort by version descending
  }

  async getLatestProjectPlanVersion(projectId: string): Promise<ProjectPlanVersion | undefined> {
    const versions = await this.getProjectPlanVersionsByProjectId(projectId);
    return versions[0]; // First item is latest due to sorting
  }

  async createProjectPlanVersion(insertVersion: InsertProjectPlanVersion): Promise<ProjectPlanVersion> {
    const id = randomUUID();
    
    // Auto-increment version number if not provided
    let version = insertVersion.version;
    if (!version) {
      const existingVersions = await this.getProjectPlanVersionsByProjectId(insertVersion.projectId);
      version = existingVersions.length > 0 ? Math.max(...existingVersions.map(v => v.version)) + 1 : 1;
    }
    
    const planVersion: ProjectPlanVersion = {
      ...insertVersion,
      id,
      version,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.projectPlanVersions.set(id, planVersion);
    return planVersion;
  }

  async updateProjectPlanVersion(id: string, updates: Partial<ProjectPlanVersion>): Promise<ProjectPlanVersion | undefined> {
    const existing = this.projectPlanVersions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.projectPlanVersions.set(id, updated);
    return updated;
  }

  async deleteProjectPlanVersion(id: string): Promise<boolean> {
    return this.projectPlanVersions.delete(id);
  }

  async getProjectPlanVersionHistory(projectId: string): Promise<ProjectPlanVersion[]> {
    return this.getProjectPlanVersionsByProjectId(projectId); // Same as getProjectPlanVersionsByProjectId
  }
}

// PostgreSQL Storage Implementation
class PostgreSQLStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
    this.initializeDefaults();
  }

  private async initializeDefaults() {
    try {
      // Initialize default search engines if none exist
      const existingEngines = await this.db.select().from(searchEngines).limit(1);
      if (existingEngines.length === 0) {
        const defaultEngines = [
          { userId: null, name: "Google", enabled: true, apiKey: null },
          { userId: null, name: "Bing", enabled: true, apiKey: null },
          { userId: null, name: "DuckDuckGo", enabled: false, apiKey: null }
        ];

        for (const engine of defaultEngines) {
          await this.db.insert(searchEngines).values(engine);
        }
      }

      // Initialize default LLM configuration if none exist
      const existingLLMs = await this.db.select().from(llmConfigurations).limit(1);
      if (existingLLMs.length === 0) {
        await this.db.insert(llmConfigurations).values({
          userId: null,
          name: "Ollama Local",
          endpoint: "http://localhost:11434",
          model: "llama2-7b-chat",
          temperature: 70,
          maxTokens: 2048,
          isDefault: true
        });
      }
    } catch (error) {
      console.error("Failed to initialize defaults:", error);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  // Conversation methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await this.db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return await this.db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await this.db.insert(conversations).values(conversation).returning();
    return result[0];
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const result = await this.db.update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return result[0];
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await this.db.delete(conversations).where(eq(conversations.id, id)).returning({ id: conversations.id });
    return result.length > 0;
  }

  // Message methods
  async getMessage(id: string): Promise<Message | undefined> {
    const result = await this.db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0];
  }

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return await this.db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await this.db.insert(messages).values(message).returning();
    return result[0];
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await this.db.delete(messages).where(eq(messages.id, id)).returning({ id: messages.id });
    return result.length > 0;
  }

  // Project methods
  async getProject(id: string): Promise<Project | undefined> {
    const result = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return await this.db.select().from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await this.db.insert(projects).values(project).returning();
    return result[0];
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const result = await this.db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
    return result.length > 0;
  }

  // File methods
  async getFile(id: string): Promise<File | undefined> {
    const result = await this.db.select().from(files).where(eq(files.id, id)).limit(1);
    return result[0];
  }

  async getFilesByUserId(userId: string): Promise<File[]> {
    return await this.db.select().from(files)
      .where(eq(files.userId, userId))
      .orderBy(desc(files.createdAt));
  }

  async createFile(file: InsertFile): Promise<File> {
    const result = await this.db.insert(files).values(file).returning();
    return result[0];
  }

  async updateFile(id: string, updates: Partial<File>): Promise<File | undefined> {
    const result = await this.db.update(files)
      .set(updates)
      .where(eq(files.id, id))
      .returning();
    return result[0];
  }

  async deleteFile(id: string): Promise<boolean> {
    const result = await this.db.delete(files).where(eq(files.id, id)).returning({ id: files.id });
    return result.length > 0;
  }

  // LLM Configuration methods
  async getLLMConfiguration(id: string): Promise<LLMConfiguration | undefined> {
    const result = await this.db.select().from(llmConfigurations).where(eq(llmConfigurations.id, id)).limit(1);
    return result[0];
  }

  async getLLMConfigurationsByUserId(userId: string): Promise<LLMConfiguration[]> {
    return await this.db.select().from(llmConfigurations)
      .where(eq(llmConfigurations.userId, userId))
      .orderBy(desc(llmConfigurations.createdAt));
  }

  async getDefaultLLMConfiguration(userId: string): Promise<LLMConfiguration | undefined> {
    // First try to get user's default configuration
    const userDefault = await this.db.select().from(llmConfigurations)
      .where(and(eq(llmConfigurations.userId, userId), eq(llmConfigurations.isDefault, true)))
      .limit(1);
    
    if (userDefault.length > 0) {
      return userDefault[0];
    }

    // Fall back to global default (where userId is null)
    const globalDefault = await this.db.select().from(llmConfigurations)
      .where(eq(llmConfigurations.isDefault, true))
      .limit(1);
    
    return globalDefault[0];
  }

  async createLLMConfiguration(config: InsertLLMConfiguration): Promise<LLMConfiguration> {
    const result = await this.db.insert(llmConfigurations).values(config).returning();
    return result[0];
  }

  async updateLLMConfiguration(id: string, updates: Partial<LLMConfiguration>): Promise<LLMConfiguration | undefined> {
    const result = await this.db.update(llmConfigurations)
      .set(updates)
      .where(eq(llmConfigurations.id, id))
      .returning();
    return result[0];
  }

  async deleteLLMConfiguration(id: string): Promise<boolean> {
    const result = await this.db.delete(llmConfigurations).where(eq(llmConfigurations.id, id)).returning({ id: llmConfigurations.id });
    return result.length > 0;
  }

  // Search Engine methods
  async getSearchEngine(id: string): Promise<SearchEngine | undefined> {
    const result = await this.db.select().from(searchEngines).where(eq(searchEngines.id, id)).limit(1);
    return result[0];
  }

  async getSearchEnginesByUserId(userId: string): Promise<SearchEngine[]> {
    return await this.db.select().from(searchEngines)
      .where(eq(searchEngines.userId, userId))
      .orderBy(desc(searchEngines.createdAt));
  }

  async getEnabledSearchEngines(userId: string): Promise<SearchEngine[]> {
    return await this.db.select().from(searchEngines)
      .where(and(eq(searchEngines.userId, userId), eq(searchEngines.enabled, true)))
      .orderBy(desc(searchEngines.createdAt));
  }

  async createSearchEngine(engine: InsertSearchEngine): Promise<SearchEngine> {
    const result = await this.db.insert(searchEngines).values(engine).returning();
    return result[0];
  }

  async updateSearchEngine(id: string, updates: Partial<SearchEngine>): Promise<SearchEngine | undefined> {
    const result = await this.db.update(searchEngines)
      .set(updates)
      .where(eq(searchEngines.id, id))
      .returning();
    return result[0];
  }

  async deleteSearchEngine(id: string): Promise<boolean> {
    const result = await this.db.delete(searchEngines).where(eq(searchEngines.id, id)).returning({ id: searchEngines.id });
    return result.length > 0;
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const result = await this.db.select().from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    
    if (result.length === 0) {
      // Create default preferences
      const defaultPrefs = {
        userId,
        theme: "dark",
        compactMode: false,
        animations: true,
        fontSize: "medium",
        codeFont: "jetbrains",
        maxConcurrentRequests: 5,
        cacheDuration: 30,
        autoSaveConversations: true,
        analyticsCollection: false
      };
      
      return await this.createUserPreferences(defaultPrefs);
    }
    
    return result[0];
  }

  async createUserPreferences(insertPrefs: InsertUserPreferences): Promise<UserPreferences> {
    const result = await this.db.insert(userPreferences).values(insertPrefs).returning();
    return result[0];
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined> {
    const result = await this.db.update(userPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return result[0];
  }

  // Project Template methods
  async getProjectTemplate(id: string): Promise<ProjectTemplate | undefined> {
    const result = await this.db.select().from(projectTemplates).where(eq(projectTemplates.id, id)).limit(1);
    return result[0];
  }

  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return await this.db.select().from(projectTemplates)
      .where(eq(projectTemplates.isPublic, true))
      .orderBy(desc(projectTemplates.createdAt));
  }

  async getProjectTemplatesByCategory(category: string): Promise<ProjectTemplate[]> {
    return await this.db.select().from(projectTemplates)
      .where(and(eq(projectTemplates.category, category), eq(projectTemplates.isPublic, true)))
      .orderBy(desc(projectTemplates.createdAt));
  }

  async createProjectTemplate(template: InsertProjectTemplate): Promise<ProjectTemplate> {
    const result = await this.db.insert(projectTemplates).values(template).returning();
    return result[0];
  }

  async updateProjectTemplate(id: string, updates: Partial<ProjectTemplate>): Promise<ProjectTemplate | undefined> {
    const result = await this.db.update(projectTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteProjectTemplate(id: string): Promise<boolean> {
    const result = await this.db.delete(projectTemplates).where(eq(projectTemplates.id, id)).returning({ id: projectTemplates.id });
    return result.length > 0;
  }

  // Project Plan Version methods
  async getProjectPlanVersion(id: string): Promise<ProjectPlanVersion | undefined> {
    const result = await this.db.select().from(projectPlanVersions).where(eq(projectPlanVersions.id, id)).limit(1);
    return result[0];
  }

  async getProjectPlanVersionsByProjectId(projectId: string): Promise<ProjectPlanVersion[]> {
    return await this.db.select().from(projectPlanVersions)
      .where(eq(projectPlanVersions.projectId, projectId))
      .orderBy(desc(projectPlanVersions.version)); // Sort by version descending
  }

  async getLatestProjectPlanVersion(projectId: string): Promise<ProjectPlanVersion | undefined> {
    const result = await this.db.select().from(projectPlanVersions)
      .where(eq(projectPlanVersions.projectId, projectId))
      .orderBy(desc(projectPlanVersions.version))
      .limit(1);
    return result[0];
  }

  async createProjectPlanVersion(insertVersion: InsertProjectPlanVersion): Promise<ProjectPlanVersion> {
    // Auto-increment version number if not provided
    let version = insertVersion.version;
    if (!version) {
      const latestVersion = await this.getLatestProjectPlanVersion(insertVersion.projectId);
      version = latestVersion ? latestVersion.version + 1 : 1;
    }
    
    const versionWithNumber = { ...insertVersion, version };
    const result = await this.db.insert(projectPlanVersions).values(versionWithNumber).returning();
    return result[0];
  }

  async updateProjectPlanVersion(id: string, updates: Partial<ProjectPlanVersion>): Promise<ProjectPlanVersion | undefined> {
    const result = await this.db.update(projectPlanVersions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectPlanVersions.id, id))
      .returning();
    return result[0];
  }

  async deleteProjectPlanVersion(id: string): Promise<boolean> {
    const result = await this.db.delete(projectPlanVersions).where(eq(projectPlanVersions.id, id)).returning({ id: projectPlanVersions.id });
    return result.length > 0;
  }

  async getProjectPlanVersionHistory(projectId: string): Promise<ProjectPlanVersion[]> {
    return this.getProjectPlanVersionsByProjectId(projectId); // Same as getProjectPlanVersionsByProjectId
  }
}

// Use PostgreSQL storage in production, MemStorage for development/testing
export const storage = process.env.NODE_ENV === 'development' && !process.env.USE_DATABASE 
  ? new MemStorage() 
  : new PostgreSQLStorage();
