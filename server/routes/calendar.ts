import { Router } from "express";
import type { CalendarEventResponse, ParseIcsResponse, ApiError } from "@shared/api.interface";

const router = Router();

/**
 * POST /api/calendar/parse-ics
 * 解析上传的 ICS 日历文件，提取事件列表
 */
router.post("/parse-ics", async (req, res) => {
  try {
    const { icsContent } = req.body;

    if (!icsContent || typeof icsContent !== "string") {
      res.status(400).json({
        error: "缺少 ICS 文件内容",
        details: { icsContent: ["请提供 ICS 文件内容"] },
      } satisfies ApiError);
      return;
    }

    const events = parseIcsContent(icsContent);

    const response: ParseIcsResponse = {
      events,
    };

    res.json({ success: true, data: response });
  } catch (err: any) {
    console.error("ICS parse error:", err);
    res.status(500).json({
      error: "ICS 文件解析失败",
      details: { message: [err.message || "未知错误"] },
    } satisfies ApiError);
  }
});

/**
 * 解析 ICS 文件内容，提取 VEVENT 事件
 */
function parseIcsContent(content: string): CalendarEventResponse[] {
  const events: CalendarEventResponse[] = [];
  
  // 分割成 VEVENT 块
  const lines = content.split(/\r?\n/);
  let inEvent = false;
  let currentEvent: Partial<CalendarEventResponse> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      currentEvent = {
        attendees: [],
      };
    } else if (line === "END:VEVENT") {
      if (inEvent && currentEvent) {
        // 验证必要字段
        if (currentEvent.id && currentEvent.title && currentEvent.startTime && currentEvent.endTime) {
          events.push({
            id: currentEvent.id,
            title: currentEvent.title,
            startTime: currentEvent.startTime,
            endTime: currentEvent.endTime,
            attendees: currentEvent.attendees || [],
            location: currentEvent.location,
            organizer: currentEvent.organizer,
            source: "ics",
          });
        }
      }
      inEvent = false;
      currentEvent = null;
    } else if (inEvent && currentEvent) {
      // 解析事件属性
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex);
      const value = line.substring(colonIndex + 1);

      // 处理带参数的键（如 DTSTART;VALUE=DATE:20260115）
      const baseKey = key.split(";")[0];

      switch (baseKey) {
        case "UID":
          currentEvent.id = value;
          break;
        case "SUMMARY":
          currentEvent.title = decodeIcsText(value);
          break;
        case "DTSTART":
          currentEvent.startTime = parseIcsDateTime(value);
          break;
        case "DTEND":
          currentEvent.endTime = parseIcsDateTime(value);
          break;
        case "LOCATION":
          currentEvent.location = decodeIcsText(value);
          break;
        case "ORGANIZER":
          currentEvent.organizer = decodeIcsText(value.replace(/^mailto:/, ""));
          break;
        case "ATTENDEE":
          const attendee = decodeIcsText(value.replace(/^mailto:/, ""));
          if (attendee && !currentEvent.attendees!.includes(attendee)) {
            currentEvent.attendees!.push(attendee);
          }
          break;
      }
    }
  }

  return events;
}

/**
 * 解析 ICS 日期时间格式
 * 支持格式：20260115T090000Z, 20260115T090000, 20260115
 */
function parseIcsDateTime(value: string): string {
  // 移除时区标识
  const cleaned = value.replace(/Z$/, "");

  if (cleaned.length === 8) {
    // 日期格式：20260115
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    return `${year}-${month}-${day}T00:00:00`;
  } else if (cleaned.length === 15) {
    // 日期时间格式：20260115T090000
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    const hour = cleaned.substring(9, 11);
    const minute = cleaned.substring(11, 13);
    const second = cleaned.substring(13, 15);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  // 如果无法解析，返回原值
  return value;
}

/**
 * 解码 ICS 文本（处理转义字符）
 */
function decodeIcsText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

export default router;
