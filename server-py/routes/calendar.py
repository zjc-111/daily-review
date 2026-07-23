"""ICS calendar parsing route."""
from fastapi import APIRouter, Request, HTTPException
from models import CalendarEventResponse, ParseIcsResponse
import re

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.post("/parse-ics")
async def parse_ics(req: Request):
    body = await req.json()
    ics = body.get("icsContent", "")
    if not ics or not isinstance(ics, str):
        raise HTTPException(400, detail={"error": "请提供 ICS 文件内容"})
    try:
        events = _parse_ics(ics)
        return {"success": True, "data": {"events": [e.model_dump() for e in events]}}
    except Exception as e:
        raise HTTPException(500, detail={"error": f"ICS 解析失败: {e}"})


def _parse_ics(content: str) -> list[CalendarEventResponse]:
    events: list[CalendarEventResponse] = []
    lines = content.split("\n")
    in_event = False
    cur: dict = {}

    for line in lines:
        line = line.strip()
        if line == "BEGIN:VEVENT":
            in_event = True
            cur = {"attendees": []}
        elif line == "END:VEVENT":
            if in_event and cur.get("id") and cur.get("title") and cur.get("startTime") and cur.get("endTime"):
                events.append(CalendarEventResponse(**cur))
            in_event = False
            cur = {}
        elif in_event:
            if ":" not in line:
                continue
            key, val = line.split(":", 1)
            base_key = key.split(";")[0]
            if base_key == "UID":
                cur["id"] = val
            elif base_key == "SUMMARY":
                cur["title"] = _decode_ics(val)
            elif base_key == "DTSTART":
                cur["startTime"] = _parse_ics_dt(val)
            elif base_key == "DTEND":
                cur["endTime"] = _parse_ics_dt(val)
            elif base_key == "LOCATION":
                cur["location"] = _decode_ics(val)
            elif base_key == "ORGANIZER":
                cur["organizer"] = _decode_ics(val.replace("mailto:", "", 1))
            elif base_key == "ATTENDEE":
                attendee = _decode_ics(val.replace("mailto:", "", 1))
                if attendee and attendee not in cur.get("attendees", []):
                    cur["attendees"].append(attendee)
    return events


def _parse_ics_dt(val: str) -> str:
    cleaned = val.replace("Z", "")
    if len(cleaned) == 8:
        return f"{cleaned[:4]}-{cleaned[4:6]}-{cleaned[6:8]}T00:00:00"
    if len(cleaned) == 15:
        return f"{cleaned[:4]}-{cleaned[4:6]}-{cleaned[6:8]}T{cleaned[9:11]}:{cleaned[11:13]}:{cleaned[13:15]}"
    return val


def _decode_ics(text: str) -> str:
    return text.replace("\\n", "\n").replace("\\,", ",").replace("\\;", ";").replace("\\\\", "\\")
