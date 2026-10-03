from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
import os

app = Flask(__name__)
CORS(app)

# Load .env file
load_dotenv()

# Gemini API client
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def calculate_priority(data):

    # People affected score
    people = int(data.get("people_affected", 0))

    if people >= 1000:
        people_score = 4
    elif people >= 500:
        people_score = 3
    elif people >= 100:
        people_score = 2
    else:
        people_score = 1

    # Frequency score
    frequency_scores = {
        "daily": 4,
        "weekly": 3,
        "occasionally": 2,
        "rarely": 1
    }

    frequency = frequency_scores.get(
        str(data.get("frequency", "")).lower(),
        1
    )

    # Severity score
    severity_scores = {
        "high": 4,
        "medium": 3,
        "low": 1
    }

    severity = severity_scores.get(
        str(data.get("severity", "")).lower(),
        1
    )

    # Alternative availability score
    alternative_scores = {
        "no": 3,
        "yes": 1
    }

    alternative = alternative_scores.get(
        str(data.get("alternative_available", "")).lower(),
        1
    )

    # Final priority score
    score = people_score + frequency + severity + alternative

    # Priority level
    if score >= 13:
        priority = "Critical"
    elif score >= 10:
        priority = "High"
    elif score >= 7:
        priority = "Medium"
    else:
        priority = "Low"

    return {
        "score": score,
        "priority": priority,
        "key_factors": {
            "people_affected": people,
            "frequency": data.get("frequency"),
            "severity": data.get("severity"),
            "alternative_available": data.get("alternative_available")
        }
    }


def generate_ai_explanation(data, result):

    prompt = f"""
You are CivicPulse AI, an assistant for understanding community problems.

A citizen reported this problem:

Problem: {data.get("problem")}
Category: {data.get("category")}
People affected: {result["key_factors"]["people_affected"]}
Frequency: {result["key_factors"]["frequency"]}
Severity: {result["key_factors"]["severity"]}
Alternative available: {result["key_factors"]["alternative_available"]}

The CivicPulse transparent scoring system calculated:

Score: {result["score"]}/15
Priority: {result["priority"]}

Your job is NOT to change the score or priority.

Explain clearly:
1. Why this issue received this priority.
2. What factors make the issue important.
3. What practical action could be considered.

Keep the response concise, human-friendly and suitable for a civic dashboard.

Do not invent statistics or facts that were not provided.
"""

    try:

        response = client.models.generate_content(
            model="gemma-4-31b-it",
            contents=prompt
        )

        return response.text

    except Exception as e:

        print("Gemma error:", e)

        return (
            "AI explanation is currently unavailable. "
            "The priority score was calculated successfully "
            "using the CivicPulse scoring system."
        )


@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/api/prioritize", methods=["POST"])
def prioritize():

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "error": "No data received"
        }), 400

    required_fields = [
        "problem",
        "category",
        "people_affected",
        "frequency",
        "severity",
        "alternative_available"
    ]

    missing_fields = [
        field
        for field in required_fields
        if field not in data
    ]

    if missing_fields:

        return jsonify({
            "success": False,
            "error": "Missing required fields",
            "missing_fields": missing_fields
        }), 400

    try:

        # Calculate transparent priority score
        result = calculate_priority(data)

        # Ask Gemma to explain the result
        ai_explanation = generate_ai_explanation(
            data,
            result
        )

        return jsonify({

            "success": True,

            "problem": data.get("problem"),

            "category": data.get("category"),

            "score": result["score"],

            "priority": result["priority"],

            "key_factors": result["key_factors"],

            "ai_explanation": ai_explanation

        })

    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "error": "Invalid value for people_affected"
        }), 400


if __name__ == "__main__":
    app.run(debug=True)