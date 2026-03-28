"""
Shared Groq client — free tier, fast inference.
Model: llama-3.3-70b-versatile (best free model for reasoning)
Fallback: llama-3.1-8b-instant (faster, smaller)

"""

import os
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Primary: best reasoning, still very fast (~280 tok/s)
MODEL_SMART = "llama-3.3-70b-versatile"
# Fallback: use for quick completions where speed matters more
MODEL_FAST  = "llama-3.1-8b-instant"

def get_client() -> Groq:
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY not set. "
            "Get a free key at https://console.groq.com and add it to backend/.env"
        )
    return Groq(api_key=GROQ_API_KEY)