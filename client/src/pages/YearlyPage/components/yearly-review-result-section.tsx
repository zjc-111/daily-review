import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  SparklesIcon,
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  FileTextIcon,
} from "lucide-react";
import { getPeriodReview, generatePeriodReview } from "@/api";
import { ReviewCard } from "@/pages/shared/review-card";
import type { PeriodReviewResponse } from "@shared/api.interface";

interface IYearlyReviewResultSection {
  year: number;
  onYearChange: (year: number) => void;
}

export function YearlyReviewResultSection({
  year,
  onYearChange,
}: IYearlyReviewResultSection) {
  const [review, setReview] = useState<PeriodReviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const dateRef = `${year}-01-01`;

  const fetchReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPeriodReview("yearly", dateRef);
      setReview(data);
    } catch {
      setReview(null);
    } finally {
      setLoading(false);
    }
  }, [dateRef]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const data = await generatePeriodReview("yearly", dateRef);
      setReview(data);
      setMessage("年度复盘生成成功");
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      setError(
        apiErr?.response?.data?.error ?? "生成失败，请确保本年度有每日记录"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handlePrevYear = () => onYearChange(year - 1);
  const handleNextYear = () => {
    if (year < new Date().getFullYear()) onYearChange(year + 1);
  };

  const isCurrentYear = year === new Date().getFullYear();

  return (
    <section className="w-full space-y-6">
      {/* Year Selector + Generate Button */}
      <div className="bg-card rounded-[20px] border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
        <div className="flex items-center justify-between gap-4">
          {/* Year Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevYear}
              className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              aria-label="上一年"
            >
              <ChevronLeftIcon className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground tracking-tight">
                {year} 年
              </span>
            </div>

            <button
              onClick={handleNextYear}
              disabled={isCurrentYear}
              className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="下一年"
            >
              <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {generating ? (
              <>
                <RefreshCwIcon className="w-4 h-4 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                <span>{review ? "重新生成" : "AI 年度复盘"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="px-4 py-3 rounded-xl bg-success/10 text-success text-sm font-medium"
        >
          {message}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium"
        >
          {error}
        </motion.div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-card rounded-[20px] border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-8 space-y-6">
          <div className="h-4 bg-muted rounded-lg w-3/4 animate-pulse" />
          <div className="h-4 bg-muted rounded-lg w-1/2 animate-pulse" />
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="h-4 bg-muted rounded-lg w-2/3 animate-pulse" />
            <div className="h-4 bg-muted rounded-lg w-5/6 animate-pulse" />
            <div className="h-4 bg-muted rounded-lg w-3/4 animate-pulse" />
          </div>
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="h-4 bg-muted rounded-lg w-1/2 animate-pulse" />
            <div className="h-4 bg-muted rounded-lg w-2/3 animate-pulse" />
          </div>
        </div>
      )}

      {/* Generating Overlay */}
      {generating && !review && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card rounded-[20px] border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center justify-center gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-foreground font-semibold text-base">
              AI 正在分析你的全年工作...
            </p>
            <p className="text-muted-foreground text-sm">
              聚合全年每日记录，生成深度年度复盘
            </p>
          </div>
        </motion.div>
      )}

      {/* Review Result */}
      {!loading && review && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {/* Period Info Card */}
          <div className="bg-card rounded-[20px] border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <FileTextIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-foreground font-bold text-lg">
                    {year} 年度复盘
                  </h3>
                  <p className="text-muted-foreground text-xs font-medium mt-0.5">
                    聚合 {review.entryCount} 天的工作记录
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {new Date(review.generatedAt).toLocaleDateString("zh-CN", {
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
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

      {/* Empty State */}
      {!loading && !generating && !review && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card rounded-[20px] border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center justify-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <SparklesIcon className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-foreground font-semibold text-base">
              尚未生成 {year} 年度复盘
            </p>
            <p className="text-muted-foreground text-sm max-w-xs">
              点击上方「AI 年度复盘」按钮，基于全年每日记录生成深度年度复盘与新年展望
            </p>
          </div>
        </motion.div>
      )}
    </section>
  );
}
