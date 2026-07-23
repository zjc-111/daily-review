// 每日复盘应用 - 共享类型定义

/** 每日记录条目 */
export interface DailyEntry {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  mood: number | null;       // 心情评分 1-5
  energy: number | null;     // 能量评分 1-5
  createdAt: string;
  updatedAt: string;
}

/** AI 复盘结果（KISS 框架） */
export interface ReviewResult {
  highlights: string[];  // Keep — 保持
  problems: string[];    // Stop — 停止
  suggestions: string[]; // Improve + Start — 改进 + 开始
  nextAction?: string;   // 明日第一行动
}

/** 每日复盘（条目 + AI 复盘） */
export interface DailyReview {
  id: string;
  date: string;
  content: string;
  review: ReviewResult | null;
  createdAt: string;
  updatedAt: string;
}

/** 周期复盘（周/月/年） */
export type PeriodType = 'weekly' | 'monthly' | 'yearly';

export interface PeriodReview {
  id: string;
  periodType: PeriodType;
  periodLabel: string;      // 如 "2026年第30周"、"2026年7月"、"2026年"
  periodStart: string;      // YYYY-MM-DD
  periodEnd: string;        // YYYY-MM-DD
  entryCount: number;       // 聚合的条目数量
  summary: string;          // AI 生成的总结
  review: ReviewResult | null;
  outlook: string | null;   // 展望（下周/下月/新年）
  createdAt: string;
}

/** 用户信息 */
export interface UserProfile {
  userId: string;
  phone: string;
  name: string;
  avatar: string;
}

/** 日历事件（ICS 解析或手动添加） */
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;       // ISO 时间
  endTime: string;         // ISO 时间
  attendees: string[];     // 参会人名称
  location?: string;       // 地点
  organizer?: string;      // 组织者
  source?: "ics" | "manual"; // 来源
}

/** AI 复盘元数据 */
export interface AIReviewMeta {
  id: string;
  dailyEntryId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  createdAt: string;
}

/** 待整理项（用户勾选前的暂存） */
export interface ImportItem {
  id: string;
  type: "calendar" | "message";
  title: string;
  detail: string;
  time?: string;
  selected: boolean;
}

/** API 响应包装 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
