"""AI review engine — rule-based analyzer + LLM integration."""
from __future__ import annotations
import os, re, json
from models import ReviewResultResponse, now_iso


class AIReviewOutput:
    def __init__(self, result, model, prompt_tokens=0, completion_tokens=0):
        self.result = result
        self.model = model
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


SYSTEM_PROMPT = """你是一位专业的个人复盘教练，采用 KISS 框架分析用户每日工作。
## 输出格式（严格 JSON）
{"highlights": ["Keep1","Keep2"], "problems": ["Stop1","Stop2"], "suggestions": ["Improve1","Improve2","Improve3"], "summary": "一句话洞察", "nextAction": "明日第一行动"}"""


async def call_llm(content, imported_materials=None, date=None):
    import httpx
    endpoint = os.getenv("LLM_ENDPOINT") or os.getenv("VOLCANO_ENGINE_ENDPOINT") or "https://api.deepseek.com/v1/chat/completions"
    api_key = os.getenv("AI_API_KEY") or os.getenv("LLM_API_KEY") or os.getenv("VOLCANO_ENGINE_API_KEY")
    model = os.getenv("LLM_MODEL") or os.getenv("VOLCANO_ENGINE_MODEL") or "deepseek-chat"
    if not api_key:
        raise RuntimeError("LLM not configured")
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    body = {"model": model, "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": _build_prompt(content, imported_materials, date)}], "temperature": 0.7, "max_tokens": 1200, "response_format": {"type": "json_object"}}
    async with httpx.AsyncClient(timeout=30) as cl:
        r = await cl.post(endpoint, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()
    raw = data["choices"][0]["message"]["content"]
    parsed = json.loads(raw)
    result = ReviewResultResponse(highlights=parsed["highlights"][:2], problems=parsed["problems"][:2], suggestions=parsed["suggestions"][:3], summary=parsed.get("summary", ""), nextAction=parsed.get("nextAction", ""), generatedAt=now_iso(), isDemo=False, model=model)
    usage = data.get("usage", {})
    return AIReviewOutput(result, model, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0))


def _build_prompt(content, imported_materials=None, date=None):
    parts = []
    if date: parts.append(f"日期：{date}")
    parts.append(f"\n## 今日工作记录\n{content}")
    if imported_materials and imported_materials.strip(): parts.append(f"\n## 导入的素材\n{imported_materials}")
    parts.append("\n请基于以上内容生成复盘分析。")
    return "\n".join(parts)


def call_rule_engine(content, imported_materials=None, date=None):
    combined = f"{content}\n{imported_materials}" if imported_materials else content
    sentences = split_sentences(combined)
    topics = detect_topics(combined)
    key_phrases = extract_key_phrases(sentences)
    sentiment = analyze_sentiment(combined)
    challenges = extract_challenges(combined, sentences)
    achievements = extract_achievements(combined, sentences)
    has_learning = any(t["topic"] == "学习成长" for t in topics)
    has_meeting = any(t["topic"] == "会议沟通" for t in topics)
    has_code = any(t["topic"] == "开发编码" for t in topics)
    has_plan = any(t["topic"] == "计划管理" for t in topics)
    has_doc = any(t["topic"] == "文档输出" for t in topics)
    has_design = any(t["topic"] == "产品设计" for t in topics)
    has_data = any(t["topic"] == "数据分析" for t in topics)
    clen = len(combined); sc = len(sentences); tc = len(topics)

    highlights = []
    if achievements:
        top = achievements[:2]
        highlights.append(f"今天推进了「{top[0]}」{'和「' + top[1] + '」' if len(top) > 1 else ''}，有实质性进展")
    elif key_phrases:
        extra = f"，同时推进了「{key_phrases[1]}」" if len(key_phrases) > 1 else ""
        highlights.append(f"围绕「{key_phrases[0]}」展开工作{extra}，方向清晰")
    if tc >= 3:
        tt = [t["topic"] for t in topics[:3]]
        highlights.append(f"今天在{tt[0]}和{tt[1]}之间高效切换，多线并行但保持了节奏")
    elif tc == 1: highlights.append(f"深度投入{topics[0]['topic']}，这种专注度在当前阶段很有价值")
    elif tc == 2: highlights.append(f"{topics[0]['topic']}与{topics[1]['topic']}的结合体现了系统性思维")
    if sentiment["positive_count"] >= 3: highlights.append("整体状态积极，保持了良好的工作节奏和心态")
    if sc >= 6: highlights.append("复盘记录详实具体，这种颗粒度的回顾对持续改进非常有效")
    if has_learning:
        lk = topics[[t["topic"] for t in topics].index("学习成长")]["keywords"]
        highlights.append(f"在忙碌中仍投入了{lk[0] if lk else '学习'}，这种投资会在中长期产生复利")
    if not highlights:
        highlights.append("有意识地对工作进行了结构化回顾，这个习惯本身就是亮点")
        if clen > 50: highlights.append("记录中体现了对工作过程的深入思考，而不只是流水账")

    problems = []
    if clen < 30: problems.append("记录内容偏简略——试试用「做了什么 → 卡在哪 → 下一步」的三段式展开")
    if challenges: problems.append(f"提到了「{challenges[0]}」，值得深入拆解")
    if not has_plan and sc > 2: problems.append("记录中缺少对优先级和计划的描述")
    if has_code and not has_learning: problems.append("以执行性工作为主，纯产出日容易陷入技术债务累积")
    if has_meeting and sc > 4: problems.append("会议沟通占比较高——警惕「用会议替代深度思考」")
    if tc >= 4: problems.append("涉及 4+ 领域，频繁切换损耗认知资源——考虑主题日或时间块")
    if sentiment["negative_count"] >= 3 and not challenges: problems.append("记录中透露出压力和负面情绪，但没有具体展开")
    if sc > 2 and not challenges and sentiment["negative_count"] == 0: problems.append("未提及任何挑战——适当记录「什么不顺利」更有改进价值")

    suggestions = []
    if has_code and not has_learning:
        topic = key_phrases[0] if key_phrases else "当前技术栈"
        suggestions.append(f"明天花 25 分钟搜一篇与「{topic}」相关的技术文章，记录 1 个可用要点")
    if tc >= 4: suggestions.append("明天试试「主题日」策略：相似任务合并到上午/下午两个时间块，目标连续专注 90 分钟")
    if not has_plan: suggestions.append("明早花 5 分钟写下「今天必须完成的 1 件事 + 可以做的 2 件事」")
    if has_meeting: suggestions.append("下次会议前用 3 分钟写下预期产出，会后立刻记录下一步行动")
    if challenges: suggestions.append(f"针对「{challenges[0]}」，明天用 15 分钟拆成 3 个可执行小步骤")
    if sc < 4 and clen > 20: suggestions.append("明天试试：① 最有价值的事 ② 最大卡点 ③ 明天一个行动项")
    if has_design and not has_data: suggestions.append("花 10 分钟看一组用户数据，用数据验证一个设计假设")
    if not suggestions: suggestions.append("保持当前节奏，明天试试增加一个「今天最满意的一个决策是什么」")

    summary = _gen_summary(clen, tc, sentiment, achievements, challenges, topics, has_meeting, has_code, has_learning)
    next_action = _gen_next_action(has_code, has_learning, has_plan, has_meeting, has_doc, has_design, tc, key_phrases, challenges)

    result = ReviewResultResponse(highlights=highlights[:3], problems=problems[:2], suggestions=suggestions[:3], summary=summary, nextAction=next_action, generatedAt=now_iso(), isDemo=True, model="smart-analysis")
    return AIReviewOutput(result, "smart-analysis", 0, 0)


def split_sentences(text):
    return [s.strip() for s in re.split(r"[。！？\n.;!?]+", text) if len(s.strip()) > 2]

def detect_topics(text):
    topic_map = {"会议沟通": ["会议","讨论","沟通","对齐","评审","周会","站会","1v1","meeting","同步","拉通"],"开发编码": ["代码","编码","开发","调试","bug","fix","PR","上线","部署","code","debug","重构","优化"],"学习成长": ["学习","阅读","课程","教程","文章","研究","探索","新技术","learn","read","study"],"计划管理": ["计划","排期","优先级","OKR","目标","deadline","里程碑","todo","规划","安排"],"文档输出": ["文档","设计","方案","记录","wiki","沉淀","总结","报告","doc","write"],"团队管理": ["团队","招聘","面试","绩效","培养","mentor","带人","管理","1on1"],"产品设计": ["需求","产品","用户","体验","交互","原型","PRD","功能","设计"],"数据分析": ["数据","分析","报表","指标","监控","dashboard","SQL","统计","洞察"]}
    lower = text.lower()
    found = [{"topic": t, "keywords": [k for k in kw if k.lower() in lower]} for t, kw in topic_map.items() if any(k.lower() in lower for k in kw)]
    found.sort(key=lambda x: len(x["keywords"]), reverse=True)
    return found

def extract_key_phrases(sentences):
    actions = ["完成","实现","修复","优化","设计","搭建","重构","交付","上线","发布","编写","开发","解决","处理","推进","整理","输出","产出","落地","启动"]
    phrases = []
    for s in sentences:
        for kw in actions:
            if kw in s:
                idx = s.index(kw); start = max(0, idx-6); end = min(len(s), idx+len(kw)+10)
                phrase = s[start:end].lstrip("，。、 ")
                if 3 < len(phrase) < 30: phrases.append(phrase)
                break
    return list(dict.fromkeys(phrases))[:5]

def analyze_sentiment(text):
    pos_words = ["完成","成功","搞定","顺利","解决","优化","提升","进步","收获","满意","开心","兴奋","突破","有效","高效","清晰","聚焦","充实","不错","好","交付","上线","通过","认可","赞赏","学习","成长","掌握"]
    neg_words = ["卡住","拖延","没做","失败","bug","问题","困难","焦虑","压力","加班","来不及","推迟","阻塞","混乱","低效","迷茫","疲惫","烦躁","没完成","延期","返工","重做","纠结","浪费","被动","打断","插队"]
    lower = text.lower()
    pos = sum(1 for w in pos_words if w in lower)
    neg = sum(1 for w in neg_words if w in lower)
    return {"positive_count": pos, "negative_count": neg, "score": pos - neg}

def extract_challenges(text, sentences):
    kws = ["卡住","困难","问题","挑战","bug","阻塞","delay","延期","没做完","推迟","纠结","混乱","低效","拖延","返工","重做","没搞懂","不确定","瓶颈","压力","加班","来不及"]
    challenges = []
    for s in sentences:
        for kw in kws:
            if kw.lower() in s.lower():
                idx = s.lower().index(kw.lower()); start = max(0, idx-8); end = min(len(s), idx+len(kw)+15)
                phrase = s[start:end].lstrip("，。、 ")
                if 4 < len(phrase) < 35: challenges.append(phrase)
                break
    return list(dict.fromkeys(challenges))[:3]

def extract_achievements(text, sentences):
    kws = ["完成","实现","搞定","解决","交付","上线","发布","优化","重构","搭建","设计","修复","推进","落地","产出","通过"]
    achievements = []
    for s in sentences:
        for kw in kws:
            if kw in s:
                idx = s.index(kw); start = max(0, idx-4); end = min(len(s), idx+len(kw)+12)
                phrase = s[start:end].lstrip("，。、 ")
                if 3 < len(phrase) < 30: achievements.append(phrase)
                break
    return list(dict.fromkeys(achievements))[:4]

def _gen_summary(clen, tc, sentiment, achievements, challenges, topics, has_meeting, has_code, has_learning):
    if clen < 20: return "记录偏简，明天试试多写两行"
    if achievements and sentiment["score"] > 0: return f"围绕「{achievements[0]}」取得进展，整体状态积极"
    if challenges and sentiment["score"] < 0: return f"今天遇到卡点（{challenges[0]}），正视问题是解决的第一步"
    if tc >= 4: return f"多线并行——{'与'.join(t['topic'] for t in topics[:2])}交替推进，注意聚焦"
    if has_meeting and has_code: return "协作文与深度工作兼顾，节奏把控得不错"
    if has_code and has_learning: return "产出与成长并重的一天"
    if has_code: return f"扎实的执行日，{'「'+achievements[0]+'」有实质推进' if achievements else '代码产出有进展'}"
    if has_meeting: return "以沟通协作为主，推动了跨团队信息对齐"
    if has_learning: return "持续学习的一天"
    if sentiment["score"] > 2: return "今天整体状态很好"
    if sentiment["score"] < -1: return "今天压力较大，明天先做一件小事找回掌控感"
    return "有记录就有积累，保持复盘习惯比什么都重要"

def _gen_next_action(has_code, has_learning, has_plan, has_meeting, has_doc, has_design, tc, key_phrases, challenges):
    if challenges: return f"明早花 10 分钟把「{challenges[0]}」拆成 3 个小步骤"
    if not has_plan: return "明早花 5 分钟写下今天的 1 个必做 + 2 个可选任务"
    if has_code and not has_learning: return f"明早花 20 分钟搜一篇与「{key_phrases[0] if key_phrases else '当前项目'}」相关的文章"
    if has_meeting and tc < 3: return "明天第一个会议前用 3 分钟写下 3 个预期目标"
    if tc >= 4: return "明早把任务按类型分组，相似任务放同一时间块处理"
    if has_design: return "明天花 15 分钟看一组用户数据，验证一个设计假设"
    if not has_doc and has_code: return "明天抽 15 分钟把关键产出整理成文档"
    return "明早先回顾今天的复盘，从最重要的 1 件事开始新的一天"


# ==================== Period Reviews ====================

def generate_daily_ai_review(content, date):
    return call_rule_engine(content, date=date).result

def generate_weekly_ai_review(entries, ws, we):
    ac = "\n".join(e["content"] for e in entries)
    topics = detect_topics(ac); tl = len(ac); al = round(tl / len(entries)) if entries else 0
    summary = f"本周（{ws} 至 {we}）共有 {len(entries)} 天记录"
    if len(entries) >= 5: summary += "，节奏良好"
    elif len(entries) >= 3: summary += "，有一定习惯"
    else: summary += "，频率有提升空间"
    summary += f"。主要方向：{'、'.join(t['topic'] for t in topics[:3])}。" if topics else "。"
    if al > 100: summary += "记录详实，有深度思考。"
    elif al > 30: summary += "内容有深度。"

    hl = [f"本周坚持 {len(entries)} 天记录"]
    if len(topics) >= 2: hl.append(f"方向多元：{'、'.join(t['topic'] for t in topics[:3])}")
    if al > 80: hl.append("每日记录内容丰富")
    if len(entries) >= 5: hl.append("保持稳定记录节奏")

    pl = []
    if len(entries) < 5: pl.append(f"仅 {len(entries)} 天记录，建议养成工作日记录习惯")
    if al < 40: pl.append("部分日期记录偏简略")
    if len(topics) <= 1 and len(entries) >= 3: pl.append("工作内容较单一")

    sg = ["下周一花 10 分钟制定周计划", "整理本周问题和方案到知识库"]
    if len(entries) < 5: sg.append("设定每日固定复盘时间（如下班前 15 分钟）")
    sg.append("回顾本周时间分配是否与优先级一致")

    ft = topics[0]["topic"] if topics else "核心工作"
    outlook = f"新的一周即将到来。建议在{ft}方向深耕，关注{'记录频率和深度' if pl else '保持节奏和持续改进'}。"
    return {"type": "weekly", "periodStart": ws, "periodEnd": we, "highlights": hl, "problems": pl, "suggestions": sg, "summary": summary, "entryCount": len(entries), "outlook": outlook}

def generate_monthly_ai_review(entries, ms, me, ml):
    ac = "\n".join(e["content"] for e in entries)
    topics = detect_topics(ac); tl = len(ac); al = round(tl / len(entries)) if entries else 0; ts = len(split_sentences(ac))
    summary = f"{ml}共有 {len(entries)} 天记录"
    wd = min(len(entries), 22)
    if wd >= 15: summary += "，频率很高，习惯优秀"
    elif wd >= 10: summary += "，节奏不错"
    else: summary += "，频率有提升空间"
    summary += f"。主要方向：{'、'.join(t['topic'] for t in topics[:4])}。" if topics else "。"
    if ts > 50: summary += "工作产出丰富。"
    hl = [f"本月 {len(entries)} 天 / {tl} 字，自律性优秀"]
    if len(topics) >= 2: hl.append(f"覆盖面广：{'、'.join(t['topic'] for t in topics[:4])}")
    if al > 80: hl.append("记录详实，深度思考")
    if len(entries) >= 15: hl.append("稳定的复盘习惯")
    pl = []
    if len(entries) < 10: pl.append(f"仅 {len(entries)} 天，频率偏低")
    if al < 40: pl.append("部分记录偏简略")
    if len(topics) <= 2 and len(entries) >= 5: pl.append("方向集中，可拓展边界")
    sg = ["月初制定月度 OKR", "整理本月 3 个经验教训", "回顾时间分配"]
    if len(entries) < 15: sg.insert(2, "设定每日复盘提醒")
    ft = topics[0]["topic"] if topics else "日常工作"
    sp = f"，同时在{topics[1]['topic']}方面也有探索" if len(topics) > 1 else ""
    outlook = f"{ml}即将过去。本月在{ft}方面投入较多{sp}。下月重点关注{'提升记录频率和深度' if pl else '保持节奏找突破点'}。"
    return {"type": "monthly", "periodStart": ms, "periodEnd": me, "highlights": hl, "problems": pl, "suggestions": sg, "summary": summary, "entryCount": len(entries), "outlook": outlook}

def generate_yearly_ai_review(entries, ys, ye, yl):
    ac = "\n".join(e["content"] for e in entries)
    topics = detect_topics(ac); tl = len(ac)
    month_map = {}
    for e in entries:
        m = e["date"][:7]; month_map[m] = month_map.get(m, 0) + 1
    am = len(month_map); ma = max(month_map.items(), key=lambda x: x[1]) if month_map else None
    summary = f"{yl}共有 {len(entries)} 天记录"
    if len(entries) >= 100: summary += "，非常充实"
    elif len(entries) >= 50: summary += "，节奏不错"
    else: summary += "，有提升空间"
    summary += f"，覆盖 {am} 个月。"
    if ma: summary += f"最活跃：{ma[0]}（{ma[1]} 天）。"
    if topics: summary += f"全年方向：{'、'.join(t['topic'] for t in topics[:4])}。"
    hl = [f"全年 {len(entries)} 天 / {tl} 字，宝贵成长档案"]
    if am >= 6: hl.append(f"覆盖 {am} 个月，长期坚持")
    if len(topics) >= 3: hl.append(f"领域多元：{'、'.join(t['topic'] for t in topics[:4])}")
    if len(entries) >= 100: hl.append("超过 100 天，自律性突出")
    pl = []
    if len(entries) < 50: pl.append(f"仅 {len(entries)} 天，频率有提升空间")
    if am < 6: pl.append(f"仅 {am} 个月有记录，存在断档")
    if len(topics) <= 2: pl.append("方向较单一，可拓展新领域")
    sg = ["制定新年 OKR（专业深度/能力广度/影响力）", "提炼 5-10 个年度经验教训", "以今年为基线，明年更高目标"]
    if len(entries) < 100: sg.append("争取明年达 150 天")
    ft = topics[0]["topic"] if topics else ""
    outlook = f"回顾{yl}，{'复盘基础良好' if len(entries) >= 50 else '复盘习惯有成长空间'}。{f'在{ft}领域已有积累' if ft else ''}，新年建议{'巩固优势同时拓展' + topics[1]['topic'] if len(topics) > 1 else '探索新能力领域'}。"
    return {"type": "yearly", "periodStart": ys, "periodEnd": ye, "highlights": hl, "problems": pl, "suggestions": sg, "summary": summary, "entryCount": len(entries), "outlook": outlook}
