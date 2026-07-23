import { Router } from "express";
import { db } from "../db";
import { dailyEntries, periodReviews, aiReviews } from "../db/schema";
import { eq, gte, lte, and, desc } from "drizzle-orm";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  parseISO,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  createDailyEntrySchema,
  updateDailyEntrySchema,
  dateQuerySchema,
  dateRangeQuerySchema,
  periodQuerySchema,
} from "@shared/api.interface";
import type {
  DailyEntryResponse,
  ReviewResultResponse,
  PeriodReviewResponse,
  ApiError,
} from "@shared/api.interface";
import type { ReviewType } from "@shared/api.interface";
import { callLLM, callRuleEngine } from "./ai";
import type { AIReviewOutput } from "./ai";

const router = Router();

// ================================================================
// Helpers
// ================================================================

function formatEntry(row: any): DailyEntryResponse {
  return {
    id: row.id,
    date: row.date instanceof Date ? format(row.date, "yyyy-MM-dd") : String(row.date),
    content: row.content,
    mood: row.mood ?? null,
    energy: row.energy ?? null,
    highlights: row.highlights as string[] | null,
    problems: row.problems as string[] | null,
    suggestions: row.suggestions as string[] | null,
    reviewGeneratedAt: row.reviewGeneratedAt
      ? new Date(row.reviewGeneratedAt).toISOString()
      : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function toDate(dateStr: string): Date {
  return parseISO(dateStr);
}

function getWeekDays(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

function isChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text) && text.replace(/[^\u4e00-\u9fff]/g, "").length / text.length > 0.1;
}

// ================================================================
// AI Review Generation Engine
// ================================================================

interface TopicMatch {
  topic: string;
  matched: string[];
}

function detectTopics(content: string): TopicMatch[] {
  const topics: TopicMatch[] = [];
  const keywords: Record<string, string[]> = {
    "开发编码": ["代码", "编程", "开发", "bug", "debug", "修复", "功能", "接口", "API", "部署", "上线", "测试", "code", "deploy", "fix", "feature", "PR", "merge", "review"],
    "会议沟通": ["会议", "沟通", "讨论", "汇报", "对齐", "评审", "开会", "电话", "客户", "协作", "meeting", "sync"],
    "学习成长": ["学习", "阅读", "看书", "课程", "培训", "研究", "探索", "调研", "learn", "read", "study"],
    "计划管理": ["计划", "规划", "目标", "排期", "需求", "里程碑", "deadline", "plan", "sprint"],
    "文档输出": ["文档", "报告", "方案", "设计", "写作", "总结", "文档化", "doc", "write"],
    "团队管理": ["面试", "招聘", "带人", "管理", "辅导", "培训", "团建", "1on1", "绩效"],
  };

  const lowerContent = content.toLowerCase();
  for (const [topic, words] of Object.entries(keywords)) {
    const matched = words.filter((w) => lowerContent.includes(w.toLowerCase()));
    if (matched.length > 0) topics.push({ topic, matched });
  }
  return topics;
}

function countSentences(content: string): string[] {
  return content
    .split(/[。！？\n.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function extractKeyPhrases(sentences: string[]): string[] {
  const phrases: string[] = [];
  const patterns = [
    /完成了[「""]?([^「""，。,.\s]{2,15})[」""]?/,
    /做了[「""]?([^「""，。,.\s]{2,15})[」""]?/,
    /解决了[「""]?([^「""，。,.\s]{2,15})[」""]?/,
    /推进了?[「""]?([^「""，。,.\s]{2,15})[」""]?/,
    /优化了?[「""]?([^「""，。,.\s]{2,15})[」""]?/,
    /搭建了?[「""]?([^「""，。,.\s]{2,15})[」""]?/,
    /写(完|好)了?[「""]?([^「""，。,.\s]{2,15})[」""]?/,
  ];
  for (const s of sentences) {
    for (const p of patterns) {
      const m = s.match(p);
      if (m) phrases.push(m[1] || m[2]);
    }
  }
  return phrases.slice(0, 5);
}

function generateDailyAIReview(content: string, date: string): Omit<ReviewResultResponse, "generatedAt"> {
  const zh = isChinese(content);
  const sentences = countSentences(content);
  const topics = detectTopics(content);
  const keyPhrases = extractKeyPhrases(sentences);
  const hasLearning = topics.some((t) => t.topic === "学习成长");
  const hasMeeting = topics.some((t) => t.topic === "会议沟通");
  const hasCode = topics.some((t) => t.topic === "开发编码");
  const hasPlan = topics.some((t) => t.topic === "计划管理");
  const hasDoc = topics.some((t) => t.topic === "文档输出");
  const hasTeam = topics.some((t) => t.topic === "团队管理");
  const contentLen = content.length;
  const sentenceCount = sentences.length;
  const topicCount = topics.length;

  // ---------- Highlights ----------
  const highlights: string[] = [];

  if (keyPhrases.length > 0) {
    highlights.push(`今天完成了${keyPhrases.slice(0, 3).join("、")}等关键任务，产出明确`);
  }

  if (topicCount >= 3) {
    highlights.push(
      `工作覆盖面广，涉及${topics
        .slice(0, 3)
        .map((t) => t.topic)
        .join("、")}等多个领域，展现了多任务处理能力`
    );
  } else if (topicCount === 1) {
    highlights.push(`今天深度聚焦于${topics[0].topic}，体现了良好的专注力和深入投入`);
  }

  if (sentenceCount >= 6) {
    highlights.push("记录内容详实、条理清晰，说明对当天工作有系统性的回顾和思考");
  }

  if (hasLearning) {
    highlights.push("在繁忙工作中仍安排了学习时间，保持持续成长的好习惯");
  }

  if (hasDoc) {
    highlights.push("注重文档沉淀和知识管理，有利于团队知识传承");
  }

  if (highlights.length === 0) {
    highlights.push("今天有意识地对工作进行了记录和回顾，这本身就是很好的习惯");
    if (contentLen > 50) {
      highlights.push("记录内容有一定深度，体现了对工作过程的认真思考");
    }
  }

  // ---------- Problems ----------
  const problems: string[] = [];

  if (contentLen < 30) {
    problems.push("今天的记录内容偏少，可能没有充分回顾。建议从「做了什么」「遇到了什么」「明天打算做什么」三个角度展开");
  }

  if (!hasPlan && sentenceCount > 2) {
    problems.push("记录中缺少对计划和优先级的描述，可能导致工作方向不够聚焦");
  }

  if (hasCode && !hasLearning) {
    problems.push("以执行性工作为主，缺少学习或技术探索的时间，长期来看可能影响技术成长");
  }

  if (hasMeeting && sentenceCount > 4) {
    problems.push("会议和沟通占据了较多时间，需要留意是否有足够深度工作时间来完成核心任务");
  }

  if (topicCount >= 4) {
    problems.push("任务切换频繁，可能影响深度工作的质量和效率");
  }

  if (sentenceCount > 2 && !content.includes("问题") && !content.includes("困难") && !content.includes("challenge")) {
    problems.push("记录中未提及遇到的挑战或困难，适当记录问题有助于后续复盘和改进");
  }

  // ---------- Suggestions ----------
  const suggestions: string[] = [];

  if (hasCode && !hasLearning) {
    suggestions.push("建议每天安排 30 分钟学习新技术或阅读技术文章，保持技术敏感度");
  }

  if (topicCount >= 4) {
    suggestions.push("尝试使用时间块方法，将类似任务集中处理，减少上下文切换的认知成本");
  }

  if (!hasPlan) {
    suggestions.push("每天开始时用 5 分钟列出「今日三件事」，结束时对照完成度，形成计划-执行-复盘的闭环");
  }

  if (hasMeeting) {
    suggestions.push("尝试为每次会议设定明确目标和预期时长，并在会后记录关键结论和 action items");
  }

  if (keyPhrases.length >= 2) {
    suggestions.push("建议将今天的关键产出和经验沉淀到文档中，方便团队共享和日后回顾");
  }

  if (sentenceCount < 4 && contentLen > 20) {
    suggestions.push("下次复盘可以尝试记录：每项任务的完成情况、遇到的具体障碍、以及应对策略");
  }

  suggestions.push("保持每日复盘的习惯，持续的记录和反思是职业成长最有效的路径");

  if (problems.length === 0) {
    suggestions.push("今天的记录比较完整，继续保持这种深度反思的习惯");
  }

  // ---------- Summary ----------
  const topicSummary = topics.length > 0 ? topics.map((t) => t.topic).join("、") : "日常工作";
  let summary: string;

  if (zh) {
    summary = `今天的工作主要聚焦于${topicSummary}，`;
    summary += `共记录了 ${sentenceCount} 条工作内容。`;
    if (highlights.length >= 3) summary += "整体表现不错，多个方面有明确产出。";
    else if (highlights.length >= 1) summary += "在部分领域有值得肯定的表现。";
    summary += "以下是基于今天记录的智能复盘分析。";
  } else {
    summary = `Today's work focused on ${topicSummary}. ${sentenceCount} items recorded. Here is your AI-powered review.`;
  }

  return { highlights, problems, suggestions, summary };
}

function generateWeeklyAIReview(
  entries: Array<{ date: string; content: string }>,
  weekStart: string,
  weekEnd: string
): Omit<PeriodReviewResponse, "id" | "generatedAt"> {
  const allContent = entries.map((e) => e.content).join("\n");
  const topics = detectTopics(allContent);
  const totalLen = allContent.length;
  const avgLen = entries.length > 0 ? Math.round(totalLen / entries.length) : 0;

  let summary = `本周（${weekStart} 至 ${weekEnd}）共有 ${entries.length} 天进行了工作记录`;
  if (entries.length >= 5) summary += "，工作节奏保持良好";
  else if (entries.length >= 3) summary += "，有一定的记录习惯";
  else summary += "，记录频率还有提升空间";
  summary += "。";

  if (topics.length > 0) {
    summary += `本周主要工作方向：${topics.slice(0, 3).map((t) => t.topic).join("、")}。`;
  }
  if (avgLen > 100) summary += "每日记录详实，说明对工作有深入的思考和复盘。";
  else if (avgLen > 30) summary += "记录内容有一定深度，保持了这个好习惯。";
  summary += "以下是本周的智能复盘。";

  const highlights: string[] = [];
  highlights.push(`本周坚持记录了 ${entries.length} 天的工作内容，保持了持续复盘的好习惯`);
  if (topics.length >= 2) {
    highlights.push(`工作方向多元，涵盖${topics.slice(0, 3).map((t) => t.topic).join("、")}等领域`);
  }
  if (avgLen > 80) highlights.push("每日记录内容丰富，体现了对工作的深度思考");
  if (entries.length >= 5) highlights.push("工作日保持了稳定的记录节奏，自律性值得肯定");

  const problems: string[] = [];
  if (entries.length < 5) problems.push(`本周仅记录了 ${entries.length} 天，建议工作日都养成记录习惯，便于回顾和总结`);
  if (avgLen < 40) problems.push("部分日期的记录内容偏简略，建议增加对关键决策和遇到的问题进行详细描述");
  if (topics.length <= 1 && entries.length >= 3) problems.push("本周工作内容较为单一，可以考虑是否有探索新方向的机会");

  const suggestions: string[] = [];
  suggestions.push("下周一花 10 分钟制定周计划，明确本周最重要的 3 个目标和里程碑");
  suggestions.push("建议将本周遇到的问题和解决方案整理成知识库，积累可复用的经验");
  if (entries.length < 5) suggestions.push("设定每日固定复盘时间（如每天下班前 15 分钟），逐步养成稳定习惯");
  suggestions.push("回顾本周时间分配，评估是否与个人和团队的优先级一致");

  const outlook = `新的一周即将开始。基于本周的复盘，建议在${topics.length > 0 ? topics[0].topic : "核心工作"}方向继续深耕，同时关注${problems.length > 0 ? "记录频率和内容深度" : "保持节奏和持续改进"}。复盘不仅是回顾过去，更是为未来指明方向。`;

  return {
    type: "weekly",
    periodStart: weekStart,
    periodEnd: weekEnd,
    highlights,
    problems,
    suggestions,
    summary,
    entryCount: entries.length,
  };
}

function generateMonthlyAIReview(
  entries: Array<{ date: string; content: string }>,
  monthStart: string,
  monthEnd: string,
  monthLabel: string
): Omit<PeriodReviewResponse, "id" | "generatedAt"> {
  const allContent = entries.map((e) => e.content).join("\n");
  const topics = detectTopics(allContent);
  const totalLen = allContent.length;
  const avgLen = entries.length > 0 ? Math.round(totalLen / entries.length) : 0;
  const totalSentences = countSentences(allContent).length;

  let summary = `${monthLabel}共有 ${entries.length} 天进行了工作记录`;
  const workDaysInMonth = Math.min(entries.length, 22);
  if (workDaysInMonth >= 15) summary += "，记录频率很高，复盘习惯优秀";
  else if (workDaysInMonth >= 10) summary += "，保持了不错的记录节奏";
  else summary += "，记录频率还有提升空间";
  summary += "。";

  if (topics.length > 0) {
    summary += `本月主要工作方向：${topics.slice(0, 4).map((t) => t.topic).join("、")}。`;
  }
  if (totalSentences > 50) summary += "本月工作产出丰富，整体表现值得深入分析。";
  summary += "以下是月度智能复盘分析。";

  const highlights: string[] = [];
  highlights.push(`本月坚持记录了 ${entries.length} 天，累计 ${totalLen} 字的工作内容，展现了优秀的自律性`);
  if (topics.length >= 2) {
    highlights.push(`工作覆盖面广，涉及${topics.slice(0, 4).map((t) => t.topic).join("、")}等多个领域`);
  }
  if (avgLen > 80) highlights.push("每日记录内容详实，体现了持续深度思考的工作习惯");
  if (entries.length >= 15) highlights.push("记录频率高，形成了稳定的复盘习惯，这是持续进步的基础");

  const problems: string[] = [];
  if (entries.length < 10) problems.push(`本月仅记录了 ${entries.length} 天，复盘频率偏低。稳定的记录习惯是持续改进的前提`);
  if (avgLen < 40) problems.push("部分日期的记录偏简略，建议增加对关键任务进展和核心挑战的描述");
  if (topics.length <= 2 && entries.length >= 5) problems.push("本月工作方向相对集中，可思考是否有拓展能力边界的机会");

  const suggestions: string[] = [];
  suggestions.push("月初制定月度 OKR 或核心目标，月末对照评估完成度和方向偏差");
  suggestions.push("整理本月最有价值的 3 个经验教训，形成个人知识库");
  if (entries.length < 15) suggestions.push("设定每日复盘提醒，将记录频率提升到每月 15 天以上");
  suggestions.push("回顾本月的时间分配比例，评估是否与长期目标一致");

  const outlook = `${monthLabel}即将过去。本月在${topics.length > 0 ? topics[0].topic : "日常工作"}方面投入较多${topics.length > 1 ? `，同时在${topics[1].topic}方面也有探索` : ""}。下个月建议重点关注${problems.length > 0 ? "提升记录频率和内容深度" : "持续保持节奏和寻找新的成长突破点"}，同时回顾本月目标完成情况，为新月制定清晰的行动计划。`;

  return {
    type: "monthly",
    periodStart: monthStart,
    periodEnd: monthEnd,
    highlights,
    problems,
    suggestions,
    summary,
    entryCount: entries.length,
  };
}

function generateYearlyAIReview(
  entries: Array<{ date: string; content: string }>,
  yearStart: string,
  yearEnd: string,
  yearLabel: string
): Omit<PeriodReviewResponse, "id" | "generatedAt"> {
  const allContent = entries.map((e) => e.content).join("\n");
  const topics = detectTopics(allContent);
  const totalLen = allContent.length;

  const monthMap: Record<string, number> = {};
  for (const entry of entries) {
    const month = entry.date.substring(0, 7);
    monthMap[month] = (monthMap[month] || 0) + 1;
  }
  const activeMonths = Object.keys(monthMap).length;
  const mostActiveMonth = Object.entries(monthMap).sort((a, b) => b[1] - a[1])[0];

  let summary = `${yearLabel}共有 ${entries.length} 天进行了工作记录`;
  if (entries.length >= 100) summary += "，全年记录非常充实";
  else if (entries.length >= 50) summary += "，保持了不错的复盘节奏";
  else summary += "，仍有提升空间";
  summary += `，覆盖了 ${activeMonths} 个月份。`;
  if (mostActiveMonth) summary += `其中 ${mostActiveMonth[0]} 是记录最活跃的月份（${mostActiveMonth[1]} 天）。`;
  if (topics.length > 0) summary += `全年主要工作方向：${topics.slice(0, 4).map((t) => t.topic).join("、")}。`;
  summary += "以下是年度智能复盘分析。";

  const highlights: string[] = [];
  highlights.push(`全年累计记录 ${entries.length} 天、${totalLen} 字，这是一份宝贵的个人成长档案`);
  if (activeMonths >= 6) highlights.push(`覆盖了 ${activeMonths} 个月的记录，展现了长期坚持的毅力`);
  if (topics.length >= 3) highlights.push(`工作领域多元，涵盖${topics.slice(0, 4).map((t) => t.topic).join("、")}等方向，综合能力在持续提升`);
  if (entries.length >= 100) highlights.push("超过 100 天的持续记录，这种自律性在人群中非常突出");

  const problems: string[] = [];
  if (entries.length < 50) problems.push(`全年仅记录了 ${entries.length} 天，复盘频率有较大提升空间`);
  if (activeMonths < 6) problems.push(`仅有 ${activeMonths} 个月有记录，部分月份存在记录断档`);
  if (topics.length <= 2) problems.push("全年工作方向较为单一，可以思考是否有拓展新领域的机会");

  const suggestions: string[] = [];
  suggestions.push("制定新年 OKR，从「专业深度」「能力广度」「影响力」三个维度设定目标");
  suggestions.push("回顾全年记录，提炼 5-10 个最重要的经验教训，形成年度成长总结");
  suggestions.push("将今年的复盘数据作为基线，为明年设定更高的记录频率和质量目标");
  if (entries.length < 100) suggestions.push("争取明年记录天数突破 150 天，建立更完整的复盘体系");

  const outlook = `新的一年即将到来。回顾${yearLabel}，${entries.length >= 50 ? "你在坚持复盘方面已经建立了良好基础" : "复盘习惯还有很大的成长空间"}。${topics.length > 0 ? `在${topics[0].topic}领域已有深入积累` : ""}，新年建议在巩固优势的同时，${topics.length > 1 ? `继续拓展${topics[1].topic}等方向` : "探索新的能力领域"}。记住，持续的记录和反思是个人成长最可靠的加速器。`;

  return {
    type: "yearly",
    periodStart: yearStart,
    periodEnd: yearEnd,
    highlights,
    problems,
    suggestions,
    summary,
    entryCount: entries.length,
  };
}

// ================================================================
// Routes — Daily Entries
// ================================================================

/** GET /api/reviews/recent — 获取最近 N 天的记录 */
router.get("/recent", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const rows = await db
      .select()
      .from(dailyEntries)
      .orderBy(desc(dailyEntries.date))
      .limit(limit)
      .execute();

    res.json({
      success: true,
      data: { entries: rows.map(formatEntry), total: rows.length },
    });
  } catch (err: any) {
    res.status(500).json({ error: "获取最近记录失败" } satisfies ApiError);
  }
});

/** GET /api/reviews/entries — 按日期范围查询 */
router.get("/entries", async (req, res) => {
  try {
    const parsed = dateRangeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "参数校验失败", details: parsed.error.flatten().fieldErrors as Record<string, string[]> } satisfies ApiError);
      return;
    }
    const { startDate, endDate } = parsed.data;
    const rows = await db
      .select()
      .from(dailyEntries)
      .where(and(gte(dailyEntries.date, startDate), lte(dailyEntries.date, endDate)))
      .orderBy(desc(dailyEntries.date))
      .execute();

    res.json({ success: true, data: rows.map(formatEntry) });
  } catch (err: any) {
    res.status(500).json({ error: "查询记录失败" } satisfies ApiError);
  }
});

/** GET /api/reviews/entry — 获取单天记录 */
router.get("/entry", async (req, res) => {
  try {
    const parsed = dateQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "参数校验失败", details: parsed.error.flatten().fieldErrors as Record<string, string[]> } satisfies ApiError);
      return;
    }
    const rows = await db
      .select()
      .from(dailyEntries)
      .where(eq(dailyEntries.date, parsed.data.date))
      .execute();

    if (rows.length === 0) {
      res.json({ success: true, data: null });
      return;
    }
    res.json({ success: true, data: formatEntry(rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: "查询记录失败" } satisfies ApiError);
  }
});

/** POST /api/reviews/entry — 创建或更新每日记录 */
router.post("/entry", async (req, res) => {
  try {
    const parsed = createDailyEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "参数校验失败", details: parsed.error.flatten().fieldErrors as Record<string, string[]> } satisfies ApiError);
      return;
    }
    const { date: entryDate, content, mood, energy } = parsed.data;

    // Check if entry already exists for this date
    const existing = await db
      .select()
      .from(dailyEntries)
      .where(eq(dailyEntries.date, entryDate))
      .execute();

    let row: any;
    if (existing.length > 0) {
      // Update existing entry
      const [updated] = await db
        .update(dailyEntries)
        .set({ content, mood: mood ?? null, energy: energy ?? null, updatedAt: new Date() })
        .where(eq(dailyEntries.id, existing[0].id))
        .returning();
      row = updated;
    } else {
      // Create new entry
      const [created] = await db
        .insert(dailyEntries)
        .values({ date: entryDate, content, mood: mood ?? null, energy: energy ?? null, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      row = created;
    }

    res.json({ success: true, data: formatEntry(row) });
  } catch (err: any) {
    console.error("[POST /api/reviews/entry] error:", err?.message || err, err?.stack);
    res.status(500).json({ error: `保存记录失败: ${err?.message || "未知错误"}` } satisfies ApiError);
  }
});

// ================================================================
// Routes — Delete
// ================================================================

/** DELETE /api/reviews/entry — 删除每日记录（V5） */
router.delete("/entry", async (req, res) => {
  try {
    const parsed = dateQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "参数校验失败", details: parsed.error.flatten().fieldErrors as Record<string, string[]> } satisfies ApiError);
      return;
    }

    const { date } = parsed.data;

    // Find the entry first
    const rows = await db
      .select()
      .from(dailyEntries)
      .where(eq(dailyEntries.date, date))
      .execute();

    if (rows.length === 0) {
      res.status(404).json({ error: "该日期无记录" } satisfies ApiError);
      return;
    }

    const entryId = rows[0].id;

    // Delete associated AI review metadata
    await db.delete(aiReviews).where(eq(aiReviews.dailyEntryId, entryId)).execute();

    // Delete the entry itself
    await db.delete(dailyEntries).where(eq(dailyEntries.id, entryId)).execute();

    console.log(`[reviews/delete] Entry deleted: date=${date}, id=${entryId}`);
    res.json({ success: true, message: "已删除" });
  } catch (err: any) {
    res.status(500).json({ error: "删除记录失败" } satisfies ApiError);
  }
});

/** DELETE /api/reviews/ai-review — 仅删除 AI 复盘结果，保留原文（V5） */
router.delete("/ai-review", async (req, res) => {
  try {
    const parsed = dateQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "参数校验失败", details: parsed.error.flatten().fieldErrors as Record<string, string[]> } satisfies ApiError);
      return;
    }

    const { date } = parsed.data;

    // Find the entry
    const rows = await db
      .select()
      .from(dailyEntries)
      .where(eq(dailyEntries.date, date))
      .execute();

    if (rows.length === 0) {
      res.status(404).json({ error: "该日期无记录" } satisfies ApiError);
      return;
    }

    const entryId = rows[0].id;

    // Clear AI review fields from the entry
    await db
      .update(dailyEntries)
      .set({
        highlights: null,
        problems: null,
        suggestions: null,
        reviewGeneratedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(dailyEntries.id, entryId))
      .execute();

    // Delete AI review metadata
    await db.delete(aiReviews).where(eq(aiReviews.dailyEntryId, entryId)).execute();

    console.log(`[reviews/delete-ai] AI review deleted for date=${date}, entryId=${entryId}`);
    res.json({ success: true, message: "AI 复盘已删除" });
  } catch (err: any) {
    res.status(500).json({ error: "删除 AI 复盘失败" } satisfies ApiError);
  }
});

// ================================================================
// Routes — AI Review Generation
// ================================================================

/** POST /api/reviews/generate — 生成每日 AI 复盘（V3: 接受导入素材 + 降级规则引擎） */
router.post("/generate", async (req, res) => {
  try {
    const parsed = dateQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "参数校验失败", details: parsed.error.flatten().fieldErrors as Record<string, string[]> } satisfies ApiError);
      return;
    }

    const importedMaterials = (req.body as any).importedMaterials as string | undefined;
    const mood = (req.body as any).mood as number | undefined;
    const energy = (req.body as any).energy as number | undefined;

    const rows = await db
      .select()
      .from(dailyEntries)
      .where(eq(dailyEntries.date, parsed.data.date))
      .execute();

    if (rows.length === 0) {
      res.status(404).json({ error: "该日期暂无记录，请先填写今日工作内容" } satisfies ApiError);
      return;
    }

    const entry = rows[0];

    // Build context with mood/energy
    let contextContent = entry.content;
    if (mood || energy) {
      const moodLabels = ["", "很差", "不太好", "一般", "还不错", "非常好"];
      const energyLabels = ["", "很低", "偏低", "一般", "较高", "充沛"];
      const contextLines: string[] = [];
      if (mood) contextLines.push(`心情：${moodLabels[mood]}（${mood}/5）`);
      if (energy) contextLines.push(`能量：${energyLabels[energy]}（${energy}/5）`);
      contextContent = `[今日状态]\n${contextLines.join("\n")}\n\n[今日记录]\n${entry.content}`;
    }

    // V4: Try real LLM first, fall back to rule engine
    let aiOutput: AIReviewOutput;
    let isDemo = false;
    try {
      aiOutput = await callLLM(contextContent, importedMaterials, parsed.data.date);
      console.log(`[reviews/generate] Real LLM used: model=${aiOutput.model}`);
    } catch (llmError: any) {
      console.warn(`[reviews/generate] LLM unavailable: ${llmError?.message || "unknown"}. Using rule engine (demo mode).`);
      aiOutput = callRuleEngine(contextContent, importedMaterials, parsed.data.date);
      isDemo = true;
    }
    const review = aiOutput.result;
    const now = new Date();

    await db
      .update(dailyEntries)
      .set({
        highlights: review.highlights,
        problems: review.problems,
        suggestions: review.suggestions,
        reviewGeneratedAt: now,
        updatedAt: now,
      })
      .where(eq(dailyEntries.id, entry.id))
      .returning();

    res.json({
      success: true,
      data: { ...review, generatedAt: now.toISOString(), isDemo, model: aiOutput.model } satisfies ReviewResultResponse,
    });
  } catch (err: any) {
    res.status(500).json({ error: "AI 复盘生成失败" } satisfies ApiError);
  }
});

/** POST /api/reviews/generate-period — 生成周期 AI 复盘（周/月/年） */
router.post("/generate-period", async (req, res) => {
  try {
    const parsed = periodQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "参数校验失败", details: parsed.error.flatten().fieldErrors as Record<string, string[]> } satisfies ApiError);
      return;
    }

    const { type, date: refDate } = parsed.data;
    const ref = toDate(refDate);

    let periodStart: Date;
    let periodEnd: Date;
    let periodLabel: string;

    switch (type) {
      case "weekly": {
        const range = getWeekDays(ref);
        periodStart = range.start;
        periodEnd = range.end;
        const weekNum = format(ref, "w", { locale: zhCN });
        periodLabel = `${format(ref, "yyyy")}年第${weekNum}周`;
        break;
      }
      case "monthly": {
        periodStart = startOfMonth(ref);
        periodEnd = endOfMonth(ref);
        periodLabel = `${format(ref, "yyyy")}年${format(ref, "M")}月`;
        break;
      }
      case "yearly": {
        periodStart = startOfYear(ref);
        periodEnd = endOfYear(ref);
        periodLabel = `${format(ref, "yyyy")}年`;
        break;
      }
      default:
        res.status(400).json({ error: "无效的复盘类型" } satisfies ApiError);
        return;
    }

    const startStr = formatDate(periodStart);
    const endStr = formatDate(periodEnd);

    // Fetch all daily entries in the period
    const entries = await db
      .select()
      .from(dailyEntries)
      .where(and(gte(dailyEntries.date, startStr), lte(dailyEntries.date, endStr)))
      .orderBy(dailyEntries.date)
      .execute();

    if (entries.length === 0) {
      res.status(404).json({
        error: `该${type === "weekly" ? "周" : type === "monthly" ? "月" : "年"}暂无记录，请先填写每日工作内容`,
      } satisfies ApiError);
      return;
    }

    const entryData = entries.map((e) => ({
      date: String(e.date),
      content: e.content,
    }));

    // Generate period review
    let review: Omit<PeriodReviewResponse, "id" | "generatedAt">;
    switch (type) {
      case "weekly":
        review = generateWeeklyAIReview(entryData, startStr, endStr);
        break;
      case "monthly":
        review = generateMonthlyAIReview(entryData, startStr, endStr, periodLabel);
        break;
      case "yearly":
        review = generateYearlyAIReview(entryData, startStr, endStr, periodLabel);
        break;
      default:
        res.status(400).json({ error: "无效的复盘类型" } satisfies ApiError);
        return;
    }

    const now = new Date();

    // Upsert into period_reviews table
    const existingPeriod = await db
      .select()
      .from(periodReviews)
      .where(
        and(
          eq(periodReviews.periodType, type),
          eq(periodReviews.periodStart, startStr)
        )
      )
      .execute();

    let periodRow: any;
    if (existingPeriod.length > 0) {
      const [updated] = await db
        .update(periodReviews)
        .set({
          periodLabel,
          periodEnd: endStr,
          entryCount: entries.length,
          summary: review.summary,
          highlights: review.highlights,
          problems: review.problems,
          suggestions: review.suggestions,
          outlook: (review as any).outlook || null,
          generatedAt: now,
        })
        .where(eq(periodReviews.id, existingPeriod[0].id))
        .returning();
      periodRow = updated;
    } else {
      const [created] = await db
        .insert(periodReviews)
        .values({
          periodType: type,
          periodLabel,
          periodStart: startStr,
          periodEnd: endStr,
          entryCount: entries.length,
          summary: review.summary,
          highlights: review.highlights,
          problems: review.problems,
          suggestions: review.suggestions,
          outlook: (review as any).outlook || null,
          generatedAt: now,
          createdAt: now,
        })
        .returning();
      periodRow = created;
    }

    res.json({
      success: true,
      data: {
        id: periodRow.id,
        type: review.type,
        periodStart: review.periodStart,
        periodEnd: review.periodEnd,
        highlights: review.highlights,
        problems: review.problems,
        suggestions: review.suggestions,
        summary: review.summary,
        entryCount: review.entryCount,
        generatedAt: now.toISOString(),
      } satisfies PeriodReviewResponse,
    });
  } catch (err: any) {
    res.status(500).json({ error: "周期复盘生成失败" } satisfies ApiError);
  }
});

/** GET /api/reviews/period — 查询已有的周期复盘 */
router.get("/period", async (req, res) => {
  try {
    const parsed = periodQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "参数校验失败", details: parsed.error.flatten().fieldErrors as Record<string, string[]> } satisfies ApiError);
      return;
    }

    const { type, date: refDate } = parsed.data;
    const ref = toDate(refDate);

    let periodStartStr: string;

    switch (type) {
      case "weekly": {
        const range = getWeekDays(ref);
        periodStartStr = formatDate(range.start);
        break;
      }
      case "monthly":
        periodStartStr = formatDate(startOfMonth(ref));
        break;
      case "yearly":
        periodStartStr = formatDate(startOfYear(ref));
        break;
      default:
        res.status(400).json({ error: "无效的复盘类型" } satisfies ApiError);
        return;
    }

    const rows = await db
      .select()
      .from(periodReviews)
      .where(
        and(
          eq(periodReviews.periodType, type),
          eq(periodReviews.periodStart, periodStartStr)
        )
      )
      .execute();

    if (rows.length === 0) {
      res.json({ success: true, data: null });
      return;
    }

    const row = rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        type: row.periodType as ReviewType,
        periodStart: String(row.periodStart),
        periodEnd: String(row.periodEnd),
        highlights: row.highlights as string[],
        problems: row.problems as string[],
        suggestions: row.suggestions as string[],
        summary: row.summary,
        entryCount: row.entryCount,
        generatedAt: new Date(row.generatedAt).toISOString(),
      } satisfies PeriodReviewResponse,
    });
  } catch (err: any) {
    res.status(500).json({ error: "查询周期复盘失败" } satisfies ApiError);
  }
});

export default router;
