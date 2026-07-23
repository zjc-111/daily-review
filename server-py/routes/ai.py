"""AI review API routes."""
from fastapi import APIRouter, Request, HTTPException
from pydantic import ValidationError
from models import GenerateReviewRequest, now_ms
from database import get_db
from services import call_llm, call_rule_engine
import uuid

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _fmt(e: ValidationError) -> dict:
    errors: dict[str, list[str]] = {}
    for err in e.errors():
        field = ".".join(str(loc) for loc in err["loc"])
        errors.setdefault(field, []).append(err["msg"])
    return errors


@router.post("/review")
async def ai_review(req: Request):
    try:
        body = GenerateReviewRequest.model_validate(await req.json())
    except ValidationError as e:
        raise HTTPException(400, detail={"error": "参数校验失败", "details": _fmt(e)})
    is_demo = False
    try:
        output = await call_llm(body.content, body.importedMaterials, body.date)
    except Exception:
        output = call_rule_engine(body.content, body.importedMaterials, body.date)
        is_demo = True
    data = output.result.model_dump()
    data["isDemo"] = is_demo
    data["model"] = output.model
    return {"success": True, "data": data}


@router.post("/review/save-meta")
async def save_meta(req: Request):
    body = await req.json()
    db = await get_db()
    await db.execute(
        "INSERT INTO ai_reviews (id, daily_entry_id, model, prompt_tokens, completion_tokens, created_at) VALUES (?,?,?,?,?,?)",
        (str(uuid.uuid4()), body.get("dailyEntryId"), body.get("model", "rule-engine"), body.get("promptTokens", 0), body.get("completionTokens", 0), now_ms()),
    )
    await db.commit()
    return {"success": True, "data": {"saved": True}}
