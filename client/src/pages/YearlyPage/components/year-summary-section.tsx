import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  startOfYear,
  endOfYear,
  format,
  eachMonthOfInterval,
  isWithinInterval,
  parseISO,
  addYears,
  subYears,
} from "date-fns";
import {
  FileTextIcon,
  BarChart3Icon,
  CalendarDaysIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { getEntriesInRange, generatePeriodReview, getPeriodReview } from "@/api";
import { EntryCard } from "@/pages/shared/entry-card";
import { ReviewCard } from "@/pages/shared/review-card";
import { PeriodNavigator } from "@/pages/shared/period-navigator";
import type { DailyEntryResponse, PeriodReviewResponse } from "@shared/api.interface";

export default function YearSummarySection() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  const dateParam = searchParams.get("date") || format(today, "yyyy-MM-dd");
  const [currentYear, setCurrentYear] = useState(() => new Date(dateParam + "T00:00:00"));
  const [entries, setEntries] = useState<DailyEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [review, setReview] = useState<PeriodReviewResponse | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const yearStart = startOfYear(currentYear);
  const yearEnd = endOfYear(currentYear);
  const yearLabel = format(currentYear, "yyyy");
  const yearStartStr = format(yearStart, "yyyy-MM-dd");
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  const isCurrentYear = format(currentYear, "yyyy") === format(today, "yyyy");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [entryData, reviewData] = await Promise.all([
          getEntriesInRange(yearStartStr, format(yearEnd, "yyyy-MM-dd")),
          getPeriodReview("yearly", yearStartStr),
        ]);
        if (!cancelled) {
          setEntries(entryData ?? []);
          setReview(reviewData);
        }
      } catch {
        if (!cancelled) {
          setEntries([]);
          setReview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [yearStartStr, format(yearEnd, "yyyy-MM-dd")]);

  const handleGenerateReview = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await generatePeriodReview("yearly", yearStartStr);
      setReview(result);
    } catch {
      // Handle silently
    } finally {
      setGenerating(false);
    }
  };

  const filteredEntries =
    selectedMonth === null
      ? entries
      : entries.filter((e) => {
          const d = parseISO(e.date);
          return isWithinInterval(d, {
            start: new Date(currentYear.getFullYear(), selectedMonth, 1),
            end: new Date(currentYear.getFullYear(), selectedMonth + 1, 0, 23, 59, 59),
          });
        });

  const totalWords = entries.reduce((sum, e) => sum + (e.content?.length ?? 0), 0);
  const reviewedCount = entries.filter(
    (e) => e.highlights && e.highlights.length > 0
  ).length;

  const monthCounts = months.map((m) => {
    const month = m.getMonth();
    return entries.filter((e) => {
      const d = parseISO(e.date);
      return d.getMonth() === month && d.getFullYear() === currentYear.getFullYear();
    }).length;
  });

  const maxCount = Math.max(...monthCounts, 1);

  return (
    <section className="w-full space-y-6">
      {/* Year header */}
      <div className="bg-card rounded-[20px] border border-border shadow-sm p-8">
        <div className="mb-6">
          <PeriodNavigator
            label="今年"
            onPrev={() => {
              const prev = subYears(currentYear, 1);
              setCurrentYear(prev);
              setSearchParams({ date: format(prev, "yyyy-MM-dd") });
            }}
            onNext={() => {
              const next = addYears(currentYear, 1);
              setCurrentYear(next);
              setSearchParams({ date: format(next, "yyyy-MM-dd") });
            }}
            onCurrent={() => {
              setCurrentYear(today);
              setSearchParams({});
            }}
            currentLabel={`${yearLabel} 年`}
            isCurrent={isCurrentYear}
          />
        </div>
        <div className="mb-4">
          <h2 className="text-foreground text-2xl font-black tracking-tight">
            年度记录
          </h2>
          <p className="text-muted-foreground text-[13px] font-semibold mt-1">
            全年工作记录总览
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "记录天数", value: entries.length, icon: <FileTextIcon className="w-4 h-4 text-primary" /> },
            { label: "累计字数", value: totalWords.toLocaleString(), icon: <BarChart3Icon className="w-4 h-4 text-primary" /> },
            { label: "已复盘", value: reviewedCount, icon: <CalendarDaysIcon className="w-4 h-4 text-primary" /> },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border border-border/60">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {stat.icon}
              </div>
              <div>
                <p className="text-foreground text-xl font-bold leading-none">{stat.value}</p>
                <p className="text-muted-foreground text-xs font-semibold mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Monthly distribution mini bar chart */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-muted-foreground mb-4">月度记录分布</p>
          <div className="flex items-end gap-1.5 h-16">
            {months.map((m, idx) => {
              const count = monthCounts[idx];
              const heightPct = count > 0 ? Math.max(12, (count / maxCount) * 100) : 4;
              const isSelected = selectedMonth === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedMonth(isSelected ? null : idx)}
                  className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div
                    className="w-full rounded-t-md transition-all duration-200"
                    style={{
                      height: `${heightPct}%`,
                      minHeight: "4px",
                      backgroundColor: isSelected
                        ? "hsl(236 78% 56%)"
                        : count > 0
                          ? "hsl(236 78% 56% / 0.35)"
                          : "hsl(225 10% 89%)",
                    }}
                  />
                  <span className={`text-[10px] font-semibold transition-colors ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                    {m.getMonth() + 1}月
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Entries list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-foreground text-lg font-bold">
            {selectedMonth !== null ? `${selectedMonth + 1} 月记录` : "全部记录"}
          </h3>
          <span className="text-muted-foreground text-xs font-semibold bg-muted px-2.5 py-0.5 rounded-full">
            共 {filteredEntries.length} 条
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2Icon className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-card rounded-[20px] border border-border shadow-sm p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <FileTextIcon className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm font-semibold">
              {selectedMonth !== null
                ? `${selectedMonth + 1} 月暂无记录`
                : `${yearLabel} 年暂无记录，开始每日复盘吧`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                date={entry.date}
                content={entry.content}
                hasReview={Array.isArray(entry.highlights) && entry.highlights.length > 0}
                mood={entry.mood}
                energy={entry.energy}
                onClick={() => navigate(`/daily?date=${entry.date}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Generate / Show Yearly Review */}
      {entries.length > 0 && (
        <div className="space-y-6">
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
                <><Loader2Icon className="w-4 h-4 animate-spin" /><span>AI 年度复盘中...</span></>
              ) : (
                <><SparklesIcon className="w-4 h-4" /><span>{review ? "重新生成年度复盘" : "生成年度 AI 复盘"}</span></>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
