import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ClockIcon, FileTextIcon } from "lucide-react";
import { EntryCard } from "@/pages/shared/entry-card";
import { getRecentEntries } from "@/api";
import type { DailyEntryResponse } from "@shared/api.interface";

export default function RecentReviewsSection() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DailyEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        setLoading(true);
        const data = await getRecentEntries(6);
        setEntries(data.entries);
      } catch (err) {
        setError("加载最近记录失败");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
  }, []);

  const handleEntryClick = (entry: DailyEntryResponse) => {
    navigate(`/daily?date=${entry.date}`);
  };

  if (loading) {
    return (
      <section className="w-full space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <ClockIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">最近记录</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-card rounded-[20px] border border-border animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <ClockIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">最近记录</h2>
        </div>
        <div className="bg-card rounded-[20px] border border-border p-8 text-center shadow-sm">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClockIcon className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">最近记录</h2>
          {entries.length > 0 && (
            <span className="text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded-full">
              {entries.length} 条
            </span>
          )}
        </div>
      </motion.div>

      {entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card rounded-[20px] border border-border shadow-sm p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileTextIcon className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <p className="text-foreground font-semibold text-lg mb-2">还没有记录</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            开始记录你的每日工作，AI 将帮你生成智能复盘
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <EntryCard
                date={entry.date}
                content={entry.content}
                hasReview={entry.highlights !== null && entry.highlights.length > 0}
                mood={entry.mood}
                energy={entry.energy}
                onClick={() => handleEntryClick(entry)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
