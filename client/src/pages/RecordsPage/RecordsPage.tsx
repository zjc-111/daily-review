import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ListIcon,
  SearchIcon,
  FileTextIcon,
  Loader2Icon,
} from "lucide-react";
import { getRecentEntries } from "@/api";
import { EntryCard } from "@/pages/shared/entry-card";
import type { DailyEntryResponse } from "@shared/api.interface";

export default function RecordsPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DailyEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  const fetchEntries = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await getRecentEntries(p * PAGE_SIZE);
      const all = data.entries;
      setEntries(all);
      setHasMore(all.length >= p * PAGE_SIZE);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries(page);
  }, [page, fetchEntries]);

  const filtered = search.trim()
    ? entries.filter((e) => e.content.includes(search) || e.date.includes(search))
    : entries;

  const handleEntryClick = (entry: DailyEntryResponse) => {
    navigate(`/daily?date=${entry.date}`);
  };

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ListIcon className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            全部记录
          </span>
        </div>
        <h1 className="text-[28px] md:text-[38px] leading-tight font-black tracking-tight text-foreground">
          全部记录
        </h1>
        <p className="text-[15px] text-muted-foreground mt-2.5 leading-relaxed">
          浏览、搜索所有历史记录
        </p>
      </motion.header>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索记录内容或日期..."
            className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
      </motion.div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="font-medium">
          共 {filtered.length} 条记录
        </span>
        {search && entries.length !== filtered.length && (
          <span className="text-primary font-medium">
            {entries.length} 条中筛选
          </span>
        )}
      </div>

      {/* Entry List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-card rounded-[20px] border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              <EntryCard
                date={entry.date}
                content={entry.content}
                hasReview={!!entry.highlights && entry.highlights.length > 0}
                mood={entry.mood}
                energy={entry.energy}
                onClick={() => handleEntryClick(entry)}
              />
            </motion.div>
          ))}

          {/* Load more */}
          {hasMore && !search && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                加载更多
              </button>
            </div>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-[20px] border border-border shadow-sm p-12 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileTextIcon className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-foreground font-semibold mb-1">
            {search ? "没有匹配的记录" : "还没有记录"}
          </p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {search ? "试试其他关键词" : "去「每日」页面写下第一笔记录"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
