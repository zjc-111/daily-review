import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameWeek } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  CalendarDaysIcon,
  FileTextIcon,
  SparklesIcon,
  LoaderIcon,
} from "lucide-react";
import { getEntriesInRange, generatePeriodReview, getPeriodReview } from "@/api";
import { EntryCard } from "@/pages/shared/entry-card";
import { ReviewCard } from "@/pages/shared/review-card";
import { PeriodNavigator } from "@/pages/shared/period-navigator";
import type { DailyEntryResponse, PeriodReviewResponse } from "@shared/api.interface";

export default function WeekSummarySection() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const dateParam = searchParams.get("date") || todayStr;
  const refDate = new Date(dateParam + "T00:00:00");
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const weekNum = format(refDate, "w", { locale: zhCN });
  const weekLabel = `${format(refDate, "yyyy")}年第${weekNum}周`;
  const weekRange = `${format(weekStart, "M月d日")} — ${format(weekEnd, "M月d日")}`;
  const isCurrentWeek = isSameWeek(refDate, today, { weekStartsOn: 1 });

  const [entries, setEntries] = useState<DailyEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [periodReview, setPeriodReview] = useState<PeriodReviewResponse | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [entryData, reviewData] = await Promise.all([
        getEntriesInRange(weekStartStr, weekEndStr),
        getPeriodReview("weekly", weekStartStr),
      ]);
      setEntries(entryData);
      setPeriodReview(reviewData);
    } catch {
      setEntries([]);
      setPeriodReview(null);
    } finally {
      setLoading(false);
    }
  }, [weekStartStr, weekEndStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateReview = async () => {
    if (generating) return;
    try {
      setGenerating(true);
      const result = await generatePeriodReview("weekly", weekStartStr);
      setPeriodReview(result);
    } catch {
      // silently fail
    } finally {
      setGenerating(false);
    }
  };

  const handleEntryClick = (date: string) => {
    navigate(`/daily?date=${date}`);
  };

  const handlePrev = () => {
    const prev = subWeeks(weekStart, 1);
    const mid = format(new Date(prev.getTime() + 3 * 86400000), "yyyy-MM-dd");
    setSearchParams({ date: mid });
  };

  const handleNext = () => {
    const next = addWeeks(weekStart, 1);
    const mid = format(new Date(next.getTime() + 3 * 86400000), "yyyy-MM-dd");
    setSearchParams({ date: mid });
  };

  const handleCurrent = () => {
    setSearchParams({});
  };

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  if (loading) {
    return (
      <section className="w-full">
        <div className="bg-card rounded-[20px] border border-border shadow-sm p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded-lg w-48" />
            <div className="h-4 bg-muted rounded-lg w-32" />
            <div className="h-24 bg-muted rounded-xl" />
            <div className="h-24 bg-muted rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      {/* Week header with navigation */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="bg-card rounded-[20px] border border-border shadow-sm p-6 md:p-8"
      >
        <div className="mb-5">
          <PeriodNavigator
            label="本周"
            onPrev={handlePrev}
            onNext={handleNext}
            onCurrent={handleCurrent}
            currentLabel={weekRange}
            isCurrent={isCurrentWeek}
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDaysIcon className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold text-primary bg-accent px-2 py-0.5 rounded-md">{weekLabel}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              本周概览
            </h2>
          </div>
          <div className="text-right bg-accent rounded-xl px-4 py-2">
            <span className="text-3xl font-black tracking-tight text-primary tabular-nums">
              {entries.length}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">天有记录</p>
          </div>
        </div>

        {/* Week day indicators */}
        <div className="flex gap-1.5 mt-6">
          {weekDays.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const hasEntry = entries.some((e) => e.date === dayStr);
            const isToday = dayStr === todayStr;
            const dayLabel = format(day, "EEE", { locale: zhCN });

            return (
              <div
                key={dayStr}
                className="flex-1 flex flex-col items-center gap-1.5"
              >
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {dayLabel}
                </span>
                <div
                  className={
                    isToday
                      ? "w-full h-2 rounded-full bg-primary shadow-sm"
                      : hasEntry
                        ? "w-full h-2 rounded-full bg-success shadow-sm"
                        : "w-full h-2 rounded-full bg-muted"
                  }
                />
                <span className="text-[11px] text-muted-foreground font-medium">
                  {format(day, "d")}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Entry list */}
      {entries.length > 0 ? (
        <div className="space-y-4">
          {entries.map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: idx * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <EntryCard
                date={entry.date}
                content={entry.content}
                hasReview={!!entry.highlights && entry.highlights.length > 0}
                mood={entry.mood}
                energy={entry.energy}
                onClick={() => handleEntryClick(entry.date)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card rounded-[20px] border border-border shadow-sm p-12 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileTextIcon className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-foreground font-semibold mb-1">本周还没有记录</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            坚持每日记录，复盘会更有价值
          </p>
        </motion.div>
      )}

      {/* Generate / Show Review */}
      {entries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: entries.length * 0.05,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {periodReview ? (
            <ReviewCard
              highlights={periodReview.highlights}
              problems={periodReview.problems}
              suggestions={periodReview.suggestions}
              summary={periodReview.summary}
            />
          ) : null}

          <div className="flex justify-center mt-6">
            <button
              onClick={handleGenerateReview}
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl font-semibold text-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {generating ? (
                <LoaderIcon className="w-4 h-4 animate-spin" />
              ) : (
                <SparklesIcon className="w-4 h-4" />
              )}
              {generating
                ? "AI 分析中..."
                : periodReview
                  ? "重新生成本周复盘"
                  : "生成本周 AI 复盘"}
            </button>
          </div>
        </motion.div>
      )}
    </section>
  );
}
