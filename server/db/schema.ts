// SQLite schema for local development
// Converted from PostgreSQL (server/db/schema-pg.ts.bak) for self-hosted use

import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ================================================================
// Helper: random UUID
// ================================================================
const uuid = () => crypto.randomUUID();

// ================================================================
// Users
// ================================================================
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => uuid()),
    phone: text("phone").notNull().unique(),
    smsCode: text("sms_code"),
    smsTokenExpireAt: integer("sms_token_expire_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    usersPhoneKey: uniqueIndex("users_phone_key").on(table.phone),
    idxUsersPhone: index("idx_users_phone").on(table.phone),
  })
);

// ================================================================
// Daily Entries
// ================================================================
export const dailyEntries = sqliteTable(
  "daily_entries",
  {
    id: text("id").primaryKey().$defaultFn(() => uuid()),
    date: text("date").notNull().unique(), // ISO yyyy-MM-dd
    content: text("content").notNull(),
    highlights: text("highlights", { mode: "json" }).$type<string[]>().default([]),
    problems: text("problems", { mode: "json" }).$type<string[]>().default([]),
    suggestions: text("suggestions", { mode: "json" }).$type<string[]>().default([]),
    patterns: text("patterns", { mode: "json" }).$type<string[]>().default([]),
    reviewGeneratedAt: integer("review_generated_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    mood: integer("mood"),
    energy: integer("energy"),
  },
  (table) => ({
    dailyEntriesDateKey: uniqueIndex("daily_entries_date_key").on(table.date),
    idxDailyEntriesDate: index("idx_daily_entries_date").on(table.date),
  })
);

// ================================================================
// AI Reviews
// ================================================================
export const aiReviews = sqliteTable(
  "ai_reviews",
  {
    id: text("id").primaryKey().$defaultFn(() => uuid()),
    dailyEntryId: text("daily_entry_id"),
    model: text("model").notNull().default("rule-engine"),
    promptTokens: integer("prompt_tokens").default(0),
    completionTokens: integer("completion_tokens").default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    idxAiReviewsEntry: index("idx_ai_reviews_entry").on(table.dailyEntryId),
  })
);

// ================================================================
// Period Reviews (weekly / monthly / yearly)
// ================================================================
export const periodReviews = sqliteTable(
  "period_reviews",
  {
    id: text("id").primaryKey().$defaultFn(() => uuid()),
    periodType: text("period_type").notNull(),
    periodLabel: text("period_label").notNull(),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    entryCount: integer("entry_count").notNull().default(0),
    summary: text("summary").notNull(),
    highlights: text("highlights", { mode: "json" }).$type<string[]>().default([]),
    problems: text("problems", { mode: "json" }).$type<string[]>().default([]),
    suggestions: text("suggestions", { mode: "json" }).$type<string[]>().default([]),
    outlook: text("outlook"),
    generatedAt: integer("generated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    idxPeriodReviewsTypeDates: index("idx_period_reviews_type_dates").on(
      table.periodType,
      table.periodStart
    ),
    idxPeriodReviewsUnique: uniqueIndex("idx_period_reviews_unique").on(
      table.periodType,
      table.periodStart
    ),
  })
);

// ================================================================
// Sessions (for auth token management)
// ================================================================
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey().$defaultFn(() => uuid()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    sessionsTokenKey: uniqueIndex("sessions_token_key").on(table.token),
    idxSessionsUser: index("idx_sessions_user").on(table.userId),
  })
);

// Table aliases (for backward compat with old PG schema)
export const aiReviewsTable = aiReviews;
export const dailyEntriesTable = dailyEntries;
export const periodReviewsTable = periodReviews;
export const usersTable = users;
export const sessionsTable = sessions;
