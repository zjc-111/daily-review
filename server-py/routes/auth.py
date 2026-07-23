"""Auth routes — login, verify, logout."""
from fastapi import APIRouter, Request, HTTPException
from pydantic import ValidationError
from models import SendCodeRequest, VerifyCodeRequest, LoginResponse, UserProfileResponse, now_ms
from database import get_db
import uuid, base64, json

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _mask_phone(phone: str) -> str:
    return f"{phone[:3]}****{phone[7:]}" if len(phone) == 11 else phone


def _make_token(user_id: str, phone: str) -> str:
    payload = json.dumps({"userId": user_id, "phone": phone, "exp": now_ms() + 7 * 24 * 60 * 60 * 1000})
    return base64.b64encode(payload.encode()).decode()


@router.post("/send-code")
async def send_code(req: Request):
    try:
        body = SendCodeRequest.model_validate(await req.json())
    except ValidationError as e:
        raise HTTPException(400, detail={"error": "参数校验失败", "details": _format_errors(e)})

    db = await get_db()
    code = "1234"
    expire_at = now_ms() + 10 * 60 * 1000

    cur = await db.execute("SELECT id FROM users WHERE phone = ?", (body.phone,))
    existing = await cur.fetchone()

    if existing:
        await db.execute("UPDATE users SET sms_code=?, sms_token_expire_at=? WHERE phone=?", (code, expire_at, body.phone))
    else:
        await db.execute("INSERT INTO users (id, phone, sms_code, sms_token_expire_at, created_at) VALUES (?,?,?,?,?)", (str(uuid.uuid4()), body.phone, code, expire_at, now_ms()))
    await db.commit()

    return {"success": True, "data": {"message": f"验证码已发送（测试验证码：{code}）", "debug": {"code": code}}}


@router.post("/verify")
async def verify_code(req: Request):
    try:
        body = VerifyCodeRequest.model_validate(await req.json())
    except ValidationError as e:
        raise HTTPException(400, detail={"error": "参数校验失败", "details": _format_errors(e)})

    db = await get_db()
    cur = await db.execute("SELECT * FROM users WHERE phone = ?", (body.phone,))
    user = await cur.fetchone()

    if not user:
        raise HTTPException(400, detail={"error": "手机号未注册，请先获取验证码"})

    if user["sms_code"] != body.code and body.code != "1234":
        raise HTTPException(400, detail={"error": "验证码错误"})

    if body.code != "1234" and user["sms_token_expire_at"] and user["sms_token_expire_at"] < now_ms():
        raise HTTPException(400, detail={"error": "验证码已过期"})

    await db.execute("UPDATE users SET sms_code=NULL, sms_token_expire_at=NULL WHERE id=?", (user["id"],))
    await db.commit()

    token = _make_token(user["id"], user["phone"])
    profile = UserProfileResponse(userId=user["id"], phone=user["phone"], name=_mask_phone(user["phone"]), avatar="")
    return {"success": True, "data": LoginResponse(token=token, user=profile).model_dump()}


@router.get("/me")
async def get_me(req: Request):
    auth = req.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, detail={"error": "未登录"})
    try:
        payload = json.loads(base64.b64decode(auth[7:]).decode())
    except Exception:
        raise HTTPException(401, detail={"error": "无效的登录凭证"})
    if payload.get("exp", 0) < now_ms():
        raise HTTPException(401, detail={"error": "登录已过期"})

    db = await get_db()
    cur = await db.execute("SELECT * FROM users WHERE id = ?", (payload["userId"],))
    user = await cur.fetchone()
    if not user:
        raise HTTPException(401, detail={"error": "用户不存在"})

    profile = UserProfileResponse(userId=user["id"], phone=user["phone"], name=_mask_phone(user["phone"]), avatar="")
    return {"success": True, "data": profile.model_dump()}


@router.post("/logout")
async def logout():
    return {"success": True, "data": {"message": "已退出登录"}}


def _format_errors(e: ValidationError) -> dict:
    errors: dict[str, list[str]] = {}
    for err in e.errors():
        field = ".".join(str(loc) for loc in err["loc"])
        errors.setdefault(field, []).append(err["msg"])
    return errors
