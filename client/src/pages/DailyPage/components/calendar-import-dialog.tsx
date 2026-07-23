import { useState, useRef, useCallback } from "react";
import {
  CalendarDaysIcon,
  ClockIcon,
  UsersIcon,
  Loader2Icon,
  XIcon,
  MapPinIcon,
  CheckIcon,
  UploadIcon,
  PlusIcon,
  FileUpIcon,
} from "lucide-react";
import { format } from "date-fns";
import { parseIcsFile } from "@/api";
import { cn } from "@/lib/utils";
import type { CalendarEventResponse } from "@shared/api.interface";

interface ICalendarImportDialog {
  date: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (items: CalendarEventResponse[]) => void;
}

type Tab = "upload" | "manual";

export default function CalendarImportDialog({
  date,
  open,
  onClose,
  onConfirm,
}: ICalendarImportDialog) {
  const [tab, setTab] = useState<Tab>("upload");
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [manualTitle, setManualTitle] = useState("");
  const [manualStart, setManualStart] = useState("09:00");
  const [manualEnd, setManualEnd] = useState("10:00");
  const [manualLocation, setManualLocation] = useState("");

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError("");

    try {
      const text = await file.text();
      const result = await parseIcsFile(text);

      // Filter events for the selected date
      const dateEvents = result.events.filter((ev) => {
        const evDate = ev.startTime.substring(0, 10);
        return evDate === date;
      });

      if (dateEvents.length === 0 && result.events.length > 0) {
        // Show all events if none match the date
        setEvents(result.events);
        setSelectedIds(new Set(result.events.map((ev) => ev.id)));
        setError("未找到当天的日程，已显示所有事件");
      } else {
        setEvents(dateEvents);
        setSelectedIds(new Set(dateEvents.map((ev) => ev.id)));
      }

      setTab("upload");
    } catch (err: any) {
      setError(err?.response?.data?.error || "ICS 文件解析失败，请检查文件格式");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [date]);

  const handleAddManual = useCallback(() => {
    if (!manualTitle.trim()) return;

    const newEvent: CalendarEventResponse = {
      id: `manual-${Date.now()}`,
      title: manualTitle.trim(),
      startTime: `${date}T${manualStart}:00`,
      endTime: `${date}T${manualEnd}:00`,
      attendees: [],
      location: manualLocation.trim() || undefined,
      source: "manual",
    };

    setEvents((prev) => [...prev, newEvent]);
    setSelectedIds((prev) => new Set([...prev, newEvent.id]));
    setManualTitle("");
    setManualLocation("");
    setTab("upload");
  }, [date, manualTitle, manualStart, manualEnd, manualLocation]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map((e) => e.id)));
    }
  };

  const handleConfirm = () => {
    const selected = events.filter((e) => selectedIds.has(e.id));
    onConfirm(selected);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog — bottom sheet on mobile, centered on desktop */}
      <div className={cn(
        "relative bg-card border border-border w-full flex flex-col",
        "rounded-t-3xl md:rounded-2xl",
        "max-h-[85vh] md:max-h-[80vh] md:max-w-lg md:mx-4",
        "shadow-[0_-4px_24px_rgba(0,0,0,0.1)] md:shadow-[0_16px_48px_rgba(0,0,0,0.12)]",
        "animate-slide-up md:animate-fade-in"
      )}>
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <CalendarDaysIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">导入日程</h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                {format(new Date(date + "T00:00:00"), "yyyy年M月d日")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors touch-target"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-2">
          <button
            onClick={() => setTab("upload")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors",
              tab === "upload"
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <FileUpIcon className="w-4 h-4" />
            上传 ICS 文件
          </button>
          <button
            onClick={() => setTab("manual")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors",
              tab === "manual"
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <PlusIcon className="w-4 h-4" />
            手动添加
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "upload" && (
            <div className="space-y-4">
              {/* Upload area */}
              {events.length === 0 && !isLoading && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 hover:bg-accent/20 transition-all"
                >
                  <UploadIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    点击上传 .ics 日历文件
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    支持从 Google Calendar、Outlook、Apple Calendar 等导出
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ics,.ical"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2Icon className="w-6 h-6 text-primary animate-spin" />
                  <span className="ml-3 text-muted-foreground text-sm">解析 ICS 文件...</span>
                </div>
              )}

              {/* Events list */}
              {events.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={toggleAll}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      {selectedIds.size === events.length ? "取消全选" : "全选"}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <FileUpIcon className="w-3 h-3" />
                      重新上传
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".ics,.ical"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-2">
                    {events.map((event) => {
                      const isSelected = selectedIds.has(event.id);
                      return (
                        <div
                          key={event.id}
                          onClick={() => toggleSelect(event.id)}
                          className={cn(
                            "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                            isSelected
                              ? "border-primary/30 bg-accent/30"
                              : "border-border hover:border-border hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                            isSelected ? "bg-primary border-primary" : "border-border"
                          )}>
                            {isSelected && <CheckIcon className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <p className="font-medium text-foreground text-sm leading-snug flex-1">{event.title}</p>
                              {event.source && (
                                <span className={cn(
                                  "shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
                                  event.source === "ics" ? "bg-muted text-muted-foreground" : "bg-accent text-primary"
                                )}>
                                  {event.source === "ics" ? "ICS" : "手动"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {format(new Date(event.startTime), "HH:mm")}–
                                {format(new Date(event.endTime), "HH:mm")}
                              </span>
                              {event.attendees.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <UsersIcon className="w-3 h-3" />
                                  {event.attendees.length}人
                                </span>
                              )}
                              {event.location && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPinIcon className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "manual" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">日程标题</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="例如：产品评审会"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">开始时间</label>
                  <input
                    type="time"
                    value={manualStart}
                    onChange={(e) => setManualStart(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">结束时间</label>
                  <input
                    type="time"
                    value={manualEnd}
                    onChange={(e) => setManualEnd(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">地点（可选）</label>
                <input
                  type="text"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="例如：3楼会议室"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <button
                onClick={handleAddManual}
                disabled={!manualTitle.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                添加到日程列表
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/5 border border-destructive/10">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Footer */}
        {events.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <span className="text-xs text-muted-foreground">
              已选 {selectedIds.size}/{events.length} 项
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors touch-target"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-target"
              >
                加入复盘
              </button>
            </div>
          </div>
        )}

        {/* Mobile safe area spacer */}
        <div className="md:hidden h-2" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
      </div>
    </div>
  );
}
