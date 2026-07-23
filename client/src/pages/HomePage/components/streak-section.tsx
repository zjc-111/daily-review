import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FlameIcon, TrophyIcon, HashIcon } from "lucide-react";
import { format, subDays, eachDayOfInterval, startOfWeek, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getEntriesInRange } from "@/api";
import { cn } from "@/lib/utils";
import type { DailyEntryResponse } from "@shared/api.interface";

const MOOD_EMOJIS = ["", "\u{1F62B}", "\u{1F61F}", "\u{1F610}", "\u{1F642}", "\u{1F604}"];

export default function StreakSection() {
  const [entries, setEntries] = useState<DailyEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const start = subDays(today, 90);
    getEntriesInRange(format(start, "yyyy-MM-dd"), format(today, "yyyy-MM-dd"))
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => computeStats(entries), [entries]);

  const heatmapData = useMemo(() => {
    const today = new Date();
    const calStart = startOfWeek(subDays(today, 34), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: today });
    const entryDates = new Set(entries.map((e) => e.date));
    const moodByDate = new Map(entries.filter((e) => e.mood).map((e) => [e.date, e.mood!]));

    return {
      days: days.map((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        return {
          date: d,
          dateStr,
          hasEntry: entryDates.has(dateStr),
          mood: moodByDate.get(dateStr) ?? null,
          isToday: isSameDay(d, today),
        };
      }),
      calStart,
    };
  }, [entries]);

  const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];

  if (loading) {
    return (
      <section className="w-full">
        <div className="bg-card rounded-[20px] border border-border shadow-sm p-6">
          <div className="animate-pulse space-y-5">
            <div className="flex gap-6">
              <div className="h-12 w-20 bg-muted rounded-xl" />
              <div className="h-12 w-20 bg-muted rounded-xl" />
              <div className="h-12 w-20 bg-muted rounded-xl" />
            </div>
            <div className="h-20 bg-muted rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-card rounded-[20px] border border-border shadow-sm p-6 space-y-6"
      >
        {/* Stats row */}
        <div className="flex items-center gap-6 flex-wrap">
          <StatItem
            icon={FlameIcon}
            value={stats.currentStreak}
            label="连续打卡"
            suffix="天"
            accent="text-warning"
            accentBg="bg-warning/10"
            iconBg="bg-warning/10"
          />
          <StatItem
            icon={TrophyIcon}
            value={stats.longestStreak}
            label="最长连续"
            suffix="天"
            accent="text-success"
            accentBg="bg-success/10"
            iconBg="bg-success/10"
          />
          <StatItem
            icon={HashIcon}
            value={stats.totalEntries}
            label="总记录"
            suffix="天"
            accent="text-primary"
            accentBg="bg-primary/10"
            iconBg="bg-primary/10"
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Calendar Heatmap */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            近 5 周活动
          </p>
          <div className="flex gap-0.5">
            <div className="flex flex-col gap-0.5 mr-1 pt-0.5">
              {weekLabels.map((label, i) => (
                <div key={i} className="h-[18px] flex items-center justify-end">
                  {i % 2 === 0 && (
                    <span className="text-[10px] text-muted-foreground/60 leading-none">
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-0.5 overflow-x-auto">
              {Array.from({ length: Math.ceil(heatmapData.days.length / 7) }).map(
                (_, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-0.5">
                    {heatmapData.days
                      .slice(weekIdx * 7, (weekIdx + 1) * 7)
                      .map((day) => {
                        const mood = day.mood;
                        return (
                          <div
                            key={day.dateStr}
                            title={`${format(day.date, "M月d日 EEE", { locale: zhCN })}${day.hasEntry ? " ✓" : ""}${mood ? ` 心情 ${mood}/5` : ""}`}
                            className={cn(
                              "w-[18px] h-[18px] rounded-[5px] relative group",
                              day.isToday && "ring-2 ring-primary/30 ring-offset-1 ring-offset-card",
                              !day.hasEntry && "bg-muted/50",
                              day.hasEntry && !mood && "bg-primary/25",
                              day.hasEntry && mood === 1 && "bg-destructive/30",
                              day.hasEntry && mood === 2 && "bg-warning/30",
                              day.hasEntry && mood === 3 && "bg-primary/35",
                              day.hasEntry && mood === 4 && "bg-success/40",
                              day.hasEntry && mood === 5 && "bg-success/70"
                            )}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-foreground text-background text-[10px] rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10 font-medium">
                              {format(day.date, "M/d")}
                              {mood ? ` ${MOOD_EMOJIS[mood]}` : day.hasEntry ? " ✓" : ""}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-[3px] bg-muted/50" />
              无记录
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-[3px] bg-primary/25" />
              有记录
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-[3px] bg-success/70" />
              心情好
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function StatItem({
  icon: Icon,
  value,
  label,
  suffix,
  accent,
  accentBg,
  iconBg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  suffix: string;
  accent: string;
  accentBg: string;
  iconBg: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className={cn("w-5 h-5", accent)} />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black tracking-tight text-foreground tabular-nums">
            {value}
          </span>
          <span className="text-xs text-muted-foreground font-medium">{suffix}</span>
        </div>
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      </div>
    </div>
  );
}

function computeStats(entries: DailyEntryResponse[]) {
  if (entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalEntries: 0 };
  }

  const dateSet = new Set(entries.map((e) => e.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let checkDate = new Date(today);
  if (!dateSet.has(format(checkDate, "yyyy-MM-dd"))) {
    checkDate = subDays(checkDate, 1);
  }
  while (dateSet.has(format(checkDate, "yyyy-MM-dd"))) {
    currentStreak++;
    checkDate = subDays(checkDate, 1);
  }

  const sortedDates = Array.from(dateSet).sort();
  let longestStreak = 1;
  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1] + "T00:00:00");
    const curr = new Date(sortedDates[i] + "T00:00:00");
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalEntries: entries.length,
  };
}
