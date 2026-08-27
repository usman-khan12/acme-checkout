"""Summarize open support threads with OpenAI for the morning digest."""

import os

import openai
import requests

openai.api_key = os.environ["OPENAI_API_KEY"]

SUPPORT_API = "https://support.internal.acme.dev"


def summarize_thread(messages: list[dict]) -> str:
    transcript = "\n".join(f"{m['author']}: {m['body']}" for m in messages)
    completion = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Summarize this support thread in two sentences.",
            },
            {"role": "user", "content": transcript},
        ],
        max_tokens=120,
    )
    return completion.choices[0].message.content


def embed_for_search(text: str) -> list[float]:
    result = openai.Embedding.create(
        model="text-embedding-ada-002",
        input=text,
    )
    return result["data"][0]["embedding"]


def open_threads() -> list[dict]:
    resp = requests.get(f"{SUPPORT_API}/threads?state=open", timeout=30)
    resp.raise_for_status()
    return resp.json()


def build_digest() -> str:
    lines = []
    for thread in open_threads():
        summary = summarize_thread(thread["messages"])
        lines.append(f"- [{thread['id']}] {summary}")
    return "\n".join(lines)
