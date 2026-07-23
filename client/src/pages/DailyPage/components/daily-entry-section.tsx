import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  SaveIcon,
  SparklesIcon,
  Loader2Icon,
  BrainIcon,
  AlertCircleIcon,
  XIcon,
  PlusIcon,
  CheckIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getEntry, saveEntry, generateDailyReview, deleteEntry } from "@/api";
import { ReviewCard } from "@/pages/shared/review-card";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { DailyEntryResponse, ReviewResultResponse } from "@shared/api.interface";

const PROMPT_CHIPS = [
  { label: "今天最顺的事", prefix: "\n## 今天最顺的事\n" },
  { label: "最卡的地方", prefix: "\n## 最卡的地方\n" },
  { label: "一个新想法", prefix: "\n## 一个新想法\n" },
  { label: "明天第一件事", prefix: "\n## 明天第一件事\n" },
];

const MOOD_EMOJIS = ["\u{1F62B}", "\u{1F61F}", "\u{1F610}", "\u{1F642}", "\u{1F604}"];
const ENERGY_EMOJIS = ["\u{1FAAB}", "\u{1F634}", "\u{1F50B}", "⚡", "\u{1F525}"];

export default function DailyEntrySection() {
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const [content, setContent] = useState("");
  const [entry, setEntry] = useState<DailyEntryResponse | null>(null);
  const [review, setReview] = useState<ReviewResultResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showProgressText, setShowProgressText] = useState(false);
  const [importedMaterials, setImportedMaterials] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showDeleteEntryDialog, setShowDeleteEntryDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [contentBlocks, setContentBlocks] = useState<{ id: number; text: string }[]>([
    { id: 0, text: "" },
  ]);
  const nextBlockId = useRef(1);

  useEffect(() => {
    const joined = contentBlocks.map((b) => b.text).join("\n\n---\n\n");
    setContent(joined);
  }, [contentBlocks]);

  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [showScoring, setShowScoring] = useState(false);

  const [isFocused, setIsFocused] = useState(false);
  const SOFT_LIMIT = 500;
  const isOverLimit = content.length > SOFT_LIMIT;

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ markdown: string }>;
      const { markdown } = customEvent.detail;
      if (markdown) {
        setContentBlocks((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...last,
            text: last.text + markdown,
          };
          return updated;
        });
        setImportedMaterials((prev) => prev + (prev ? "\n" : "") + markdown);
      }
    };
    window.addEventListener("append-to-daily-content", handler);
    return () => window.removeEventListener("append-to-daily-content", handler);
  }, []);

  useEffect(() => {
    setImportedMaterials("");
    setContentBlocks([{ id: 0, text: "" }]);
    nextBlockId.current = 1;
    setSaveStatus(null);
    setSaveError(null);
  }, [selectedDate]);

  useEffect(() => {
    if (isGenerating) {
      setShowProgressText(false);
      progressTimerRef.current = setTimeout(() => setShowProgressText(true), 3000);
    } else {
      setShowProgressText(false);
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }
    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, [isGenerating]);

  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);
    setContent("");
    setEntry(null);
    setReview(null);
    setGenerateError(null);
    setMood(null);
    setEnergy(null);

    async function load() {
      try {
        const data = await getEntry(selectedDate);
        if (cancelled) return;
        if (data) {
          setEntry(data);
          setContent(data.content);
          const parts = data.content.split("\n\n---\n\n");
          const blocks = parts.map((text, i) => ({ id: i, text }));
          setContentBlocks(blocks.length > 0 ? blocks : [{ id: 0, text: "" }]);
          nextBlockId.current = blocks.length;
          setMood(data.mood ?? null);
          setEnergy(data.energy ?? null);
          if (data.highlights && data.highlights.length > 0) {
            setReview({
              highlights: data.highlights,
              problems: data.problems ?? [],
              suggestions: data.suggestions ?? [],
              summary: (data as any).summary,
              nextAction: (data as any).nextAction,
              generatedAt: data.reviewGeneratedAt ?? "",
            });
          }
        }
      } catch {
        // Entry doesn't exist
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedDate]);

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    setSaveStatus(null);
    setSaveError(null);
    try {
      const saved = await saveEntry(selectedDate, content, mood, energy);
      setEntry(saved);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error: any) {
      console.error("Failed to save:", error);
      const msg = error?.response?.data?.error || error?.message || "保存失败，请重试";
      setSaveStatus("error");
      setSaveError(msg);
      setTimeout(() => { setSaveStatus(null); setSaveError(null); }, 5000);
    } finally {
      setIsSaving(false);
    }
  }, [content, selectedDate, mood, energy]);

  const handleBlockChange = useCallback((id: number, text: string) => {
    setContentBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  }, []);

  const handleAddBlock = useCallback(() => {
    const id = nextBlockId.current++;
    setContentBlocks((prev) => [...prev, { id, text: "" }]);
  }, []);

  const handleRemoveBlock = useCallback((id: number) => {
    setContentBlocks((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((b) => b.id !== id);
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerateError(null);

    if (!entry && content.trim()) {
      setIsSaving(true);
      try {
        const saved = await saveEntry(selectedDate, content, mood, energy);
        setEntry(saved);
      } catch (error: any) {
        const msg = error?.response?.data?.error || "保存失败";
        setGenerateError(`自动保存失败: ${msg}`);
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    setIsGenerating(true);
    try {
      const result = await generateDailyReview(
        selectedDate,
        importedMaterials || undefined,
        mood,
        energy
      );
      setReview(result);
      setIsDemoMode(result.isDemo === true);
      if (result.isDemo) {
        console.warn("[AI] Using smart-analysis engine (no LLM configured). Set VOLCANO_ENGINE_API_KEY env var to enable real AI.");
      }
      if (entry) {
        setEntry({
          ...entry,
          highlights: result.highlights,
          problems: result.problems,
          suggestions: result.suggestions,
          reviewGeneratedAt: result.generatedAt,
        });
      }
    } catch (error: any) {
      console.error("Failed to generate review:", error);
      setGenerateError(error?.response?.data?.error || "AI 复盘生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  }, [entry, content, selectedDate, importedMaterials, mood, energy]);

  const handleChipClick = useCallback((prefix: string) => {
    setContentBlocks((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = {
        ...last,
        text: last.text + prefix,
      };
      return updated;
    });
  }, []);

  const handleDeleteEntry = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteEntry(selectedDate);
      setEntry(null);
      setContent("");
      setReview(null);
      setMood(null);
      setEnergy(null);
      const dateObj = new Date(selectedDate + "T00:00:00");
      setDeleteSuccess(`已删除 ${format(dateObj, "M月d日")}`);
      setTimeout(() => setDeleteSuccess(null), 3000);
    } catch (error: any) {
      console.error("Failed to delete entry:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteEntryDialog(false);
    }
  }, [selectedDate]);

  const hasContent = content.trim().length > 0;
  const formattedDate = format(new Date(selectedDate + "T00:00:00"), "M月d日 EEEE");

  if (!isLoaded) {
    return (
      <section className="w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded-lg w-40" />
          <div className="h-60 bg-card rounded-[20px] border border-border" />
          <div className="h-10 bg-muted rounded-xl w-48" />
        </div>
      </section>
    );
  }

  return (
    <section className={cn(
      "w-full space-y-5 transition-all duration-300 group",
      isFocused && "[&>div:not(.focus-keep)]:opacity-40 [&>div:not(.focus-keep)]:scale-[0.99]"
    )}>
      {/* Header */}
      <div>
        <h2 className="text-foreground font-bold text-xl tracking-tight">
          {formattedDate}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          记录今天的工作内容，AI 将为你生成智能复盘
        </p>
      </div>

      {/* Mood + Energy Quick Scoring */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowScoring(!showScoring)}
          className={cn(
            "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all",
            showScoring
              ? "bg-accent text-primary border border-primary/20 shadow-sm"
              : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {mood || energy ? (
            <>
              {mood && <span>{MOOD_EMOJIS[mood - 1]}</span>}
              {energy && <span>{ENERGY_EMOJIS[energy - 1]}</span>}
              <span className="text-foreground">已评分</span>
            </>
          ) : (
            "今日状态"
          )}
        </button>

        <AnimatePresence>
          {showScoring && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full"
            >
              <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2.5">心情如何？</p>
                  <div className="flex gap-2">
                    {MOOD_EMOJIS.map((emoji, i) => (
                      <button
                        key={i}
                        onClick={() => setMood(mood === i + 1 ? null : i + 1)}
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all",
                          mood === i + 1
                            ? "bg-accent scale-110 shadow-sm border border-primary/20"
                            : "bg-muted/60 hover:bg-muted hover:scale-105"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2.5">能量如何？</p>
                  <div className="flex gap-2">
                    {ENERGY_EMOJIS.map((emoji, i) => (
                      <button
                        key={i}
                        onClick={() => setEnergy(energy === i + 1 ? null : i + 1)}
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all",
                          energy === i + 1
                            ? "bg-accent scale-110 shadow-sm border border-primary/20"
                            : "bg-muted/60 hover:bg-muted hover:scale-105"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Prompt Chips */}
      {content.length < 100 && (
        <div className="flex flex-wrap gap-2">
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleChipClick(chip.prefix)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-muted/80 text-muted-foreground hover:bg-accent hover:text-primary transition-all border border-transparent hover:border-primary/20"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Content Blocks with + / x */}
      <div className="focus-keep space-y-3 transition-all duration-300">
        {contentBlocks.map((block, idx) => (
          <div key={block.id} className="relative group/block">
            <textarea
              value={block.text}
              onChange={(e) => handleBlockChange(block.id, e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={
                idx === 0
                  ? "今天做了什么？遇到了什么挑战？有什么收获？\n\n试试点击上面的引导标签，或者直接写..."
                  : `追加记录 ${idx + 1}...`
              }
              className={cn(
                "w-full min-h-[120px] p-5 md:p-6 bg-card border rounded-[20px] text-foreground text-[15px] leading-relaxed placeholder:text-muted-foreground/50 resize-none transition-all",
                "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                isFocused
                  ? "border-primary shadow-md"
                  : "border-border shadow-sm"
              )}
            />
            {contentBlocks.length > 1 && (
              <button
                onClick={() => handleRemoveBlock(block.id)}
                className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground opacity-0 group-hover/block:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all touch-target"
                aria-label="删除此条目"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {/* + button to add block */}
        <button
          onClick={handleAddBlock}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[16px] border-2 border-dashed border-border text-sm text-muted-foreground font-medium hover:border-primary/40 hover:text-primary hover:bg-accent/20 transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          添加
        </button>

        {/* Word count */}
        <div className={cn(
          "text-right text-xs tabular-nums font-medium transition-colors",
          isOverLimit ? "text-warning" : "text-muted-foreground"
        )}>
          {content.length} 字
          {isOverLimit && <span className="ml-1">· 建议精简</span>}
        </div>
      </div>

      {/* Imported materials indicator */}
      {importedMaterials && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/40 border border-primary/15 rounded-xl text-xs font-semibold text-primary">
          <span>已导入素材</span>
          <span className="text-muted-foreground font-medium">· 将用于 AI 分析</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap group/actions">
        <button
          onClick={handleSave}
          disabled={!hasContent || isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm font-semibold shadow-sm hover:shadow-md hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-target"
        >
          {isSaving ? (
            <Loader2Icon className="w-4 h-4 animate-spin" />
          ) : (
            <SaveIcon className="w-4 h-4" />
          )}
          保存记录
        </button>

        <button
          onClick={handleGenerate}
          disabled={!hasContent || isGenerating}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl text-sm font-semibold shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-target active:scale-[0.98]"
        >
          {isGenerating ? (
            <Loader2Icon className="w-4 h-4 animate-spin" />
          ) : (
            <SparklesIcon className="w-4 h-4" />
          )}
          AI 复盘
        </button>

        {entry && (
          <button
            onClick={() => setShowDeleteEntryDialog(true)}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground md:opacity-0 md:group-hover/actions:opacity-100 hover:text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-all touch-target"
          >
            <XIcon className="w-4 h-4" />
            删除
          </button>
        )}

        {entry?.reviewGeneratedAt && review && (
          <span className="text-xs text-muted-foreground ml-auto font-medium">
            上次复盘：{format(new Date(entry.reviewGeneratedAt), "HH:mm")}
          </span>
        )}
      </div>

      {/* Generate error */}
      {generateError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl"
        >
          <AlertCircleIcon className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-destructive font-medium">{generateError}</p>
            <button
              onClick={handleGenerate}
              className="mt-2 text-xs font-semibold text-destructive hover:text-destructive/80 underline underline-offset-2 transition-colors"
            >
              点击重试
            </button>
          </div>
        </motion.div>
      )}

      {/* AI Review Loading */}
      {isGenerating && (
        <div className="bg-card rounded-[20px] border border-border shadow-sm p-6 md:p-8 space-y-6">
          {showProgressText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 pb-4 border-b border-border"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">AI 正在深度分析...</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  正在提炼亮点、识别问题、生成改进建议
                </p>
              </div>
            </motion.div>
          )}

          <div className="space-y-3 pb-6 border-b border-border">
            <div className="h-3.5 bg-muted rounded-full animate-pulse w-full" />
            <div className="h-3.5 bg-muted rounded-full animate-pulse w-[85%]" />
            <div className="h-3.5 bg-muted rounded-full animate-pulse w-[60%]" />
          </div>
          {["keep", "stop", "improve"].map((section) => (
            <div key={section} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                <div className="w-12 h-4 bg-muted rounded-full animate-pulse" />
              </div>
              <div className="pl-10 space-y-2">
                <div className="h-3.5 bg-muted rounded-full animate-pulse w-[90%]" />
                <div className="h-3.5 bg-muted rounded-full animate-pulse w-[70%]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isGenerating && !review && !generateError && hasContent && (
        <div className="bg-card rounded-[20px] border border-border shadow-sm p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground text-[15px] font-medium">
            点击「AI 复盘」按钮，获取智能分析
          </p>
        </div>
      )}

      {!isGenerating && !review && !generateError && !hasContent && (
        <div className="bg-card rounded-[20px] border border-border shadow-sm p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <BrainIcon className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground text-[15px] font-medium leading-relaxed max-w-xs mx-auto">
            先写下今天的工作内容，然后生成 AI 复盘
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!isGenerating && review && (
          <motion.div
            key={review.generatedAt ?? "review"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <ReviewCard
              highlights={review.highlights}
              problems={review.problems}
              suggestions={review.suggestions}
              summary={review.summary}
              nextAction={review.nextAction}
              isDemo={isDemoMode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {(deleteSuccess || saveStatus) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg",
              saveStatus === "error"
                ? "bg-destructive text-white"
                : "bg-foreground text-background"
            )}
          >
            {saveStatus === "success" && <CheckIcon className="w-4 h-4" />}
            {saveStatus === "error" && <AlertCircleIcon className="w-4 h-4" />}
            {deleteSuccess || (saveStatus === "success" ? "已保存" : saveError || "保存失败")}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Entry Confirmation Dialog */}
      <AlertDialog open={showDeleteEntryDialog} onOpenChange={setShowDeleteEntryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除 {format(new Date(selectedDate + "T00:00:00"), "M月d日")} 的复盘（含 AI 复盘）吗？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
