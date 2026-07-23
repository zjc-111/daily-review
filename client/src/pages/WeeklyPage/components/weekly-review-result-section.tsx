import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  SparklesIcon,
  RefreshCwIcon,
  Loader2Icon,
  AlertTriangleIcon,
  FileTextIcon,
  CalendarDaysIcon,
} from "lucide-react";
import { generatePeriodReview, getPeriodReview } from "@/api";
import { ReviewCard } from "@/pages/shared/review-card";
import type { PeriodReviewResponse } from "@shared/api.interface";

function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil((diff / oneWeek + start.getDay() + 1) / 7);
}

function formatDisplayDate(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function WeeklyReviewResultSection() {
  const [review, setReview] = useState<PeriodReviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const { start: weekStart, end: weekEnd } = getWeekRange(today);
  const weekNum = getWeekNumber(today);
  const dateStr = toDateString(today);

  const fetchExisting = useCallback(async () => {
    try {
      const existing = await getPeriodReview("weekly", dateStr);
      setReview(existing);
    } catch {
      // No existing review is fine
    } finally {
      setInitialLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generatePeriodReview("weekly", dateStr);
      setReview(result);
    } catch (err: any) {
      const message =
        err?.response?.data?.error || "周复盘生成失败，请确保本周有填写每日记录";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <section className="w-full">
        <div className="bg-card rounded-[20px] border border-border shadow-sm p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-foreground font-bold text-lg tracking-tight">
              AI 周复盘
            </h2>
            <p className="text-muted-foreground text-xs font-medium mt-0.5">
              <CalendarDaysIcon className="w-3 h-3 inline mr-1 -mt-px" />
              {formatDisplayDate(weekStart)} — {formatDisplayDate(weekEnd)}
              <span className="mx-1.5 text-border">|</span>
              第 {weekNum} 周
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2Icon className="w-4 h-4 animate-spin" />
              <span>生成中…</span>
            </>
          ) : review ? (
            <>
              <RefreshCwIcon className="w-4 h-4" />
              <span>重新生成</span>
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4" />
              <span>生成周复盘</span>
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/10"
        >
          <AlertTriangleIcon className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-destructive text-sm leading-relaxed">{error}</p>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loading && !review && (
        <div className="bg-card rounded-[20px] border border-border shadow-sm p-8 space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-3/4 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-5/6 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="pt-6 border-t border-border space-y-3">
            <div className="h-3 w-1/4 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-4/5 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="pt-6 border-t border-border space-y-3">
            <div className="h-3 w-1/4 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
      )}

      {/* Review result */}
      {review && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <ReviewCard
            highlights={review.highlights}
            problems={review.problems}
            suggestions={review.suggestions}
            summary={review.summary}
          />
        </motion.div>
      )}

      {/* Entry count badge */}
      {review && review.entryCount > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 justify-center"
        >
          <FileTextIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            基于本周 {review.entryCount} 天的记录生成
          </span>
        </motion.div>
      )}

      {/* Empty state */}
      {!review && !loading && !error && (
        <div className="bg-card rounded-[20px] border border-border shadow-sm p-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <SparklesIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-foreground font-semibold text-base mb-2">
              生成本周 AI 复盘
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              AI 将分析本周所有每日记录，为你生成周度复盘总结和改进建议
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
