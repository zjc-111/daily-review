import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDaysIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  FileTextIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPeriodReview, generatePeriodReview } from "@/api";
import { ReviewCard } from "@/pages/shared/review-card";
import type { PeriodReviewResponse } from "@shared/api.interface";

export function MonthlyReviewResultSection() {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const todayStr = format(today, "yyyy-MM-dd");
  const periodLabel = `${format(today, "yyyy")}年${format(today, "M")}月`;

  const [review, setReview] = useState<PeriodReviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPeriodReview("monthly", todayStr);
      setReview(data);
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        setError("加载月复盘失败");
      }
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await generatePeriodReview("monthly", todayStr);
      setReview(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ?? err?.message ?? "月复盘生成失败";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const formattedRange = `${format(monthStart, "M月d日", { locale: zhCN })} - ${format(monthEnd, "M月d日", { locale: zhCN })}`;

  return (
    <section className="w-full space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUpIcon className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-foreground font-bold text-lg tracking-tight">
              月度 AI 复盘
            </h2>
            <p className="text-muted-foreground text-xs font-medium mt-0.5">
              {periodLabel} · {formattedRange}
            </p>
          </div>
        </div>

        {/* Generate / Refresh Button */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 hover:text-primary-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <RefreshCwIcon
            className={cn("w-4 h-4", generating && "animate-spin")}
          />
          {generating
            ? "生成中..."
            : review
              ? "重新生成"
              : "生成月复盘"}
        </button>
      </div>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-destructive/5 border border-destructive/20 rounded-[20px] p-5"
          >
            <p className="text-destructive text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeleton */}
      <AnimatePresence>
        {loading && !review && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-card rounded-[20px] border border-border shadow-sm p-8 space-y-5"
          >
            <div className="h-4 w-full bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-5/6 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-4/6 bg-muted rounded-lg animate-pulse" />
            <div className="pt-4 border-t border-border space-y-3">
              <div className="h-3 w-3/4 bg-muted rounded-lg animate-pulse" />
              <div className="h-3 w-2/3 bg-muted rounded-lg animate-pulse" />
              <div className="h-3 w-1/2 bg-muted rounded-lg animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generating Animation */}
      <AnimatePresence>
        {generating && !review && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card rounded-[20px] border border-border shadow-sm p-8"
          >
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <RefreshCwIcon className="w-5 h-5 text-primary animate-spin" />
                </div>
                <div className="absolute inset-0 w-12 h-12 rounded-full bg-primary/5 animate-ping" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-semibold text-sm">
                  AI 正在分析本月工作记录...
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  聚合每日内容，生成深度月度复盘
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State — No Review Yet */}
      {!loading && !generating && !review && !error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card rounded-[20px] border border-border shadow-sm p-8"
        >
          <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <CalendarDaysIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <p className="text-foreground font-semibold text-base">
                本月复盘尚未生成
              </p>
              <p className="text-muted-foreground text-sm max-w-sm">
                点击「生成月复盘」，AI 将聚合本月所有每日记录，为你生成深度月度复盘分析
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Review Result */}
      <AnimatePresence>
        {review && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Meta bar */}
            <div className="flex items-center gap-4 px-1">
              <div className="flex items-center gap-1.5">
                <FileTextIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  聚合 {review.entryCount} 天记录
                </span>
              </div>
              <div className="w-px h-3 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">
                {new Date(review.generatedAt).toLocaleDateString("zh-CN", {
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                生成
              </span>
            </div>

            {/* Review Card */}
            <ReviewCard
              highlights={review.highlights}
              problems={review.problems}
              suggestions={review.suggestions}
              summary={review.summary}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
