# ============================================================
# TROSV AI service - stub FAKE_MODE dung AI_CONTRACT.md.
#
# Trang thai: stub demo. Moi endpoint tra du lieu gia hop ly DUNG SHAPE
# hop contract khi FAKE_MODE=true, khong can LLM key. Khi FAKE_MODE=false,
# moi endpoint tra 503 (backend se chuyen thanh 503 "Dich vu AI tam thoi
# khong kha dung." cho frontend) - call LLM that se bu sung sau theo
# AI_CONTRACT.md §2.
#
# Chay: docker compose --profile ai up -d   (hoac)
#       pip install -r requirements.txt && uvicorn main:app --port 8001
# Thu:  curl -X POST localhost:8001/price-advice -H 'Content-Type: application/json' \
#         -d '{"listing":{"type":"room","price":2500000,"area_m2":22.5,"ward":"Thu Duc","amenities":[]},"stats":{"count":12,"min":1800000,"median":2300000,"max":3200000}}'
# ============================================================

import os
import random
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

FAKE_MODE = os.getenv("FAKE_MODE", "true").lower() != "false"

app = FastAPI(title="TROSV AI service", version="0.1.0")


class BaseReq(BaseModel):
    model_config = {"extra": "ignore"}


class RoommatesReq(BaseReq):
    requester: dict[str, Any]
    # Hop contract, cac truong khong phai bat buoc co the la null HOAC thieu.
    candidates: Optional[list[dict[str, Any]]] = []
    limit: int = 5


class PriceAdviceReq(BaseReq):
    listing: dict[str, Any]
    stats: dict[str, Any]


class AreasReq(BaseReq):
    preferences: dict[str, Any]
    areas: Optional[list[dict[str, Any]]] = []
    limit: int = 3


class ChatReq(BaseReq):
    message: str
    history: Optional[list[dict[str, Any]]] = []
    listing: Optional[dict[str, Any]] = None


class DescriptionReq(BaseReq):
    title: str
    type: Optional[str] = None
    price: Optional[int] = None
    area_m2: Optional[float] = None
    address: Optional[str] = None
    ward: Optional[str] = None
    # Backend co the gui null thay vi bo qua (contract cho phep ca hai).
    amenities: Optional[list[str]] = []


def guard_fake() -> None:
    """Non-2xx neu FAKE_MODE tat - backend doi thanh 503 theo contract."""
    if not FAKE_MODE:
        raise HTTPException(status_code=503, detail="Real LLM not implemented in stub")


# --------------------------------------------------------------- health
@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ------------------------------------------------------------ roommates
def _score_candidate(req: RoommatesReq, cand: dict[str, Any]) -> tuple[int, str]:
    r = req.requester
    shared = sorted(set(r.get("interests") or []) & set(cand.get("interests") or []))
    overlap = max(0, min(r.get("budget_max", 0), cand.get("budget_max", 0)) - max(r.get("budget_min", 0), cand.get("budget_min", 0)))
    score = 40 + 12 * len(shared) + (20 if overlap > 0 else 0) + (8 if r.get("cleanliness") == cand.get("cleanliness") else 0) + (8 if r.get("smoking") == cand.get("smoking") else 0)
    bits = []
    if shared:
        bits.append("Cung thich " + ", ".join(shared))
    bits.append("ngan sach giao nhau" if overlap > 0 else "ngan sach lech nhau")
    if r.get("personality") == cand.get("personality"):
        bits.append("tinh cach tuong dong")
    reason: str = (", ".join(bits) + ".").capitalize()
    return min(score, 100), reason


@app.post("/roommates")
def roommates(req: RoommatesReq) -> dict[str, Any]:
    guard_fake()
    scored = sorted(
        ((_score_candidate(req, c), c["id"]) for c in (req.candidates or [])),
        key=lambda pair: (-pair[0][0], pair[1]),
    )
    return {
        "results": [
            {"id": cid, "score": sc, "reason": why}
            for (sc, why), cid in scored[: max(1, req.limit)]
        ]
    }


# --------------------------------------------------------- price-advice
@app.post("/price-advice")
def price_advice(req: PriceAdviceReq) -> dict[str, Any]:
    guard_fake()
    price = int(req.listing.get("price") or 0)
    median = int(req.stats.get("median") or 0)
    if median <= 0:
        raise HTTPException(status_code=422, detail="stats.median thieu")
    if price > median * 1.1:
        verdict = "high"
    elif price < median * 0.9:
        verdict = "low"
    else:
        verdict = "fair"
    fair_min = int(req.stats.get("min") or median * 0.9)
    fair_max = int(req.stats.get("max") or median * 1.1)
    compare = "cao hon" if verdict == "high" else ("thap hon" if verdict == "low" else "tuong duong")
    return {
        "verdict": verdict,
        "fair_min": fair_min,
        "fair_max": fair_max,
        "tips": [
            "Hoi ve gia cho thue dai han tu 6 thang",
            "So sanh voi cac phong co dien tich tuong tu trong khu vuc",
            "Kiem tra tien dien, nuoc co tinh theo dong ho hay khoan cu",
        ],
        "message": (
            f"Chao anh/chi, em thay muc gia {price:,} vay {compare} gia trung binh "
            f" khu vuc (khoang {median:,}). Anh/chi co the xem xet chinh lai mot chut duoc khong ah?"
        ).replace(" ,", ","),
    }


# ---------------------------------------------------------------- areas
@app.post("/areas")
def areas(req: AreasReq) -> dict[str, Any]:
    guard_fake()
    prefs = req.preferences
    budget_max = int(prefs.get("budget_max") or 0)
    budget_min = int(prefs.get("budget_min") or 0)
    priorities = set(prefs.get("priorities") or [])

    def score(area: dict[str, Any]) -> tuple[int, str]:
        s = 50
        avg = int(area.get("avg_price") or 0)
        if budget_max and budget_min:
            s += 20 if budget_min <= avg <= budget_max else (-10 if avg > budget_max else 0)
        if "cheap" in priorities:
            s += 15 if avg and avg <= budget_max else 0
        dist = area.get("distance_to_school_km")
        if "near_school" in priorities and dist is not None:
            s += 15 if dist <= 3 else 0
        if "well_rated" in priorities and area.get("avg_rating"):
            s += 10 if float(area["avg_rating"]) >= 4 else 0
        if "many_options" in priorities:
            s += 10 if int(area.get("listings_count") or 0) >= 20 else 0
        bits = [f"Gia trung binh {avg:,}" if avg else "Chua co du lieu gia"]
        if area.get("avg_rating"):
            bits.append(f"diem trung binh {area['avg_rating']}")
        if area.get("distance_to_school_km") is not None:
            bits.append(f"cach truong {area['distance_to_school_km']} km")
        bits.append(f"{area.get('listings_count', 0)} tin dang")
        return min(s, 100), ("; ".join(bits) + ".").capitalize()

    ranked = sorted(((score(a), a["ward_id"]) for a in (req.areas or [])), key=lambda p: (-p[0][0], p[1]))
    return {
        "results": [
            {"ward_id": wid, "reason": why}
            for (sc, why), wid in ranked[: max(1, req.limit)]
        ]
    }


# ----------------------------------------------------------------- chat
_DEPOSIT_KW = ("coc", "deposit", "hop dong", "contract", "phap ly")
_PRICE_KW = ("gia", "price", "bao nhieu", "re", "muc gia")


@app.post("/chat")
def chat(req: ChatReq) -> dict[str, Any]:
    guard_fake()
    msg = req.message.lower()
    tail = " Thong tin mang tinh tham khao, khong thay the tu van phap ly."
    listing = req.listing
    if any(k in msg for k in _DEPOSIT_KW):
        reply = (
            "Thong thuong tien coc bang 1 den 2 thang tien phong, va can ky hop dong "
            "ghi ro tien coc, gia thue, ky han va dieu khoan hoan tra. Truoc khi ky, "
            "hay kiem tra giay to chu nha, doc ky dieu khoan ve quan ly va sua chua."
        )
        return {"reply": reply + tail}
    if any(k in msg for k in _PRICE_KW):
        if listing:
            reply = (
                f"Tin \u201c{listing.get('title')}\u201d co gia {int(listing.get('price') or 0):,} "
                f"cho {listing.get('area_m2')} m2 tai {listing.get('ward')}. Ban co the dung "
                "tinh nang Tu van gia AI ngay trang chi tiet phong de so sanh voi cac tin tuong tu."
            )
        else:
            reply = (
                "Gia phong tro khu vuc thuoc dai hoc thuong tu 1,5 den 4 trieu mot thang "
                "tuy dien tich va tien ich. Ban vao trang Ban do hoac Tim phong, loc theo "
                "khoang gia va khoang cach toi truong de thay muc pho bien quanh ban."
            )
        return {"reply": reply}
    if listing:
        return {
            "reply": (
                f"Ve tin \u201c{listing.get('title')}\u201d tai {listing.get('address')}: "
                "ban co the xem anh, tien ich va danh gia tren trang chi tiet. Neu thich, "
                "bam Nhan tin de noi chuyen truc tiep voi chu nha."
            )
        }
    return {
        "reply": (
            "Minh co the giu ve tim phong, gia ca, tien coc va hop dong thue tro. "
            "Ban muon hoi dieu gi truoc?"
        )
    }


# ---------------------------------------------------------- description
@app.post("/description")
def description(req: DescriptionReq) -> dict[str, Any]:
    guard_fake()
    type_label = {"room": "Phong tro", "apartment": "Can ho", "house": "Nha nguyen can"}.get(req.type or "", "Phong tro")
    parts: list[str] = [f"{type_label} \u201c{req.title}\u201d dang cho thue"]
    if req.area_m2:
        parts.append(f"dien tich {req.area_m2:g} m2")
    if req.ward or req.address:
        parts.append("vi tri " + ", ".join(x for x in [req.address, req.ward] if x))
    if req.amenities:
        parts.append("co san " + ", ".join(req.amenities))
    if req.price:
        parts.append(f"gia thue {int(req.price):,} dong mot thang")
    body = ", ".join(parts) + ". Khong gian thoang, phu hop sinh vien hoac nguoi di lam muon an toan, tien nghi gan nha. Lien he truc tiep qua tin nhan trong trang de xem phong va trao doi chi tiet."
    words = body.split()
    return {"description": " ".join(words[:130])}
