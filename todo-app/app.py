
from pathlib import Path
import sqlite3

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "tasks.db"


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_db():
    with get_db() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    with get_db() as connection:
        rows = connection.execute(
            "SELECT id, title, completed, created_at "
            "FROM tasks ORDER BY id DESC"
        ).fetchall()

    return jsonify([dict(row) for row in rows])


@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()

    if not title:
        return jsonify({"error": "Task title is required."}), 400

    if len(title) > 200:
        return jsonify({"error": "Maximum title length is 200 characters."}), 400

    with get_db() as connection:
        cursor = connection.execute(
            "INSERT INTO tasks (title) VALUES (?)", (title,)
        )
        task_id = cursor.lastrowid

        row = connection.execute(
            "SELECT id, title, completed, created_at "
            "FROM tasks WHERE id = ?",
            (task_id,)
        ).fetchone()

    return jsonify(dict(row)), 201


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    data = request.get_json(silent=True) or {}

    with get_db() as connection:
        existing = connection.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()

        if existing is None:
            return jsonify({"error": "Task not found."}), 404

        title = existing["title"]
        completed = existing["completed"]

        if "title" in data:
            if not isinstance(data["title"], str):
                return jsonify({"error": "Title must be text."}), 400

            title = data["title"].strip()

            if not title:
                return jsonify({"error": "Task title cannot be empty."}), 400

            if len(title) > 200:
                return jsonify({"error": "Maximum title length is 200 characters."}), 400

        if "completed" in data:
            if not isinstance(data["completed"], bool):
                return jsonify({"error": "Completed must be true or false."}), 400

            completed = int(data["completed"])

        connection.execute(
            "UPDATE tasks SET title = ?, completed = ? WHERE id = ?",
            (title, completed, task_id)
        )

        row = connection.execute(
            "SELECT id, title, completed, created_at "
            "FROM tasks WHERE id = ?",
            (task_id,)
        ).fetchone()

    return jsonify(dict(row))


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    with get_db() as connection:
        cursor = connection.execute(
            "DELETE FROM tasks WHERE id = ?", (task_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Task not found."}), 404

    return jsonify({"message": "Task deleted successfully."})


if __name__ == "__main__":
    initialize_db()
    app.run(debug=True)
