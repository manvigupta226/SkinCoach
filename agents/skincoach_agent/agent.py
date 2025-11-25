import os
from dotenv import load_dotenv
from typing import Optional
from google.genai import types
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.agent_tool import AgentTool

from .tools import suggest_products, get_cheapest_product

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

GEMINI_MODEL = "gemini-2.5-flash"
APP_NAME = "skincoach_app"

# --- Sub-agents ---

routine_agent = LlmAgent(
    model=GEMINI_MODEL,
    name="routine_agent",
    description="Designs simple AM/PM skincare routines.",
    instruction=(
        "You are a dermatologist-style educator but NOT a doctor. "
        "Given a user's skin profile (skin type, concerns, sensitivities, climate, budget) "
        "and recent diary notes, design a gentle AM and PM skincare routine.\n\n"
        "Rules:\n"
        "- ALWAYS include cleanser + moisturizer + sunscreen (AM).\n"
        "- Optionally include 1 active (like niacinamide or BHA), but introduce slowly.\n"
        "- Avoid medical claims. Do not diagnose conditions. Suggest seeing a dermatologist "
        "for persistent or severe issues.\n"
        "- Prefer minimal steps, labelled clearly as AM and PM."
    ),
)


ingredient_agent = LlmAgent(
    model=GEMINI_MODEL,
    name="ingredient_agent",
    description="Explains ingredient choices and uses product tools.",
    instruction=(
        "You specialize in skincare ingredients. Use the available tools to look up candidate "
        "products and their prices. Explain briefly WHY each suggested product matches the user's "
        "skin type and concern. Stay strictly in cosmetic / self-care territory, not medical."
    ),
    tools=[suggest_products, get_cheapest_product],
)


diary_agent = LlmAgent(
    model=GEMINI_MODEL,
    name="diary_agent",
    description="Reads diary entries and suggests adjustments.",
    instruction=(
        "You analyze the user's last week of skincare diary (ratings, issues, notes) and give a "
        "short reflection: what is working, what might be irritating, and ONE or TWO tweaks to try. "
        "Never change more than 1 active ingredient at once."
    ),
)


# --- Root SkinCoach agent ---

root_agent = LlmAgent(
    model=GEMINI_MODEL,
    name="skincoach_root",
    description="SkinCoach: a personal skincare companion that plans routines and suggests products.",
    instruction=(
        "You are SkinCoach, an AI skincare companion. Your job is to:\n"
        "1) Understand the user's skin profile and concerns.\n"
        "2) Use the routine_agent to draft or refine routines.\n"
        "3) Use the ingredient_agent (and its tools) to attach concrete product suggestions.\n"
        "4) Use the diary_agent when the user talks about reactions over time.\n\n"
        "Guidelines:\n"
        "- Never give medical advice or diagnose skin diseases. For anything serious, suggest seeing a dermatologist.\n"
        "- Prefer gentle, barrier-supporting routines.\n"
        "- When recommending a specific product, ALWAYS also ask ingredient_agent/get_cheapest_product "
        "to find where it's cheapest, and mention vendor + approximate price.\n"
        "- Keep responses structured with headings and bullet points where helpful."
    ),
    tools=[
        AgentTool(agent=routine_agent),
        AgentTool(agent=ingredient_agent),
        AgentTool(agent=diary_agent),
        get_cheapest_product,  
        suggest_products,
    ],
)

# ADK Runner & session service used by FastAPI
session_service = InMemorySessionService()
runner = Runner(
    agent=root_agent,
    app_name=APP_NAME,
    session_service=session_service,
)


async def run_skincoach(
    message: str,
    user_context: str,
    user_id: str,
    session_id: str,
) -> str:
    """
    Helper for FastAPI: run SkinCoach with extra user_context stitched in.

    We explicitly create the session (if it doesn't already exist),
    then call Runner.run_async with that session_id.
    """
    full_prompt = (
        "Here is the current user context (profile + last diary entries):\n"
        f"{user_context}\n\n"
        "Now the user says:\n"
        f"{message}"
    )
    content = types.Content(role="user", parts=[types.Part(text=full_prompt)])

    # 1) Ensure the session exists for this (app_name, user_id, session_id)
    try:
        await session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )
    except Exception as e:
        # Most likely: session already exists. That's fine – we just continue.
        print(f"[SkinCoach] create_session skipped or failed (probably already exists): {e}")

    # 2) Run the agent within that session
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=content,
    ):
        if event.is_final_response():
            # Return the text of the final response
            return event.content.parts[0].text

    return "Sorry, I couldn't generate a response this time."
