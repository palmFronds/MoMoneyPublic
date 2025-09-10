from fastapi import APIRouter, Request, Depends, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from db import get_session
from models.user import User
from sqlmodel import select
from openai import OpenAI
from dotenv import load_dotenv
import os
import traceback

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
router = APIRouter()

chat_log = []

@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()

            if data == "__clear__":
                chat_log.clear()
                await websocket.send_json(chat_log)
            else:
                chat_log.append({"role": "user", "content": data})
                try:
                    messages = [{"role": "system", "content": "You are Mo AI, a friendly investing assistant for students and beginners. Be concise, clear, and avoid financial jargon unless the user asks for advanced insights. Never give financial advice; only offer educational explanations."}]
                    for entry in chat_log:
                        role = "assistant" if entry["role"] == "ai" else entry["role"]
                        messages.append({"role": role, "content": entry["content"]})

                    response = client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=messages
                    )
                    ai_reply = response.choices[0].message.content.strip()
                except Exception as e:
                    traceback.print_exc()
                    print("OpenAI API error:", e)
                    ai_reply = "Sorry, the assistant ran into an error. Please try again later."


                chat_log.append({"role": "ai", "content": ai_reply})
                await websocket.send_json(chat_log)
    except WebSocketDisconnect:
        print("Disconnected")
