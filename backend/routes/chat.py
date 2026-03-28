"""Chat route — Market ChatGPT Next Gen"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from agents.market_chat import stream_chat_response

router = APIRouter()


class ChatRequest(BaseModel):
    messages: list[dict]
    portfolio: dict | None = None


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    async def generate():
        async for chunk in stream_chat_response(req.messages, req.portfolio):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )