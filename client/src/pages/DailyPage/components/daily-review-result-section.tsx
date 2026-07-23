import { motion, AnimatePresence } from "framer-motion";
import { ReviewCard } from "@/pages/shared/review-card";
import { BrainIcon, SparklesIcon, ClockIcon } from "lucide-react";

interface IDailyReviewResultSection {
  review: {
    highlights: string[];
    problems: string[];
    suggestions: string[];
    summary?: string;
  } | null;
  isGenerating: boolean;
  generatedAt: string | null;
  hasEntry: boolean;
}

export function DailyReviewResultSection({
  review,
  isGenerating,
  generatedAt,
  hasEntry,
}: IDailyReviewResultSection) {
  return (
    <section className="w-full space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BrainIcon className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-foreground font-bold text-lg tracking-tight leading-none">
            AI 复盘
          </h2>
        </div>

        {generatedAt && !isGenerating && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ClockIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-medium leading-none">
              {formatGeneratedTime(generatedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Loading state — skeleton pulse */}
      {isGenerating && (
        <div className="bg-card rounded-[20px] border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-8 space-y-6">
          {/* Summary skeleton */}
          <div className="space-y-3 pb-6 border-b border-border">
            <SkeletonLine width="100%" />
            <SkeletonLine width="85%" />
            <SkeletonLine width="60%" />
          </div>

          {/* Highlights skeleton */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
              <div className="w-12 h-4 bg-muted rounded animate-pulse" />
            </div>
            <div className="pl-10 space-y-2">
              <SkeletonLine width="90%" />
              <SkeletonLine width="75%" />
            </div>
          </div>

          {/* Problems skeleton */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
              <div className="w-12 h-4 bg-muted rounded animate-pulse" />
            </div>
            <div className="pl-10 space-y-2">
              <SkeletonLine width="80%" />
              <SkeletonLine width="65%" />
            </div>
          </div>

          {/* Suggestions skeleton */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
              <div className="w-16 h-4 bg-muted rounded animate-pulse" />
            </div>
            <div className="pl-10 space-y-2">
              <SkeletonLine width="95%" />
              <SkeletonLine width="70%" />
            </div>
          </div>
        </div>
      )}

      {/* Empty state — no review yet */}
      {!isGenerating && !review && hasEntry && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card rounded-[20px] border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-10"
        >
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
              <SparklesIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-[15px]">
              填写今日工作内容后，点击「AI 复盘」按钮生成智能分析
            </p>
          </div>
        </motion.div>
      )}

      {/* Empty state — no entry */}
      {!isGenerating && !review && !hasEntry && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card rounded-[20px] border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-10"
        >
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
              <BrainIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-[15px]">
              该日期暂无记录，请先写下今天的工作内容
            </p>
          </div>
        </motion.div>
      )}

      {/* Review result */}
      <AnimatePresence mode="wait">
        {!isGenerating && review && (
          <motion.div
            key={generatedAt ?? "review"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <ReviewCard
              summary={review.summary}
              highlights={review.highlights}
              problems={review.problems}
              suggestions={review.suggestions}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ---- Skeleton helper ---- */

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className="h-3.5 bg-muted rounded animate-pulse"
      style={{ width }}
    />
  );
}

/* ---- Time formatting ---- */

function formatGeneratedTime(isoStr: string): string {
  try {
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "刚刚生成";
    if (diffMin < 60) return `${diffMin} 分钟前`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} 小时前`;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${month}月${day}日 ${hours}:${minutes}`;
  } catch {
    return "";
  }
}
