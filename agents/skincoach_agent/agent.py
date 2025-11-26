import os
from dotenv import load_dotenv
from typing import Optional
from google.genai import types
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.agent_tool import AgentTool
import json
from typing import Tuple, List, Dict

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
    description="Selects suitable products and ingredients using the product tools.",
    instruction=(
        "You specialize in skincare ingredient analysis and product selection.\n"
        "You MUST use the `suggest_products` tool to fetch real product options from the catalog.\n"
        "When a product name is given, you MAY use `get_cheapest_product` to retrieve the closest matching product entry.\n\n"

        "IMPORTANT:\n"
        "- Products in this catalog only include: name, product_type, category, ingredients.\n"
        "- DO NOT invent price, vendor, or URL. They do not exist.\n"
        "- DO NOT fabricate unavailable fields.\n\n"

        "When generating routines, ALWAYS respond ONLY in the following strict JSON format:\n"
        "{\n"
        '  \"am_steps\": [\n'
        '    {\n'
        '      \"step\": \"cleanser\",        // one-word category\n'
        '      \"description\": \"Short explanation of why this step is needed.\",\n'
        '      \"products\": [               // list of product objects from the tools\n'
        '        {\"name\": \"...\", \"category\": \"...\", \"ingredients\": \"...\"}\n'
        '      ]\n'
        '    }\n'
        '  ],\n'
        '  \"pm_steps\": [\n'
        '    {\n'
        '      \"step\": \"moisturizer\",\n'
        '      \"description\": \"Short explanation...\",\n'
        '      \"products\": [\n'
        '        {\"name\": \"...\", \"category\": \"...\", \"ingredients\": \"...\"}\n'
        '      ]\n'
        '    }\n'
        '  ],\n'
        '  \"notes\": \"Precautions, patch-test advice, dermatologist note, etc.\"\n'
        "}\n\n"

        "STRICT RULES:\n"
        "- No markdown.\n"
        "- No backticks (```).\n"
        "- No headings.\n"
        "- Do NOT add text before or after the JSON.\n"
        "- Only output valid JSON.\n"
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
    description="SkinCoach: a personal skincare companion that plans routines, suggests products, and explains ingredient choices.",
    instruction=(
        "You are SkinCoach, an AI skincare companion.\n\n"
        "You have access to:\n"
        "- routine_agent: reasons about which skincare steps (cleanser, moisturizer, sunscreen, serum, etc.) are appropriate.\n"
        "- ingredient_agent: calls product tools and returns a structured JSON skincare routine with AM/PM steps and real products from the catalog.\n"
        "- diary_agent: summarizes the user's diary so you can adapt the routine over time.\n"
        "- suggest_products / get_cheapest_product: access the product catalog directly.\n\n"

        "CATALOG LIMITATIONS:\n"
        "- Each product ONLY has: name, product_type, category, ingredients.\n"
        "- DO NOT mention or invent price, vendor, URLs, or availability.\n\n"

        "BEHAVIOR MODES:\n"
        "A) ROUTINE GENERATION REQUESTS (e.g. user asks for a routine, regimen, AM/PM steps, or the frontend explicitly asks for JSON):\n"
        "- First, understand the skin type, concerns, and context (profile + diary summary if available).\n"
        "- Optionally use routine_agent to reason about which steps should be in AM and PM.\n"
        "- Then call ingredient_agent to obtain the FINAL JSON routine. ingredient_agent will already format the response as:\n"
        "  {\n"
        "    \"am_steps\": [...],\n"
        "    \"pm_steps\": [...],\n"
        "    \"notes\": \"...\"\n"
        "  }\n"
        "- For these routine-generation requests, your FINAL reply MUST be exactly that JSON object and nothing else.\n"
        "- Do NOT wrap it in markdown or add any explanation outside the JSON.\n\n"

        "B) EXPLANATION / EDUCATION / WHY QUESTIONS (e.g. \"why this product?\", \"why this step?\", \"explain niacinamide\", \"what does this routine do?\"):\n"
        "- Answer in clear, conversational natural language, NOT JSON.\n"
        "- You may call ingredient_agent or the product tools to ground your explanation in real products and ingredients, but you should summarize the result for the user.\n"
        "- When explaining a specific product choice, focus on:\n"
        "  - its key ingredients,\n"
        "  - how those ingredients help with the user's skin type and concerns,\n"
        "  - any basic precautions (patch test, avoid over-exfoliation, etc.).\n\n"

        "GENERAL RULES:\n"
        "- Never give medical diagnoses or claim to cure diseases. For severe, painful, or persistent issues, advise the user to consult a dermatologist.\n"
        "- Prefer simple, practical routines over complicated multi-step regimens.\n"
        "- Be kind, encouraging, and non-judgmental in tone.\n"
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


async def generate_routine_for_user(user_id: str, session_id: str, extra_reason: str | None = None) -> Tuple[List[Dict], List[Dict], str]:
    """
    Calls SkinCoach to generate a routine JSON, then returns:
    (am_steps, pm_steps, notes_text)
    where am_steps/pm_steps are lists of {"step": "...", "product_name": "..."}.
    """

    reason_part = f"\nUser update reason: {extra_reason}\n" if extra_reason else ""

    message = (
        "Generate a skincare routine for this user and respond ONLY with JSON in the following format:\n"
        "{\n"
        "  \"am_steps\": [\n"
        "    {\n"
        "      \"step\": \"cleanser\", \n"
        "      \"description\": \"...\",\n"
        "      \"products\": [ {\"name\": \"...\", \"category\": \"...\", \"ingredients\": \"...\"} ]\n"
        "    }\n"
        "  ],\n"
        "  \"pm_steps\": [\n"
        "    {\n"
        "      \"step\": \"moisturizer\",\n"
        "      \"description\": \"...\",\n"
        "      \"products\": [ {\"name\": \"...\", \"category\": \"...\", \"ingredients\": \"...\"} ]\n"
        "    }\n"
        "  ],\n"
        "  \"notes\": \"short note about precautions / changes / reasons\"\n"
        "}\n"
        "Do not include any fields other than step, description, products(name, category, ingredients), and notes."
        f"{reason_part}"
    )

    raw = await run_skincoach(
        message=message,
        session_id=session_id,
        user_id=user_id,
        user_context="",
    )

    data = json.loads(raw)

    def to_simple_steps(raw_steps):
        simple: List[Dict] = []
        for s in raw_steps or []:
            step_name = s.get("step") or ""
            products = s.get("products") or []
            product_name = products[0].get("name") if products else ""
            simple.append(
                {
                    "step": step_name,
                    "product_name": product_name,
                }
            )
        return simple

    am = to_simple_steps(data.get("am_steps", []))
    pm = to_simple_steps(data.get("pm_steps", []))
    notes = data.get("notes", "")

    return am, pm, notes

