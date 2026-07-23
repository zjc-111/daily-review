import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HistoryIcon, ArrowRightIcon } from "lucide-react";
import { format } from "date-fns";
import { getEntry } from "@/api";
import type { DailyEntryResponse } from "@shared/api.interface";

interface IHistoryEntry {
  year: number;
  entry: DailyEntryResponse;
}

export default function HistoryTodaySection() {
  const navigate = useNavigate();
  const [historyEntries, setHistoryEntries] = useState<IHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const month = format(today, "MM");
    const day = format(today, "dd");
    const currentYear = today.getFullYear();

    const years = [currentYear - 1, currentYear - 2, currentYear - 3];
    const dateStrs = years.map((y) => `${y}-${month}-${day}`);

    Promise.all(dateStrs.map((d) => getEntry(d).catch(() => null)))
      .then((results) => {
        const found: IHistoryEntry[] = [];
        results.forEach((entry, idx) => {
          if (entry) {
            found.push({ year: years[idx], entry });
          }
        });
        setHistoryEntries(found);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && historyEntries.length === 0) {
    return null;
  }

  if (loading) {
    return null;
  }

  return (
    <section className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <HistoryIcon className="w-4 h-4 text-warning" />
          </div>
          <h2 className="text-lg font-bold text-foreground">那年今天</h2>
          <span className="text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded-full">
            {historyEntries.length} 条回忆
          </span>
        </div>

        <div className="space-y-3">
          {historyEntries.map((item, idx) => (
            <motion.button
              key={item.year}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: idx * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={() => navigate(`/daily?date=${item.entry.date}`)}
              className="w-full text-left p-5 bg-card rounded-[20px] border border-border shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Year badge */}
                <div className="shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accent/50 flex flex-col items-center justify-center border border-primary/5">
                  <span className="text-lg font-black tracking-tight text-primary">
                    {item.year}
                  </span>
                  <span className="text-[10px] text-muted-foreground -mt-0.5 font-medium">
                    年
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary mb-1.5">
                    {format(new Date(item.entry.date + "T00:00:00"), "M月d日")}
                  </p>
                  <p className="text-[15px] text-foreground leading-relaxed line-clamp-2">
                    {item.entry.content.slice(0, 150)}
                    {item.entry.content.length > 150 ? "…" : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {item.entry.content.length} 字
                    </span>
                    {item.entry.highlights && item.entry.highlights.length > 0 && (
                      <span className="text-xs text-primary font-semibold bg-accent px-2 py-0.5 rounded-md">已复盘</span>
                    )}
                  </div>
                </div>

                <ArrowRightIcon
                  className="w-4 h-4 text-primary shrink-0 mt-2 opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
