"""Reviews API routes — daily entries, period reviews, AI generation."""
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import ValidationError
from models import (
    CreateDailyEntryRequest, DateQuery, DateRangeQuery, PeriodQuery, GenerateReviewRequest,
    DailyEntryResponse, ReviewResultResponse, PeriodReviewResponse, RecentEntriesResponse,
    ReviewType, row_to_entry, now_ms, now_iso,
)
from database import get_db
from services import call_llm, call_rule_engine
from services import generate_weekly_ai_review, generate_monthly_ai_review, generate_yearly_ai_review
import json, uuid
from datetime import date, timedelta, datetime, timezone

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


def _fmt(e: ValidationError) -> dict:
    errors: dict[str, list[str]] = {}
    for err in e.errors():
        field = ".".join(str(loc) for loc in err["loc"])
        errors.setdefault(field, []).append(err["msg"])
    return errors


def _parse_json(val):
    if val is None: return None
    if isinstance(val, list): return json.dumps(val)
    if isinstance(val, str): return val
    return json.dumps(val)


def _get_week_days(d: date):
    start = d - timedelta(days=d.weekday())
    end = start + timedelta(days=6)
    return start.isoformat(), end.isoformat()


# ---- Daily Entries ----

@router.get("/recent")
async def get_recent(limit: int = Query(10, le=50)):
    db = await get_db()
    cur = await db.execute("SELECT * FROM daily_entries ORDER BY date DESC LIMIT ?", (limit,))
    rows = await cur.fetchall()
    entries = [row_to_entry(dict(r)).model_dump() for r in rows]
    return {"success": True, "data": {"entries": entries, "total": len(entries)}}


@router.get("/entries")
async def get_entries(startDate: str = Query(...), endDate: str = Query(...)):
    try:
        DateRangeQuery(startDate=startDate, endDate=endDate)
    except ValidationError as e:
        raise HTTPException(400, detail={"error": "参数校验失败", "details": _fmt(e)})
    db = await get_db()
    cur = await db.execute("SELECT * FROM daily_entries WHERE date >= ? AND date <= ? ORDER BY date DESC", (startDate, endDate))
    rows = await cur.fetchall()
    return {"success": True, "data": [row_to_entry(dict(r)).model_dump() for r in rows]}


@router.get("/entry")
async def get_entry(date: str = Query(...)):
    try:
        DateQuery(date=date)
    except ValidationError as e:
        raise HTTPException(400, detail={"error": "参数校验失败", "details": _fmt(e)})
    db = await get_db()
    cur = await db.execute("SELECT * FROM daily_entries WHERE date = ?", (date,))
    row = await cur.fetchone()
    if not row:
        return {"success": True, "data": None}
    return {"success": True, "data": row_to_entry(dict(row)).model_dump()}


@router.post("/entry")
async def create_or_update_entry(req: Request):
    try:
        body = CreateDailyEntryRequest.model_validate(await req.json())
    except ValidationError as e:
        raise HTTPException(400, detail={"error": "参数校验失败", "details": _fmt(e)})
    db = await get_db()
    cur = await db.execute("SELECT * FROM daily_entries WHERE date = ?", (body.date,))
    existing = await cur.fetchone()
    now = now_ms()

    if existing:
        await db.execute(
            "UPDATE daily_entries SET content=?, mood=?, energy=?, updated_at=? WHERE id=?",
            (body.content, body.mood, body.energy, now, existing["id"]),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM daily_entries WHERE id = ?", (existing["id"],))
        row = await cur.fetchone()
    else:
        eid = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO daily_entries (id, date, content, mood, energy, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
            (eid, body.date, body.content, body.mood, body.energy, now, now),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM daily_entries WHERE id = ?", (eid,))
        row = await cur.fetchone()
    return {"success": True, "data": row_to_entry(dict(row)).model_dump()}


@router.delete("/entry")
async def delete_entry(date: str = Query(...)):
    try:
        DateQuery(date=date)
    except ValidationError as e:
        raise HTTPException(400, detail={"error": "参数校验失败", "details": _fmt(e)})
    db = await get_db()
    cur = await db.execute("SELECT * FROM daily_entries WHERE date = ?", (date,))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(404, detail={"error": "该日期无记录"})
    await db.execute("DELETE FROM ai_reviews WHERE daily_entry_id = ?", (row["id"],))
    await db.execute("DELETE FROM daily_entries WHERE id = ?", (row["id"],))
    await db.commit()
    return {"success": True, "message": "已删除"}


@router.delete("/ai-review")
async def delete_ai_review(date: str = Query(...)):
    try:
        DateQuery(date=date)
    except ValidationError as e:
        raise HTTPException(400, detail={"error": "参数校验失败", "details": _fmt(e)})
    db = await get_db()
    cur = await db.execute("SELECT * FROM daily_entries WHERE date = ?", (date,))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(404, detail={"error": "该日期无记录"})
    entry_id = row["id"]
    await db.execute(
        "UPDATE daily_entries SET highlights=NULL, problems=NULL, suggestions=NULL, review_generated_at=NULL, updated_at=? WHERE id=?",
        (now_ms(), entry_id),
    )
    await db.execute("DELETE FROM ai_reviews WHERE daily_entry_id = ?", (entry_id,))
    await db.commit()
    return {"success": True, "message": "AI 复盘已删除"}


# ---- AI Review Generation ----

@router.post("/generate")
async def generate_review(req: Request):
    body_data = await req.json()
    try:
        body = GenerateReviewRequest.model_validate(body_data)
    except ValidationError as e:
        raise HTTPException(400, detail={"error": "参数校验失败", "details": _fmt(e)})

    db = await get_db()
    cur = await db.execute("SELECT * FROM daily_entries WHERE date = ?", (body.date,))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(404, detail={"error": "该日期暂无记录，请先填写今日工作内容"})

    content = row["content"]
    if body.mood or body.energy:
        mood_labels = ["", "很差", "不太好", "一般", "还不错", "非常好"]
        energy_labels = ["", "很低", "偏低", "一般", "较高", "充沛"]
        extra = []
        if body.mood: extra.append(f"心情：{mood_labels[body.mood]}（{body.mood}/5）")
        if body.energy: extra.append(f"能量：{energy_labels[body.energy]}（{body.energy}/5）")
        content = f"[今日状态]\n{'\n'.join(extra)}\n\n[今日记录]\n{row['content']}"

    is_demo = False
    try:
        output = await call_llm(content, body.importedMaterials, body.date)
    except Exception:
        output = call_rule_engine(content, body.importedMaterials, body.date)
        is_demo = True

    review = output.result
    now = now_ms()
    await db.execute(
        "UPDATE daily_entries SET highlights=?, problems=?, suggestions=?, review_generated_at=?, updated_at=? WHERE id=?",
        (json.dumps(review.highlights, ensure_ascii=False), json.dumps(review.problems, ensure_ascii=False), json.dumps(review.suggestions, ensure_ascii=False), now, now, row["id"]),
    )
    await db.commit()

    data = review.model_dump()
    data["isDemo"] = is_demo
    data["model"] = output.model
    return {"success": True, "data": data}


# ---- Period Reviews ----

def _parse_period(ref_date: str, period_type: str):
    d = date.fromisoformat(ref_date)
    if period_type == "weekly":
        start = d - timedelta(days=d.weekday())
        end = start + timedelta(days=6)
        week_num = d.isocalendar()[1]
        label = f"{d.year}年第{week_num}周"
        return start.isoformat(), end.isoformat(), label
    elif period_type == "monthly":
        start = d.replace(day=1)
        if d.month == 12:
            end = d.replace(year=d.year+1, month=1, day=1) - timedelta(days=1)
        else:
            end = d.replace(month=d.month+1, day=1) - timedelta(days=1)
        label = f"{d.year}年{d.month}月"
        return start.isoformat(), end.isoformat(), label
    elif period_type == "yearly":
        start = d.replace(month=1, day=1)
        end = d.replace(month=12, day=31)
        label = f"{d.year}年"
        return start.isoformat(), end.isoformat(), label
    raise ValueError(f"无效的复盘类型: {period_type}")


@router.post("/generate-period")
async def generate_period_review(req: Request):
    try:
        body = PeriodQuery.model_validate(await req.json())
    except ValidationError as e:
        raise HTTPException(400, detail={"error": "参数校验失败", "details": _fmt(e)})

    try:
        start_str, end_str, label = _parse_period(body.date, body.type.value)
    except ValueError as e:
        raise HTTPException(400, detail={"error": str(e)})

    db = await get_db()
    cur = await db.execute("SELECT * FROM daily_entries WHERE date >= ? AND date <= ? ORDER BY date", (start_str, end_str))
    entries = [dict(r) for r in await cur.fetchall()]
    if not entries:
        type_names = {"weekly": "周", "monthly": "月", "yearly": "年"}
        raise HTTPException(404, detail={"error": f"该{type_names.get(body.type.value, '')}暂无记录"})

    entry_data = [{"date": e["date"], "content": e["content"]} for e in entries]

    if body.type == ReviewType.weekly:
        review = generate_weekly_ai_review(entry_data, start_str, end_str)
    elif body.type == ReviewType.monthly:
        review = generate_monthly_ai_review(entry_data, start_str, end_str, label)
    else:
        review = generate_yearly_ai_review(entry_data, start_str, end_str, label)

    now = now_ms()
    cur = await db.execute("SELECT * FROM period_reviews WHERE period_type = ? AND period_start = ?", (body.type.value, start_str))
    existing = await cur.fetchone()

    if existing:
        await db.execute(
            "UPDATE period_reviews SET period_label=?, period_end=?, entry_count=?, summary=?, highlights=?, problems=?, suggestions=?, outlook=?, generated_at=? WHERE id=?",
            (label, end_str, review["entryCount"], review["summary"], json.dumps(review["highlights"], ensure_ascii=False), json.dumps(review["problems"], ensure_ascii=False), json.dumps(review["suggestions"], ensure_ascii=False), review.get("outlook"), now, existing["id"]),
        )
        pid = existing["id"]
    else:
        pid = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO period_reviews (id, period_type, period_label, period_start, period_end, entry_count, summary, highlights, problems, suggestions, outlook, generated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (pid, body.type.value, label, start_str, end_str, review["entryCount"], review["summary"], json.dumps(review["highlights"], ensure_ascii=False), json.dumps(review["problems"], ensure_ascii=False), json.dumps(review["suggestions"], ensure_ascii=False), review.get("outlook"), now, now),
        )
    await db.commit()

    return {
        "success": True,
        "data": {
            "id": pid, "type": review["type"], "periodStart": review["periodStart"], "periodEnd": review["periodEnd"],
            "highlights": review["highlights"], "problems": review["problems"], "suggestions": review["suggestions"],
            "summary": review["summary"], "entryCount": review["entryCount"], "generatedAt": now_iso(),
        },
    }


@router.get("/period")
async def get_period(period_type: str = Query(..., alias="type"), date_param: str = Query(..., alias="date")):
    try:
        PeriodQuery(type=period_type, date=date_param)
    except ValidationError as e:
        raise HTTPException(400, detail={"error": "参数校验失败", "details": _fmt(e)})

    d = date.fromisoformat(date_param)
    if period_type == "weekly":
        start = (d - timedelta(days=d.weekday())).isoformat()
    elif period_type == "monthly":
        start = d.replace(day=1).isoformat()
    elif period_type == "yearly":
        start = d.replace(month=1, day=1).isoformat()
    else:
        raise HTTPException(400, detail={"error": "无效的复盘类型"})

    db = await get_db()
    cur = await db.execute("SELECT * FROM period_reviews WHERE period_type = ? AND period_start = ?", (period_type, start))
    row = await cur.fetchone()
    if not row:
        return {"success": True, "data": None}

    r = dict(row)
    return {
        "success": True,
        "data": {
            "id": r["id"], "type": r["period_type"], "periodStart": r["period_start"], "periodEnd": r["period_end"],
            "highlights": json.loads(r["highlights"]) if r["highlights"] else [],
            "problems": json.loads(r["problems"]) if r["problems"] else [],
            "suggestions": json.loads(r["suggestions"]) if r["suggestions"] else [],
            "summary": r["summary"], "entryCount": r["entry_count"],
            "generatedAt": datetime.fromtimestamp(r["generated_at"]/1000, tz=timezone.utc).isoformat(),
        },
    }
