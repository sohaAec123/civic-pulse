from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


def calculate_priority(data):
    people = int(data.get("people_affected", 0))

    if people >= 1000:
        people_score = 4
    elif people >= 500:
        people_score = 3
    elif people >= 100:
        people_score = 2
    else:
        people_score = 1

    frequency = str(data.get("frequency", "")).lower()

    if frequency == "daily":
        frequency_score = 4
    elif frequency == "weekly":
        frequency_score = 3
    elif frequency == "occasionally":
        frequency_score = 2
    else:
        frequency_score = 1

    severity = str(data.get("severity", "")).lower()

    if severity == "high":
        severity_score = 4
    elif severity == "medium":
        severity_score = 3
    else:
        severity_score = 1

    alternative = str(data.get("alternative_available", "")).lower()

    if alternative == "no":
        alternative_score = 3
    else:
        alternative_score = 1

    score = (
        people_score
        + frequency_score
        + severity_score
        + alternative_score
    )

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


@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/style.css")
def style():
    return send_from_directory(".", "style.css")


@app.route("/script.js")
def script():
    return send_from_directory(".", "script.js")


@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "message": "CivicPulse backend is running"
    })


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

    for field in required_fields:
        if field not in data:
            return jsonify({
                "success": False,
                "error": "Missing field: " + field
            }), 400

    try:
        result = calculate_priority(data)

        return jsonify({
            "success": True,
            "problem": data.get("problem"),
            "category": data.get("category"),
            "score": result["score"],
            "priority": result["priority"],
            "key_factors": result["key_factors"],
            "ai_explanation": (
                "CivicPulse calculated this issue as "
                + result["priority"]
                + " priority with a score of "
                + str(result["score"])
                + " out of 15. The score considers "
                + "people affected, frequency, severity, "
                + "and availability of alternatives."
            )
        })
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": "People affected must be a number."
        }), 400


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
