import { CalendarIcon, ChevronRightIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MOOD_EMOJIS = ["", "\u{1F62B}", "\u{1F61F}", "\u{1F610}", "\u{1F642}", "\u{1F604}"];
const ENERGY_EMOJIS = ["", "\u{1FAAB}", "\u{1F634}", "\u{1F50B}", "⚡", "\u{1F525}"];

interface IEntryCard {
  date: string;
  content: string;
  hasReview?: boolean;
  mood?: number | null;
  energy?: number | null;
  onClick?: () => void;
}

export function EntryCard({ date, content, hasReview = false, mood, energy, onClick }: IEntryCard) {
  const formattedDate = formatDate(date);
  const preview = content.length > 120 ? content.slice(0, 120) + "…" : content;
  const charCount = content.length;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-5 bg-card rounded-[20px] border border-border transition-all duration-300",
        "shadow-sm hover:shadow-md hover:border-primary/20",
        "group cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Date header */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
              <CalendarIcon className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {formattedDate}
            </span>
            {hasReview && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent text-accent-foreground text-[11px] font-semibold border border-primary/10">
                <SparklesIcon className="w-3 h-3" />
                已复盘
              </span>
            )}
            {mood != null && mood > 0 && (
              <span className="text-sm" title={`心情 ${mood}/5`}>
                {MOOD_EMOJIS[mood]}
              </span>
            )}
            {energy != null && energy > 0 && (
              <span className="text-sm" title={`能量 ${energy}/5`}>
                {ENERGY_EMOJIS[energy]}
              </span>
            )}
          </div>

          {/* Content preview */}
          <p className="text-[15px] text-foreground leading-relaxed line-clamp-3">
            {preview}
          </p>

          {/* Footer meta */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-muted-foreground font-medium">
              {charCount} 字
            </span>
          </div>
        </div>

        {/* Arrow indicator */}
        <ChevronRightIcon
          className={cn(
            "w-5 h-5 text-muted-foreground shrink-0 mt-1",
            "opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0",
            "transition-all duration-300"
          )}
        />
      </div>
    </button>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00");
    const now = new Date();
    const isThisYear = date.getFullYear() === now.getFullYear();

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const weekDay = weekDays[date.getDay()];

    if (isThisYear) {
      return `${month}月${day}日 ${weekDay}`;
    }
    return `${date.getFullYear()}年${month}月${day}日 ${weekDay}`;
  } catch {
    return dateStr;
  }
}
