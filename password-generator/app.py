
import secrets
import string

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/"


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def generate_password():
    data = request.get_json(silent=True) or {}

    length = data.get("length", 16)

    if isinstance(length, bool) or not isinstance(length, int):
        return jsonify({"error": "Length must be a whole number."}), 400

    if not 8 <= length <= 64:
        return jsonify({"error": "Length must be between 8 and 64."}), 400

    options = {
        "lowercase": string.ascii_lowercase,
        "uppercase": string.ascii_uppercase,
        "numbers": string.digits,
        "symbols": SYMBOLS,
    }

    enabled = []

    for name, characters in options.items():
        value = data.get(name, name == "lowercase")

        if not isinstance(value, bool):
            return jsonify({"error": f"{name} must be true or false."}), 400

        if value:
            enabled.append(characters)

    if not enabled:
        return jsonify({
            "error": "Select at least one character type."
        }), 400

    if length < len(enabled):
        return jsonify({
            "error": "Password length is too short for the selected options."
        }), 400

    # Guarantee at least one character from each selected category.
    password_chars = [
        secrets.choice(characters)
        for characters in enabled
    ]

    # Fill the remaining positions using the combined character pool.
    pool = "".join(enabled)

    password_chars.extend(
        secrets.choice(pool)
        for _ in range(length - len(password_chars))
    )

    # Securely shuffle the result so required categories are not predictable.
    for index in range(len(password_chars) - 1, 0, -1):
        swap_index = secrets.randbelow(index + 1)
        password_chars[index], password_chars[swap_index] = (
            password_chars[swap_index],
            password_chars[index],
        )

    password = "".join(password_chars)

    return jsonify({
        "password": password,
        "length": len(password),
        "character_types": len(enabled),
    })


if __name__ == "__main__":
    app.run(debug=True)
