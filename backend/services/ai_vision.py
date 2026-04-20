import requests
import json
import re
import base64
from google import genai
from google.genai import types
from config import settings

# Initialize the Gemini Client
_gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Correct Gemini model names for the google-genai SDK
GEMINI_MODELS = [
    "gemini-3.1-flash-lite-preview",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    
]

# Groq vision model (Llama 4 Scout supports image + text)
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

PROMPT = """
You are an AI assistant for a civic issue reporting platform.
Analyze this image and identify any civic problems visible.

Respond ONLY in this exact JSON format with no extra text:
{
  "issue_category": "pothole" or "Garbage" or "Graffiti" or "Damaged_Concrete_Structures" or "Damaged_Electric_Poles" or "Damaged_Road_Signs" or "Dead_Animal_Pollution" or "Fallen_Trees" or "road_crack" or "Traffic Hazard" or "Water Leak" or "Abandoned Vehicle" or "No Issue Found",
  "issue_detail": "short specific description e.g. Large pothole on road surface, fallen tree blocking path, or traffic light out",
  "hazard_level": number from 1 to 10,
  "suggested_action": "short action for municipality e.g. Immediate road repair required",
  "is_valid_report": true or false
}

Hazard level guide:
1-3 = Minor (cosmetic damage, small litter, minor graffiti)
4-6 = Moderate (potholes, broken footpath, garbage pile, abandoned car)
7-9 = Severe (large pothole, road collapse, major water leak, fallen tree, broken traffic signal)
10  = Critical (immediate danger to public safety)

If the image does not show any civic issue, set is_valid_report to false.
"""


def analyze_image(image_url: str, user_description: str = "", image_bytes: bytes = None) -> dict:
    """
    AI analysis pipeline:
     Phase 1 → Local CNN (fast, offline)
     Phase 2 → Gemini Vision (cloud, tries multiple models)
     Phase 3 → Groq Llama 4 Scout Vision (cloud, free tier)
     Phase 4 → Keyword fallback (always works)
    """

    # ── Phase 1: Local CNN ────────────────────────────────────────────────────
    try:
        if image_bytes:
            from ml.predict import predict_damage_from_bytes
            print("🧠 Local CNN: analyzing via bytes...")
            local_result = predict_damage_from_bytes(image_bytes)
        else:
            from ml.predict import predict_damage
            print("🧠 Local CNN: analyzing via URL...")
            local_result = predict_damage(image_url)

        status     = local_result.get("status")
        confidence = local_result.get("confidence", 0.0)
        is_multi   = local_result.get("is_multiclass", True)
        top_class  = local_result.get("top_class")

        if status == "success" and confidence >= 0.75 and is_multi:
            if top_class == "No Issue Found":
                print(f"⚠️ Local CNN: No pothole found ({confidence:.0%}) — seeking second opinion for other categories...")
                # Force escalation to Gemini/Groq
            else:
                is_valid   = True
                hazard_lvl = max(1, min(10, int(confidence * 10)))
                print(f"✅ Local CNN: {top_class} ({confidence:.0%})")
                return {
                    "issue_category":   top_class,
                    "issue_detail":     f"Local AI analysis. Confidence: {round(confidence * 100, 1)}%",
                    "hazard_level":     hazard_lvl if is_valid else 0,
                    "suggested_action": "Review locally assessed hazard" if is_valid else "No action needed",
                    "is_valid_report":  is_valid,
                    "ai_source":        local_result.get("model_used", "Local-CNN"),
                }
        print(f"⚖️ Local CNN confidence insufficient ({confidence:.0%}, multiclass={is_multi}) — escalating.")
    except Exception as e:
        print(f"⚠️ Local CNN error: {e}")

    # Prepare image data once for reuse
    if image_bytes:
        image_data = image_bytes
        mime_type  = "image/jpeg"
    else:
        try:
            r = requests.get(image_url, timeout=15)
            r.raise_for_status()
            image_data = r.content
            mime_type  = r.headers.get("content-type", "image/jpeg")
            if "image" not in mime_type:
                mime_type = "image/jpeg"
        except Exception as e:
            print(f"⚠️ Image download failed: {e}")
            image_data = None

    # Build dynamic prompt with citizen description
    dynamic_prompt = PROMPT
    if user_description and user_description.strip():
        dynamic_prompt += (
            f"\n\n[CITIZEN NOTE]: '{user_description.strip()}'\n"
            "Use this as helpful context. If spam/abusive, set is_valid_report=false."
        )

    # ── Phase 2: Gemini Vision ────────────────────────────────────────────────
    if image_data:
        image_part = types.Part.from_bytes(data=image_data, mime_type=mime_type)
        for model_name in GEMINI_MODELS:
            try:
                print(f"🔁 Gemini [{model_name}]...")
                response = _gemini_client.models.generate_content(
                    model=model_name,
                    contents=[dynamic_prompt, image_part],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                    ),
                )
                raw  = re.sub(r"```json|```", "", response.text.strip()).strip()
                data = json.loads(raw)
                
                # SECOND OPINION RULE: If Gemini says there's no issue, don't trust it immediately. 
                # Escalate to the next model to make sure we don't miss a valid report!
                is_valid = data.get("is_valid_report",  True)
                category = data.get("issue_category", "Unknown")
                
                if category == "No Issue Found" or not is_valid:
                    print(f"⚠️ Gemini [{model_name}] missed the issue. Seeking second opinion...")
                    continue # Force the loop to try the next model (eventually hitting Groq)

                print(f"✅ Gemini [{model_name}]: {category}")
                return {
                    "issue_category":   category,
                    "issue_detail":     data.get("issue_detail",     "No details provided"),
                    "hazard_level":     int(data.get("hazard_level", 5)),
                    "suggested_action": data.get("suggested_action", "Review needed"),
                    "is_valid_report":  is_valid,
                    "ai_source":        f"Gemini/{model_name}",
                }
            except Exception as e:
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    print(f"⚡ {model_name}: quota exhausted — trying next...")
                elif "404" in err or "NOT_FOUND" in err:
                    print(f"🔍 {model_name}: model not found — trying next...")
                else:
                    print(f"❌ {model_name} error: {err[:120]}")
                continue  # always try the next model

    # ── Phase 3: Groq Llama 4 Scout Vision ───────────────────────────────────
    if image_data and settings.GROQ_API_KEY:
        try:
            from groq import Groq
            groq_client = Groq(api_key=settings.GROQ_API_KEY)
            b64_image   = base64.b64encode(image_data).decode("utf-8")
            data_url    = f"data:{mime_type};base64,{b64_image}"

            print(f"🔁 Groq [{GROQ_MODEL}]...")
            chat = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text",      "text": dynamic_prompt},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    }
                ],
                temperature=0.1,
                max_tokens=512,
                response_format={"type": "json_object"},
            )
            raw  = re.sub(r"```json|```", "", chat.choices[0].message.content.strip()).strip()
            data = json.loads(raw)
            print(f"✅ Groq: {data.get('issue_category')}")
            return {
                "issue_category":   data.get("issue_category",   "Unknown"),
                "issue_detail":     data.get("issue_detail",     "No details provided"),
                "hazard_level":     int(data.get("hazard_level", 5)),
                "suggested_action": data.get("suggested_action", "Review needed"),
                "is_valid_report":  data.get("is_valid_report",  True),
                "ai_source":        f"Groq/{GROQ_MODEL}",
            }
        except Exception as e:
            print(f"❌ Groq error: {str(e)[:120]}")

    # ── Phase 4: Keyword Fallback (always works) ──────────────────────────────
    print("🛡️ All AI models failed — using keyword fallback.")
    return _keyword_fallback(user_description)


def _keyword_fallback(description: str) -> dict:
    """Rule-based classification from citizen's text. Never blocks a valid report."""
    d = (description or "").lower()

    rules = [
        (["pothole", "pot hole", "road damage", "crack", "road break", "road collapse", "sinkhole"],
         "Road Damage",          7, "Immediate road repair required"),
        (["water", "flood", "leak", "pipe", "overflow", "drainage", "waterlog", "sewage"],
         "Water Leak",           6, "Water/drainage inspection required"),
        (["garbage", "waste", "trash", "litter", "dumping", "dirty", "filth", "smell"],
         "Garbage",              4, "Garbage collection and cleanup needed"),
        (["light", "street light", "lamp", "dark", "no light", "streetlight"],
         "Street Lighting",      5, "Streetlight repair required"),
        (["tree", "fallen", "branch", "debris", "blocked road"],
         "Fallen Trees & Debris",6, "Tree/debris removal required"),
        (["traffic", "signal", "sign", "accident", "road block", "congestion"],
         "Traffic Hazard",       7, "Traffic management intervention needed"),
        (["graffiti", "vandal", "spray", "paint"],
         "Graffiti / Vandalism", 3, "Surface cleaning/repainting needed"),
        (["vehicle", "car", "abandoned", "parked illegally"],
         "Abandoned Vehicle",    4, "Vehicle removal required"),
        (["broken", "wall", "bridge", "footpath", "sidewalk", "railing", "fence"],
         "Broken Infrastructure",6, "Infrastructure repair required"),
    ]

    for keywords, category, hazard, action in rules:
        if any(kw in d for kw in keywords):
            return {
                "issue_category":   category,
                "issue_detail":     f"Classified from citizen note: \"{description[:120]}\"",
                "hazard_level":     hazard,
                "suggested_action": action,
                "is_valid_report":  True,
                "ai_source":        "keyword-fallback",
            }

    return {
        "issue_category":   "Broken Infrastructure",
        "issue_detail":     f"Citizen reported: \"{description[:120]}\"" if description else "Civic issue — AI unavailable.",
        "hazard_level":     5,
        "suggested_action": "Manual inspection required",
        "is_valid_report":  True,
        "ai_source":        "generic-fallback",
    }
