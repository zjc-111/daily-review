"""Pydantic models — mirrors shared/api.interface.ts."""
from __future__ import annotations
import re
from datetime import datetime, timezone
from enum import Enum
from pydantic import BaseModel, Field, field_validator


# ==================== Enums ====================

class ReviewType(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


# ==================== Request Schemas ====================

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
PHONE_RE = re.compile(r"^1[3-9]\d{9}$")


class SendCodeRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("请输入正确的手机号")
        return v


class VerifyCodeRequest(BaseModel):
    phone: str
    code: str = Field(min_length=4, max_length=6)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("请输入正确的手机号")
        return v


class CreateDailyEntryRequest(BaseModel):
    date: str
    content: str = Field(min_length=1, max_length=10000)
    mood: int | None = Field(default=None, ge=1, le=5)
    energy: int | None = Field(default=None, ge=1, le=5)

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not DATE_RE.match(v):
            raise ValueError("日期格式必须为 YYYY-MM-DD")
        return v


class DateQuery(BaseModel):
    date: str

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not DATE_RE.match(v):
            raise ValueError("日期格式必须为 YYYY-MM-DD")
        return v


class DateRangeQuery(BaseModel):
    startDate: str
    endDate: str

    @field_validator("startDate", "endDate")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not DATE_RE.match(v):
            raise ValueError("日期格式必须为 YYYY-MM-DD")
        return v


class PeriodQuery(BaseModel):
    type: ReviewType
    date: str

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not DATE_RE.match(v):
            raise ValueError("日期格式必须为 YYYY-MM-DD")
        return v


class GenerateReviewRequest(BaseModel):
    date: str
    importedMaterials: str | None = None
    mood: int | None = Field(default=None, ge=1, le=5)
    energy: int | None = Field(default=None, ge=1, le=5)

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not DATE_RE.match(v):
            raise ValueError("日期格式必须为 YYYY-MM-DD")
        return v


class ParseIcsRequest(BaseModel):
    icsContent: str = Field(min_length=1)


# ==================== Response Schemas ====================

class UserProfileResponse(BaseModel):
    userId: str
    phone: str
    name: str
    avatar: str


class LoginResponse(BaseModel):
    token: str
    user: UserProfileResponse


class DailyEntryResponse(BaseModel):
    id: str
    date: str
    content: str
    mood: int | None = None
    energy: int | None = None
    highlights: list[str] | None = None
    problems: list[str] | None = None
    suggestions: list[str] | None = None
    reviewGeneratedAt: str | None = None
    createdAt: str
    updatedAt: str


class ReviewResultResponse(BaseModel):
    highlights: list[str]
    problems: list[str]
    suggestions: list[str]
    summary: str = ""
    nextAction: str = ""
    generatedAt: str
    isDemo: bool = False
    model: str = "rule-engine"


class PeriodReviewResponse(BaseModel):
    id: str
    type: ReviewType
    periodStart: str
    periodEnd: str
    highlights: list[str]
    problems: list[str]
    suggestions: list[str]
    summary: str
    entryCount: int
    generatedAt: str


class CalendarEventResponse(BaseModel):
    id: str
    title: str
    startTime: str
    endTime: str
    attendees: list[str]
    location: str | None = None
    organizer: str | None = None
    source: str = "ics"


class ParseIcsResponse(BaseModel):
    events: list[CalendarEventResponse]


class RecentEntriesResponse(BaseModel):
    entries: list[DailyEntryResponse]
    total: int


class ApiResponse(BaseModel):
    success: bool = True
    data: dict | list | str | None = None
    message: str | None = None


class ApiError(BaseModel):
    error: str
    details: dict[str, list[str]] | None = None


# ==================== Helpers ====================

def now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_entry(row: dict) -> DailyEntryResponse:
    """Convert a DB row to DailyEntryResponse."""
    import json

    def parse_json(val: str | None) -> list[str] | None:
        if val is None:
            return None
        try:
            parsed = json.loads(val)
            return parsed if isinstance(parsed, list) else None
        except (json.JSONDecodeError, TypeError):
            return None

    def ts_to_iso(val: int | None) -> str | None:
        if val is None:
            return None
        return datetime.fromtimestamp(val / 1000, tz=timezone.utc).isoformat()

    return DailyEntryResponse(
        id=row["id"],
        date=row["date"],
        content=row["content"],
        mood=row.get("mood"),
        energy=row.get("energy"),
        highlights=parse_json(row.get("highlights")),
        problems=parse_json(row.get("problems")),
        suggestions=parse_json(row.get("suggestions")),
        reviewGeneratedAt=ts_to_iso(row.get("review_generated_at")),
        createdAt=ts_to_iso(row["created_at"]),
        updatedAt=ts_to_iso(row["updated_at"]),
    )
