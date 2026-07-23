import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, addDays, startOfWeek } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { getEntriesInRange } from "@/api";
import { cn } from "@/lib/utils";

function dateToStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export default function DateSelectorSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentDate = searchParams.get("date") || dateToStr(new Date());

  const weekStart = startOfWeek(new Date(currentDate + "T00:00:00"), { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [entryDates, setEntryDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const startDate = dateToStr(weekDates[0]);
    const endDate = dateToStr(weekDates[6]);
    getEntriesInRange(startDate, endDate)
      .then((entries) => {
        setEntryDates(new Set(entries.map((e) => e.date)));
      })
      .catch(() => {});
  }, [currentDate]);

  const handleDateChange = (date: string) => {
    setSearchParams({ date });
  };

  const handlePrevWeek = () => {
    const prevStart = addDays(weekStart, -7);
    const midWeek = addDays(prevStart, 3);
    setSearchParams({ date: dateToStr(midWeek) });
  };

  const handleNextWeek = () => {
    const nextStart = addDays(weekStart, 7);
    const midWeek = addDays(nextStart, 3);
    setSearchParams({ date: dateToStr(midWeek) });
  };

  const handleToday = () => {
    setSearchParams({ date: dateToStr(new Date()) });
  };

  const todayStr = dateToStr(new Date());
  const weekDays = ["一", "二", "三", "四", "五", "六", "日"];
  const rangeStart = format(weekDates[0], "M月d日");
  const rangeEnd = format(weekDates[6], "M月d日");

  return (
    <section className="w-full">
      <div className="bg-card rounded-[20px] border border-border shadow-sm p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="上一周"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground min-w-[130px] text-center">
              {rangeStart} — {rangeEnd}
            </span>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="下一周"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleToday}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-accent"
          >
            今天
          </button>
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, idx) => {
            const dateStr = dateToStr(date);
            const isSelected = dateStr === currentDate;
            const isToday = dateStr === todayStr;
            const hasEntry = entryDates.has(dateStr);

            return (
              <button
                key={dateStr}
                onClick={() => handleDateChange(dateStr)}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-foreground hover:bg-muted/70"
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {weekDays[idx]}
                </span>
                <span className={cn(
                  "text-lg font-bold",
                  isToday && !isSelected && "text-primary"
                )}>
                  {date.getDate()}
                </span>
                {hasEntry && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm" />
                )}
                {!hasEntry && isToday && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                )}
                {!hasEntry && !isToday && (
                  <div className="w-1.5 h-1.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
