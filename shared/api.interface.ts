import { z } from "zod";

// ==================== Zod Schemas ====================

// ---------- Daily Entry ----------

export const createDailyEntrySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须为 YYYY-MM-DD")
    .min(1),
  content: z
    .string()
    .min(1, "今日记录不能为空")
    .max(10000, "内容最多 10000 字"),
  mood: z.number().int().min(1).max(5).optional().nullable(),
  energy: z.number().int().min(1).max(5).optional().nullable(),
});

export const updateDailyEntrySchema = z.object({
  content: z
    .string()
    .min(1, "今日记录不能为空")
    .max(10000, "内容最多 10000 字"),
});

// ---------- AI Review Generation ----------

export const reviewTypeSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

export const generateReviewSchema = z.object({
  type: reviewTypeSchema,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须为 YYYY-MM-DD")
    .min(1),
});

// ---------- Query Params ----------

export const dateRangeQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "开始日期格式必须为 YYYY-MM-DD"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "结束日期格式必须为 YYYY-MM-DD"),
});

export const dateQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须为 YYYY-MM-DD"),
});

export const periodQuerySchema = z.object({
  type: reviewTypeSchema,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须为 YYYY-MM-DD"),
});

// ==================== Inferred Request Types ====================

export type CreateDailyEntryRequest = z.infer<typeof createDailyEntrySchema>;
export type UpdateDailyEntryRequest = z.infer<typeof updateDailyEntrySchema>;
export type GenerateReviewRequest = z.infer<typeof generateReviewSchema>;
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type DateQuery = z.infer<typeof dateQuerySchema>;
export type PeriodQuery = z.infer<typeof periodQuerySchema>;
export type ReviewType = z.infer<typeof reviewTypeSchema>;

// ==================== Response Types ====================

export interface DailyEntryResponse {
  id: string;
  date: string;
  content: string;
  mood: number | null;
  energy: number | null;
  highlights: string[] | null;
  problems: string[] | null;
  suggestions: string[] | null;
  reviewGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewResultResponse {
  highlights: string[];
  problems: string[];
  suggestions: string[];
  summary?: string;
  nextAction?: string;       // 明日第一行动
  generatedAt: string;
  isDemo?: boolean;          // true = rule engine fallback, false = real LLM
  model?: string;            // model name used (e.g. "doubao-seed", "rule-engine")
}

export interface PeriodReviewResponse {
  id: string;
  type: ReviewType;
  periodStart: string;
  periodEnd: string;
  highlights: string[];
  problems: string[];
  suggestions: string[];
  summary: string;
  entryCount: number;
  generatedAt: string;
}

export interface RecentEntriesResponse {
  entries: DailyEntryResponse[];
  total: number;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

// ==================== Auth Schemas ====================

export const sendCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
});

export const verifyCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
  code: z.string().min(4, "验证码至少 4 位").max(6, "验证码最多 6 位"),
});

export type SendCodeRequest = z.infer<typeof sendCodeSchema>;
export type VerifyCodeRequest = z.infer<typeof verifyCodeSchema>;

// ==================== Auth Types ====================

export interface UserProfileResponse {
  userId: string;
  phone: string;
  name: string;
  avatar: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfileResponse;
}

// ==================== Import Types ====================

export interface CalendarEventResponse {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  location?: string;
  organizer?: string;
  source?: "ics" | "manual";
}

export interface ParseIcsResponse {
  events: CalendarEventResponse[];
}

export interface MessageSummaryResponse {
  id: string;
  sender: string;
  time: string;
  summary: string;
  chatName?: string;
}

export interface CalendarEventsResponse {
  events: CalendarEventResponse[];
  date: string;
}

export interface MessageSummariesResponse {
  messages: MessageSummaryResponse[];
  date: string;
}
