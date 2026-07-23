import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { aiReviews } from "../db/schema";
import type { ReviewResultResponse, ApiError } from "@shared/api.interface";

const router = Router();

// ==================== Schemas ====================

const generateAiReviewSchema = z.object({
  content: z.string().min(1, "复盘内容不能为空"),
  importedMaterials: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ==================== Types ====================

interface LLMReviewResult {
  highlights: string[];
  problems: string[];
  suggestions: string[];
  summary: string;
  nextAction: string;
}

interface AIReviewOutput {
  result: ReviewResultResponse;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

// ==================== Route ====================

/**
 * POST /api/ai/review
 * Generate AI review — tries real LLM first, falls back to rule engine
 */
router.post("/review", async (req, res) => {
  try {
    const parsed = generateAiReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "参数校验失败",
        details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      } satisfies ApiError);
      return;
    }

    const { content, importedMaterials, date } = parsed.data;
    let output: AIReviewOutput;
    let isDemo = false;

    // Try real LLM first
    try {
      output = await callLLM(content, importedMaterials, date);
      console.log(`[AI] Real LLM used: model=${output.model}, prompt_tokens=${output.promptTokens}, completion_tokens=${output.completionTokens}`);
    } catch (llmError: any) {
      // LLM not available — fallback to rule engine with explicit warning
      console.warn(`[AI] LLM unavailable: ${llmError?.message || "unknown error"}. Falling back to rule engine (demo mode).`);
      output = callRuleEngine(content, importedMaterials, date);
      isDemo = true;
    }

    res.json({
      success: true,
      data: {
        ...output.result,
        isDemo,
        model: output.model,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "AI 复盘生成失败" } satisfies ApiError);
  }
});

/**
 * POST /api/ai/review/save-meta
 * Save AI review metadata for analytics
 */
router.post("/review/save-meta", async (req, res) => {
  try {
    const { dailyEntryId, model, promptTokens, completionTokens } = req.body;

    await db.insert(aiReviews).values({
      dailyEntryId: dailyEntryId || null,
      model: model || "rule-engine",
      promptTokens: promptTokens || 0,
      completionTokens: completionTokens || 0,
    });

    res.json({ success: true, data: { saved: true } });
  } catch {
    // Non-critical — don't block the main flow
    res.json({ success: true, data: { saved: false } });
  }
});

// ==================== LLM Integration ====================

async function callLLM(
  content: string,
  importedMaterials?: string,
  date?: string
): Promise<AIReviewOutput> {
  const fullInput = buildPrompt(content, importedMaterials, date);

  // Check if LLM API is available via environment
  const llmEndpoint = process.env.LLM_API_ENDPOINT || process.env.AI_API_URL;
  const llmApiKey = process.env.LLM_API_KEY || process.env.AI_API_KEY;

  if (!llmEndpoint && !llmApiKey) {
    throw new Error("LLM not configured — set VOLCANO_ENGINE_API_KEY or LLM_API_KEY env var");
  }

  // Default to Volcano Engine (豆包/Doubao) endpoint, OpenAI-compatible API
  const endpoint = llmEndpoint || "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

  const requestBody = {
    model: process.env.LLM_MODEL || "doubao-1-5-pro-32k-250115",
    messages: [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT,
      },
      {
        role: "user" as const,
        content: fullInput,
      },
    ],
    temperature: 0.7,
    max_tokens: 1200,
    response_format: { type: "json_object" as const },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(llmApiKey ? { Authorization: `Bearer ${llmApiKey}` } : {}),
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const rawContent = data.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error("LLM returned empty response");
  }

  const parsed = JSON.parse(rawContent) as LLMReviewResult;

  // Validate structure
  if (!Array.isArray(parsed.highlights) || !Array.isArray(parsed.problems) || !Array.isArray(parsed.suggestions)) {
    throw new Error("LLM response missing required fields");
  }

  const result: ReviewResultResponse = {
    highlights: parsed.highlights.slice(0, 2),
    problems: parsed.problems.slice(0, 2),
    suggestions: parsed.suggestions.slice(0, 3),
    summary: parsed.summary || "",
    nextAction: parsed.nextAction || "",
    generatedAt: new Date().toISOString(),
  };

  const promptTokens = data.usage?.prompt_tokens || 0;
  const completionTokens = data.usage?.completion_tokens || 0;

  return {
    result,
    model: requestBody.model,
    promptTokens,
    completionTokens,
  };
}

const SYSTEM_PROMPT = `你是一位专业的个人复盘教练，采用 KISS 框架（Keep/Improve/Stop/Start）帮助用户从每日工作中提炼成长。

## 你的分析原则
1. **Keep（保持）**：用户做得好的、应该继续的行为和习惯。要具体，带场景和效果。
2. **Stop（停止）**：消耗精力或阻碍产出的行为。要客观、建设性，指出影响。
3. **Improve + Start（改进+开始）**：可操作的改进行动。每条建议必须满足：
   - 动词开头，具体可执行
   - 带量化锚点（次数/时长/截止日）
   - 明确触发场景（何时何地）
   - 含成功判据（如何知道做到了）

## 输出格式（严格 JSON）
{
  "highlights": ["Keep1", "Keep2"],
  "problems": ["Stop1", "Stop2"],
  "suggestions": ["Improve/Start1", "Improve/Start2"],
  "summary": "一句话洞察（≤30字，概括今日工作状态和核心发现）",
  "nextAction": "明日第一行动（1个具体动作，动词开头，可在明天早上一开工就执行）"
}

## 约束
- highlights 和 problems 各最多 2 条，suggestions 最多 3 条
- 禁止空话、泛泛而谈，每条必须有具体内容
- 禁止美化或夸大，基于用户输入客观分析
- 禁止推测用户未提供的信息
- 语言风格：口语化、有温度、像一个关心你的导师，但不浮夸
- nextAction 必须足够小、足够具体，让用户明天可以立即执行`;

function buildPrompt(content: string, importedMaterials?: string, date?: string): string {
  const parts: string[] = [];

  if (date) {
    parts.push(`日期：${date}`);
  }

  parts.push(`\n## 今日工作记录\n${content}`);

  if (importedMaterials && importedMaterials.trim()) {
    parts.push(`\n## 导入的素材（日程/消息等）\n${importedMaterials}`);
  }

  parts.push("\n请基于以上内容生成复盘分析。");

  return parts.join("\n");
}

// ==================== Rule Engine (Fallback) ====================

function callRuleEngine(
  content: string,
  importedMaterials?: string,
  date?: string
): AIReviewOutput {
  const combinedText = importedMaterials ? `${content}\n${importedMaterials}` : content;
  const sentences = splitSentences(combinedText);
  const topics = detectTopics(combinedText);
  const keyPhrases = extractKeyPhrases(sentences);
  const sentiment = analyzeSentiment(combinedText);
  const challenges = extractChallenges(combinedText, sentences);
  const achievements = extractAchievements(combinedText, sentences);

  const hasLearning = topics.some((t) => t.topic === "学习成长");
  const hasMeeting = topics.some((t) => t.topic === "会议沟通");
  const hasCode = topics.some((t) => t.topic === "开发编码");
  const hasPlan = topics.some((t) => t.topic === "计划管理");
  const hasDoc = topics.some((t) => t.topic === "文档输出");
  const hasDesign = topics.some((t) => t.topic === "产品设计");
  const hasData = topics.some((t) => t.topic === "数据分析");

  const contentLen = combinedText.length;
  const sentenceCount = sentences.length;
  const topicCount = topics.length;

  // ---------- Highlights (context-aware) ----------
  const highlights: string[] = [];

  // Use actual achievements from content
  if (achievements.length > 0) {
    const top = achievements.slice(0, 2);
    highlights.push(`今天推进了「${top[0]}」${top.length > 1 ? `和「${top[1]}」` : ""}，有实质性进展`);
  } else if (keyPhrases.length > 0) {
    highlights.push(`围绕「${keyPhrases[0]}」展开工作${keyPhrases.length > 1 ? `，同时推进了「${keyPhrases[1]}」` : ""}，方向清晰`);
  }

  // Reference specific topics with context
  if (topicCount >= 3) {
    const topTopics = topics.slice(0, 3).map((t) => t.topic);
    highlights.push(`今天在${topTopics[0]}和${topTopics[1]}之间高效切换，多线并行但保持了节奏`);
  } else if (topicCount === 1) {
    highlights.push(`深度投入${topics[0].topic}，这种专注度在当前阶段很有价值`);
  } else if (topicCount === 2) {
    highlights.push(`${topics[0].topic}与${topics[1].topic}的结合体现了系统性思维`);
  }

  // Sentiment-based highlight
  if (sentiment.positiveCount >= 3) {
    highlights.push("整体状态积极，保持了良好的工作节奏和心态");
  }

  if (sentenceCount >= 6) {
    highlights.push("复盘记录详实具体，这种颗粒度的回顾对持续改进非常有效");
  }

  if (hasLearning) {
    const learningKw = topics.find((t) => t.topic === "学习成长")?.keywords || [];
    highlights.push(`在忙碌中仍投入了${learningKw[0] || "学习"}，这种投资会在中长期产生复利`);
  }

  if (highlights.length === 0) {
    highlights.push("有意识地对工作进行了结构化回顾，这个习惯本身就是亮点");
    if (contentLen > 50) {
      highlights.push("记录中体现了对工作过程的深入思考，而不只是流水账");
    }
  }

  // ---------- Problems (context-aware) ----------
  const problems: string[] = [];

  if (contentLen < 30) {
    problems.push("记录内容偏简略——试试用「做了什么 → 卡在哪 → 下一步」的三段式展开，会更有复盘价值");
  }

  // Reference actual challenges mentioned
  if (challenges.length > 0) {
    problems.push(`提到了「${challenges[0]}」，这是一个值得深入拆解的卡点`);
  }

  if (!hasPlan && sentenceCount > 2) {
    problems.push("记录中缺少对优先级和计划的描述——没有计划容易陷入「忙碌但无方向」的状态");
  }

  if (hasCode && !hasLearning) {
    problems.push("今天以执行性工作为主，纯产出日容易陷入技术债务累积而不自知");
  }

  if (hasMeeting && sentenceCount > 4) {
    problems.push("会议沟通占比较高——需要警惕「用会议替代深度思考」的倾向，留出整块专注时间");
  }

  if (topicCount >= 4) {
    problems.push("涉及 4+ 个不同领域，频繁切换会损耗认知资源——考虑用主题日或时间块来减少切换成本");
  }

  if (sentiment.negativeCount >= 3 && challenges.length === 0) {
    problems.push("记录中透露出一些压力和负面情绪，但没有具体展开——把卡点写清楚是解决问题的第一步");
  }

  if (
    sentenceCount > 2 &&
    challenges.length === 0 &&
    sentiment.negativeCount === 0
  ) {
    problems.push("未提及任何挑战或困难——适当记录「什么不顺利」比只记「做了什么」更有改进价值");
  }

  // ---------- Suggestions (specific & actionable) ----------
  const suggestions: string[] = [];

  if (hasCode && !hasLearning) {
    const topic = keyPhrases[0] || "当前技术栈";
    suggestions.push(`明天开工后花 25 分钟搜索一篇与「${topic}」相关的技术文章，记录 1 个明天就能用的点`);
  }

  if (topicCount >= 4) {
    suggestions.push("明天试试「主题日」策略：把相似任务合并到上午/下午两个时间块，目标连续专注 90 分钟");
  }

  if (!hasPlan) {
    suggestions.push("明早花 5 分钟写下「今天必须完成的 1 件事 + 可以做的 2 件事」，用 1-2-3 排优先级");
  }

  if (hasMeeting) {
    suggestions.push("下次会议前用 3 分钟写下「我希望这次会议产出什么」，会后立刻记录下一步行动和负责人");
  }

  if (challenges.length > 0) {
    suggestions.push(`针对「${challenges[0]}」，明天用 15 分钟把它拆成 3 个可执行的小步骤，先做最小的那个`);
  }

  if (sentenceCount < 4 && contentLen > 20) {
    suggestions.push("明天记录时试试这个结构：① 今天最有价值的事 ② 最大的卡点 ③ 明天的一个行动项");
  }

  if (hasDesign && !hasData) {
    suggestions.push("产品设计方面，明天花 10 分钟看一组用户数据或反馈，用数据验证一个设计假设");
  }

  if (suggestions.length === 0) {
    suggestions.push("保持当前的节奏和状态，明天试试增加一个「今天最满意的一个决策是什么」");
  }

  // ---------- Summary (context-aware insight) ----------
  const summary = generateContextSummary(
    combinedText, contentLen, topicCount, sentiment,
    achievements, challenges, topics, hasMeeting, hasCode, hasLearning
  );

  // ---------- Next Action ----------
  const nextAction = generateContextNextAction(
    hasCode, hasLearning, hasPlan, hasMeeting, hasDoc, hasDesign,
    topicCount, keyPhrases, challenges
  );

  const result: ReviewResultResponse = {
    highlights: highlights.slice(0, 3),
    problems: problems.slice(0, 2),
    suggestions: suggestions.slice(0, 3),
    summary,
    nextAction,
    generatedAt: new Date().toISOString(),
  };

  return {
    result,
    model: "smart-analysis",
    promptTokens: 0,
    completionTokens: 0,
  };
}

// ---- Sentiment Analysis ----
function analyzeSentiment(text: string): { positiveCount: number; negativeCount: number; score: number } {
  const positiveWords = [
    "完成", "成功", "搞定", "顺利", "解决", "优化", "提升", "进步", "收获", "满意",
    "开心", "兴奋", "突破", "有效", "高效", "清晰", "聚焦", "充实", "不错", "好",
    "完成", "交付", "上线", "通过", "认可", "赞赏", "学习", "成长", "掌握",
  ];
  const negativeWords = [
    "卡住", "拖延", "没做", "失败", "bug", "问题", "困难", "焦虑", "压力", "加班",
    "来不及", "推迟", "阻塞", "混乱", "低效", "迷茫", "疲惫", "烦躁", "没完成",
    "延期", "返工", "重做", "纠结", "浪费", "被动", "打断", "插队",
  ];

  let positiveCount = 0;
  let negativeCount = 0;
  const lowerText = text.toLowerCase();

  for (const w of positiveWords) {
    if (lowerText.includes(w)) positiveCount++;
  }
  for (const w of negativeWords) {
    if (lowerText.includes(w)) negativeCount++;
  }

  return {
    positiveCount,
    negativeCount,
    score: positiveCount - negativeCount,
  };
}

// ---- Challenge Extraction ----
function extractChallenges(text: string, sentences: string[]): string[] {
  const challengeKeywords = [
    "卡住", "困难", "问题", "挑战", "bug", "阻塞", "delay", "延期",
    "没做完", "推迟", "纠结", "混乱", "低效", "拖延", "返工", "重做",
    "没搞懂", "不确定", "瓶颈", "压力", "加班", "来不及",
  ];

  const challenges: string[] = [];
  for (const sentence of sentences) {
    for (const kw of challengeKeywords) {
      if (sentence.toLowerCase().includes(kw)) {
        // Extract a meaningful phrase
        const idx = sentence.toLowerCase().indexOf(kw);
        const start = Math.max(0, idx - 8);
        const end = Math.min(sentence.length, idx + kw.length + 15);
        const phrase = sentence.slice(start, end).replace(/^[，。、\s]+/, "");
        if (phrase.length > 4 && phrase.length < 35) {
          challenges.push(phrase);
        }
        break;
      }
    }
  }
  return [...new Set(challenges)].slice(0, 3);
}

// ---- Achievement Extraction ----
function extractAchievements(text: string, sentences: string[]): string[] {
  const achievementKeywords = [
    "完成", "实现", "搞定", "解决", "交付", "上线", "发布", "优化",
    "重构", "搭建", "设计", "修复", "推进", "落地", "产出", "通过",
  ];

  const achievements: string[] = [];
  for (const sentence of sentences) {
    for (const kw of achievementKeywords) {
      if (sentence.includes(kw)) {
        const idx = sentence.indexOf(kw);
        const start = Math.max(0, idx - 4);
        const end = Math.min(sentence.length, idx + kw.length + 12);
        const phrase = sentence.slice(start, end).replace(/^[，。、\s]+/, "");
        if (phrase.length > 3 && phrase.length < 30) {
          achievements.push(phrase);
        }
        break;
      }
    }
  }
  return [...new Set(achievements)].slice(0, 4);
}

// ---- Context-aware Summary ----
function generateContextSummary(
  text: string, contentLen: number, topicCount: number,
  sentiment: { positiveCount: number; negativeCount: number; score: number },
  achievements: string[], challenges: string[],
  topics: { topic: string; keywords: string[] }[],
  hasMeeting: boolean, hasCode: boolean, hasLearning: boolean
): string {
  if (contentLen < 20) {
    return "记录偏简，明天试试多写两行——哪怕一句话描述今天最大的收获也好";
  }

  // Reference actual content
  if (achievements.length > 0 && sentiment.score > 0) {
    return `围绕「${achievements[0]}」取得进展，整体状态积极，继续保持`;
  }
  if (challenges.length > 0 && sentiment.score < 0) {
    return `今天遇到了一些卡点（${challenges[0]}），正视问题是解决的第一步`;
  }
  if (topicCount >= 4) {
    return `多线并行的一天——${topics.slice(0, 2).map(t => t.topic).join("与")}交替推进，注意聚焦`;
  }
  if (hasMeeting && hasCode) {
    return "协作文与深度工作兼顾，节奏把控得不错";
  }
  if (hasCode && hasLearning) {
    return "产出与成长并重的一天，这种投资型工作方式值得保持";
  }
  if (hasCode) {
    return `扎实的执行日，${achievements[0] ? `「${achievements[0]}」有实质推进` : "代码产出有进展"}`;
  }
  if (hasMeeting) {
    return "以沟通协作为主，推动了跨团队的信息对齐";
  }
  if (hasLearning) {
    return "持续学习的一天，知识积累会在中长期产生复利";
  }
  if (sentiment.score > 2) {
    return "今天整体状态很好，保持了积极的节奏和心态";
  }
  if (sentiment.score < -1) {
    return "今天压力比较大，明天试着先做一件小事找回掌控感";
  }
  return "有记录就有积累，保持这个复盘习惯比什么都重要";
}

// ---- Context-aware Next Action ----
function generateContextNextAction(
  hasCode: boolean, hasLearning: boolean, hasPlan: boolean,
  hasMeeting: boolean, hasDoc: boolean, hasDesign: boolean,
  topicCount: number, keyPhrases: string[], challenges: string[]
): string {
  if (challenges.length > 0) {
    return `明早先花 10 分钟把「${challenges[0]}」拆成 3 个小步骤，从最小的开始做`;
  }
  if (!hasPlan) {
    return "明早开工后花 5 分钟写下今天的 1 个必做 + 2 个可选任务";
  }
  if (hasCode && !hasLearning) {
    return `明早花 20 分钟搜一篇与「${keyPhrases[0] || "当前项目"}」相关的文章，记录 1 个可用要点`;
  }
  if (hasMeeting && topicCount < 3) {
    return "明天第一个会议前用 3 分钟写下 3 个预期目标，会后 5 分钟记录结论";
  }
  if (topicCount >= 4) {
    return "明早把今天的任务按类型分组，明天相似任务放同一时间块处理";
  }
  if (hasDesign) {
    return "明天花 15 分钟看一组用户数据或反馈，验证一个设计假设";
  }
  if (!hasDoc && hasCode) {
    return "明天抽 15 分钟把今天的关键产出整理成一段文档，哪怕 3 行也好";
  }
  return "明早先回顾今天的复盘，然后从最重要的 1 件事开始新的一天";
}


// ==================== Exports (for reuse in reviews.ts) ====================

export { callLLM, callRuleEngine, splitSentences, detectTopics, extractKeyPhrases };
export type { AIReviewOutput };

// ==================== NLP Helpers ====================

function splitSentences(text: string): string[] {
  return text
    .split(/[。！？\n.;!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function detectTopics(text: string): { topic: string; keywords: string[] }[] {
  const topicMap: Record<string, string[]> = {
    会议沟通: ["会议", "讨论", "沟通", "对齐", "评审", "周会", "站会", "1v1", "meeting", "同步", "拉通"],
    开发编码: ["代码", "编码", "开发", "调试", "bug", "fix", "PR", "上线", "部署", "code", "debug", "重构", "优化"],
    学习成长: ["学习", "阅读", "课程", "教程", "文章", "研究", "探索", "新技术", "learn", "read", "study"],
    计划管理: ["计划", "排期", "优先级", "OKR", "目标", "deadline", "里程碑", "todo", "规划", "安排"],
    文档输出: ["文档", "设计", "方案", "记录", "wiki", "沉淀", "总结", "报告", "doc", "write"],
    团队管理: ["团队", "招聘", "面试", "绩效", "培养", "mentor", "带人", "管理", "1on1"],
    产品设计: ["需求", "产品", "用户", "体验", "交互", "原型", "PRD", "功能", "设计"],
    数据分析: ["数据", "分析", "报表", "指标", "监控", "dashboard", "SQL", "统计", "洞察"],
  };

  const found: { topic: string; keywords: string[] }[] = [];
  const lowerText = text.toLowerCase();

  for (const [topic, keywords] of Object.entries(topicMap)) {
    const matched = keywords.filter((kw) => lowerText.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      found.push({ topic, keywords: matched });
    }
  }

  return found.sort((a, b) => b.keywords.length - a.keywords.length);
}

function extractKeyPhrases(sentences: string[]): string[] {
  const actionKeywords = [
    "完成", "实现", "修复", "优化", "设计", "搭建", "重构",
    "交付", "上线", "发布", "编写", "开发", "解决", "处理",
    "推进", "整理", "输出", "产出", "落地", "启动",
  ];

  const phrases: string[] = [];
  for (const sentence of sentences) {
    for (const kw of actionKeywords) {
      if (sentence.includes(kw)) {
        // Extract a short phrase around the keyword
        const idx = sentence.indexOf(kw);
        const start = Math.max(0, idx - 6);
        const end = Math.min(sentence.length, idx + kw.length + 10);
        const phrase = sentence.slice(start, end).replace(/^[，。、\s]+/, "");
        if (phrase.length > 3 && phrase.length < 30) {
          phrases.push(phrase);
        }
        break;
      }
    }
  }

  // Deduplicate and limit
  return [...new Set(phrases)].slice(0, 5);
}

export default router;
