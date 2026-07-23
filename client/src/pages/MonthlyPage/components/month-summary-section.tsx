import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  FileTextIcon,
  PenLineIcon,
  CalendarDaysIcon,
  SparklesIcon,
  Loader2Icon,
} from "lucide-react";
import { getEntriesInRange, generatePeriodReview, getPeriodReview } from "@/api";
import { EntryCard } from "@/pages/shared/entry-card";
import { ReviewCard } from "@/pages/shared/review-card";
import { PeriodNavigator } from "@/pages/shared/period-navigator";
import type { DailyEntryResponse, PeriodReviewResponse } from "@shared/api.interface";
import { motion } from "framer-motion";

export function MonthSummarySection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  const dateParam = searchParams.get("date") || format(today, "yyyy-MM-dd");
  const [currentMonth, setCurrentMonth] = useState(() => new Date(dateParam + "T00:00:00"));
  const [entries, setEntries] = useState<DailyEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [review, setReview] = useState<PeriodReviewResponse | null>(null);

  useEffect(() => {
    const d = searchParams.get("date");
    if (d) setCurrentMonth(new Date(d + "T00:00:00"));
  }, [dateParam]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthLabel = format(currentMonth, "yyyy年M月", { locale: zhCN });
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");
  const isCurrentMonth =
    format(currentMonth, "yyyy-MM") === format(today, "yyyy-MM");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const [entryData, reviewData] = await Promise.all([
        getEntriesInRange(monthStartStr, monthEndStr),
        getPeriodReview("monthly", monthStartStr),
      ]);
      setEntries(entryData);
      setReview(reviewData);
    } catch {
      setEntries([]);
      setReview(null);
    } finally {
      setLoading(false);
    }
  }, [monthStartStr, monthEndStr]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleGenerateReview = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await generatePeriodReview("monthly", format(currentMonth, "yyyy-MM-dd"));
      setReview(result);
    } catch {
      // Handle silently
    } finally {
      setGenerating(false);
    }
  };

  const totalChars = entries.reduce((sum, e) => sum + e.content.length, 0);
  const daysWithEntry = new Set(entries.map((e) => e.date)).size;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full space-y-6"
    >
      {/* Month Navigation */}
      <PeriodNavigator
        label="本月"
        onPrev={() => {
          const prev = subMonths(currentMonth, 1);
          setCurrentMonth(prev);
          setSearchParams({ date: format(prev, "yyyy-MM-dd") });
        }}
        onNext={() => {
          const next = addMonths(currentMonth, 1);
          setCurrentMonth(next);
          setSearchParams({ date: format(next, "yyyy-MM-dd") });
        }}
        onCurrent={() => {
          setCurrentMonth(today);
          setSearchParams({});
        }}
        currentLabel={monthLabel}
        isCurrent={isCurrentMonth}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "记录天数", value: `${daysWithEntry} 天`, icon: <CalendarDaysIcon className="w-4 h-4 text-primary" /> },
          { label: "总字数", value: totalChars.toLocaleString(), icon: <PenLineIcon className="w-4 h-4 text-primary" /> },
          { label: "条目数", value: entries.length, icon: <FileTextIcon className="w-4 h-4 text-primary" /> },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card rounded-[20px] border border-border p-4 text-center shadow-sm"
          >
            <div className="flex items-center justify-center mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                {stat.icon}
              </div>
            </div>
            <div className="text-lg font-bold text-foreground tracking-tight">{stat.value}</div>
            <div className="text-[11px] font-semibold text-muted-foreground mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Entries List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2Icon className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length > 0 ? (
          entries.map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
            >
              <EntryCard
                date={entry.date}
                content={entry.content}
                hasReview={entry.reviewGeneratedAt !== null}
                mood={entry.mood}
                energy={entry.energy}
              />
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileTextIcon className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-[15px] font-semibold text-muted-foreground">
              {isCurrentMonth ? "本月还没有记录" : `${monthLabel}没有记录`}
            </p>
          </div>
        )}
      </div>

      {/* Generate / Show Review */}
      {entries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {review && (
            <ReviewCard
              highlights={review.highlights}
              problems={review.problems}
              suggestions={review.suggestions}
              summary={review.summary}
            />
          )}

          <div className="flex justify-center">
            <button
              onClick={handleGenerateReview}
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl font-semibold text-sm transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {generating ? (
                <><Loader2Icon className="w-4 h-4 animate-spin" /><span>AI 月复盘中...</span></>
              ) : (
                <><SparklesIcon className="w-4 h-4" /><span>{review ? "重新生成月度复盘" : "生成月度 AI 复盘"}</span></>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}
