from groq import Groq
from dotenv import load_dotenv
import os
import json

# Load .env file
load_dotenv()

# Get API key from environment variable
api_key = os.getenv("GROQ_API_KEY")

# Create Groq client
client = Groq(api_key=api_key)


def analyze_resume(resume_text, user_goal):

    prompt = f"""
You are a senior software engineer and hiring manager.

Evaluate the resume based on the user's goal.

User Goal: "{user_goal}"

Resume:
{resume_text}

Strict Rules:
- Extract only relevant skills for this goal
- Remove irrelevant tools
- Generate roadmap only for missing fields
- Make output different based on goal
- Suggest real companies hiring for this role with their careers page link
- Calculate a resume score from 0 to 100 based on how well the resume matches the goal
- Give a short feedback about the score

Return only JSON:

{{
    "score": 75,
    "score_feedback": "Good resume but missing some key skills",
    "skills": [],
    "missing_skills": [],
    "roadmap": [],
    "interview_questions": [],
    "companies": [
        {{
            "name": "Company Name",
            "role": "Job Role",
            "apply_link": "https://careers.example.com"
        }}
    ]
}}
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            temperature=0.3,
            messages=[
                {
                    "role": "system",
                    "content": "You are a strict hiring manager. Return only JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        content = response.choices[0].message.content.strip()

        start = content.find("{")
        end = content.rfind("}") + 1

        result = json.loads(content[start:end])

        return result

    except Exception as e:
        return {
            "score": 0,
            "score_feedback": "Error calculating score",
            "skills": [],
            "missing_skills": [],
            "roadmap": [],
            "interview_questions": [],
            "companies": [],
            "error": str(e)
        }