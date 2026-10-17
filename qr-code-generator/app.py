
from io import BytesIO

import qrcode
from flask import Flask, jsonify, render_template, request, send_file

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def generate_qr():
    data = request.get_json(silent=True) or {}

    content = data.get("content", "").strip()
    foreground = data.get("foreground", "#111827")
    background = data.get("background", "#FFFFFF")

    if not content:
        return jsonify({"error": "Please enter text or a URL."}), 400

    if len(content) > 2000:
        return jsonify({"error": "Content must be 2,000 characters or fewer."}), 400

    for color in (foreground, background):
        if (
            not isinstance(color, str)
            or len(color) != 7
            or not color.startswith("#")
            or any(c not in "0123456789abcdefABCDEF" for c in color[1:])
        ):
            return jsonify({"error": "Choose valid colors."}), 400

    if foreground.upper() == background.upper():
        return jsonify({
            "error": "Foreground and background colors must be different."
        }), 400

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )

    qr.add_data(content)
    qr.make(fit=True)

    image = qr.make_image(
        fill_color=foreground,
        back_color=background,
    ).convert("RGB")

    image_buffer = BytesIO()
    image.save(image_buffer, format="PNG")
    image_buffer.seek(0)

    return send_file(
        image_buffer,
        mimetype="image/png",
        as_attachment=False,
        download_name="qr-code.png",
    )


if __name__ == "__main__":
    app.run(debug=True)
