import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // for storing additional data like file attachments, search results, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  githubUrl: text("github_url"),
  status: text("status").default("active"), // 'active' | 'archived' | 'completed'
  metadata: jsonb("metadata"), // for storing project architecture, tech stack, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  analysis: jsonb("analysis"), // for storing file analysis results
  createdAt: timestamp("created_at").defaultNow(),
});

export const llmConfigurations = pgTable("llm_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  endpoint: text("endpoint").notNull(),
  model: text("model").notNull(),
  temperature: integer("temperature").default(70), // 0-100 range
  maxTokens: integer("max_tokens").default(2048),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const searchEngines = pgTable("search_engines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  enabled: boolean("enabled").default(true),
  apiKey: text("api_key"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  theme: text("theme").default("dark"), // "light" | "dark" | "system"
  compactMode: boolean("compact_mode").default(false),
  animations: boolean("animations").default(true),
  fontSize: text("font_size").default("medium"), // "small" | "medium" | "large"
  codeFont: text("code_font").default("jetbrains"), // "jetbrains" | "fira" | "source" | "consolas"
  maxConcurrentRequests: integer("max_concurrent_requests").default(5),
  cacheDuration: integer("cache_duration").default(30), // minutes
  autoSaveConversations: boolean("auto_save_conversations").default(true),
  analyticsCollection: boolean("analytics_collection").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectTemplates = pgTable("project_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "web", "api", "mobile", "desktop", "ml", "blockchain"
  techStack: jsonb("tech_stack").notNull(), // { frontend: [], backend: [], database: [], tools: [] }
  files: jsonb("files").notNull(), // Array of file objects with path, content, and type
  dependencies: jsonb("dependencies"), // Package.json style dependencies
  instructions: text("instructions"), // Setup and usage instructions
  difficulty: text("difficulty").default("beginner"), // "beginner" | "intermediate" | "advanced"
  estimatedTime: text("estimated_time"), // "1-2 hours", "1 day", etc.
  tags: jsonb("tags"), // Array of string tags for filtering
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectPlanVersions = pgTable("project_plan_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id),
  userId: varchar("user_id").references(() => users.id),
  version: integer("version").notNull(), // Version number (1, 2, 3, etc.)
  title: text("title").notNull(), // Plan title/name
  description: text("description"), // Plan description
  goals: jsonb("goals"), // Array of project goals
  requirements: jsonb("requirements"), // Array of requirements
  architecture: jsonb("architecture"), // Architecture decisions and design
  techStack: jsonb("tech_stack"), // Technology stack choices
  timeline: jsonb("timeline"), // Milestones and timeline
  resources: jsonb("resources"), // Required resources
  risks: jsonb("risks"), // Identified risks and mitigation strategies
  notes: text("notes"), // Additional notes
  changeLog: text("change_log"), // What changed in this version
  status: text("status").default("draft"), // "draft" | "active" | "archived"
  parentVersionId: varchar("parent_version_id"), // Reference to previous version (self-reference)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  role: true,
  content: true,
  metadata: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  userId: true,
  name: true,
  description: true,
  githubUrl: true,
  status: true,
  metadata: true,
});

export const insertFileSchema = createInsertSchema(files).pick({
  userId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  path: true,
  analysis: true,
});

export const insertLLMConfigurationSchema = createInsertSchema(llmConfigurations).pick({
  userId: true,
  name: true,
  endpoint: true,
  model: true,
  temperature: true,
  maxTokens: true,
  isDefault: true,
});

export const insertSearchEngineSchema = createInsertSchema(searchEngines).pick({
  userId: true,
  name: true,
  enabled: true,
  apiKey: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type InsertLLMConfiguration = z.infer<typeof insertLLMConfigurationSchema>;
export type LLMConfiguration = typeof llmConfigurations.$inferSelect;

export type InsertSearchEngine = z.infer<typeof insertSearchEngineSchema>;
export type SearchEngine = typeof searchEngines.$inferSelect;

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
  userId: true,
  theme: true,
  compactMode: true,
  animations: true,
  fontSize: true,
  codeFont: true,
  maxConcurrentRequests: true,
  cacheDuration: true,
  autoSaveConversations: true,
  analyticsCollection: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

export const insertProjectTemplateSchema = createInsertSchema(projectTemplates).pick({
  name: true,
  description: true,
  category: true,
  techStack: true,
  files: true,
  dependencies: true,
  instructions: true,
  difficulty: true,
  estimatedTime: true,
  tags: true,
  isPublic: true,
});

export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type ProjectTemplate = typeof projectTemplates.$inferSelect;

export const insertProjectPlanVersionSchema = createInsertSchema(projectPlanVersions).pick({
  projectId: true,
  userId: true,
  version: true,
  title: true,
  description: true,
  goals: true,
  requirements: true,
  architecture: true,
  techStack: true,
  timeline: true,
  resources: true,
  risks: true,
  notes: true,
  changeLog: true,
  status: true,
  parentVersionId: true,
});

export type InsertProjectPlanVersion = z.infer<typeof insertProjectPlanVersionSchema>;
export type ProjectPlanVersion = typeof projectPlanVersions.$inferSelect;
