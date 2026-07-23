import {
  CalendarDaysIcon,
  MessageSquareIcon,
  XIcon,
  ArrowRightIcon,
  InboxIcon,
  FileUpIcon,
  PlusIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarEventResponse, MessageSummaryResponse } from "@shared/api.interface";

export interface IPendingCalendarItem {
  kind: "calendar";
  data: CalendarEventResponse;
}

export interface IPendingMessageItem {
  kind: "message";
  data: MessageSummaryResponse;
}

export type PendingItem = IPendingCalendarItem | IPendingMessageItem;

interface IPendingItemsSection {
  items: PendingItem[];
  onRemove: (index: number) => void;
  onAddToContent: () => void;
}

/**
 * Pending inbox -- shows imported items not yet added to review content.
 * Users can remove individually or add all to review body.
 */
export default function PendingItemsSection({
  items,
  onRemove,
  onAddToContent,
}: IPendingItemsSection) {
  if (items.length === 0) return null;

  return (
    <section className="w-full">
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-gradient-to-r from-accent/20 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <InboxIcon className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-foreground text-sm">
              待整理
            </span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {items.length}
            </span>
          </div>
          <button
            onClick={onAddToContent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-primary bg-accent hover:bg-accent/80 transition-colors touch-target border border-primary/10"
          >
            <ArrowRightIcon className="w-3 h-3" />
            全部加入复盘
          </button>
        </div>

        {/* Items list */}
        <div className="divide-y divide-border">
          {items.map((item, idx) => (
            <div
              key={`${item.kind}-${idx}`}
              className="flex items-start gap-3 px-4 md:px-6 py-3.5 group hover:bg-muted/30 transition-colors"
            >
              {/* Type icon */}
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                {item.kind === "calendar" ? (
                  <CalendarDaysIcon className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <MessageSquareIcon className="w-3.5 h-3.5 text-primary" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {item.kind === "calendar" ? (
                  <>
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-semibold text-foreground truncate flex-1">
                        {item.data.title}
                      </p>
                      {item.data.source && (
                        <span
                          className={cn(
                            "shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                            item.data.source === "ics"
                              ? "bg-muted text-muted-foreground"
                              : "bg-accent text-primary"
                          )}
                        >
                          {item.data.source === "ics" ? (
                            <>
                              <FileUpIcon className="w-2.5 h-2.5" />
                              ICS
                            </>
                          ) : (
                            <>
                              <PlusIcon className="w-2.5 h-2.5" />
                              手动
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      {format(new Date(item.data.startTime), "HH:mm")}-
                      {format(new Date(item.data.endTime), "HH:mm")}
                      {item.data.attendees.length > 0 &&
                        ` · ${item.data.attendees.join("、")}`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-semibold">{item.data.sender}</span>
                      <span className="text-muted-foreground text-xs ml-2 font-medium">
                        {format(new Date(item.data.time), "HH:mm")}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.data.summary}
                    </p>
                  </>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => onRemove(idx)}
                className="p-2 rounded-lg text-muted-foreground md:opacity-0 md:group-hover:opacity-100 hover:bg-muted hover:text-destructive transition-all shrink-0 touch-target"
                aria-label="移除"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Format pending items as markdown for appending to review content.
 */
export function formatPendingItemsAsMarkdown(items: PendingItem[]): string {
  if (items.length === 0) return "";

  const lines: string[] = ["", "---", "## 导入素材", ""];

  const calendarItems = items.filter((i): i is IPendingCalendarItem => i.kind === "calendar");
  const messageItems = items.filter((i): i is IPendingMessageItem => i.kind === "message");

  if (calendarItems.length > 0) {
    lines.push("### 今日日程");
    calendarItems.forEach((item) => {
      const time = `${format(new Date(item.data.startTime), "HH:mm")}-${format(new Date(item.data.endTime), "HH:mm")}`;
      const attendees = item.data.attendees.length > 0 ? `（${item.data.attendees.join("、")}）` : "";
      const source = item.data.source ? ` [${item.data.source === "ics" ? "ICS导入" : "手动添加"}]` : "";
      lines.push(`- ${time} ${item.data.title}${attendees}${source}`);
    });
    lines.push("");
  }

  if (messageItems.length > 0) {
    lines.push("### 关键消息");
    messageItems.forEach((item) => {
      const time = format(new Date(item.data.time), "HH:mm");
      lines.push(`- ${time} **${item.data.sender}**：${item.data.summary}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}
