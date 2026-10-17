
from flask import Flask, jsonify, render_template, request
import sqlite3
import math
from pathlib import Path
from datetime import date

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "expenses.db"

CATEGORIES = [
    "Salary",
    "Freelance",
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Health",
    "Education",
    "Entertainment",
    "Other",
]


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db():
    with get_db() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                amount REAL NOT NULL CHECK(amount > 0),
                transaction_type TEXT NOT NULL
                    CHECK(transaction_type IN ('income', 'expense')),
                category TEXT NOT NULL,
                transaction_date TEXT NOT NULL,
                note TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)


def validate_transaction(data):
    """Validate and normalize transaction data."""
    title = str(data.get("title") or "").strip()
    category = str(data.get("category") or "").strip()
    note = str(data.get("note") or "").strip()
    transaction_type = data.get("transaction_type")
    transaction_date = data.get("transaction_date")

    if not title or len(title) > 100:
        return None, "Title is required and must be 100 characters or fewer."

    try:
        amount = float(data.get("amount", 0))
    except (TypeError, ValueError):
        return None, "Enter a valid amount."

    if not math.isfinite(amount) or amount <= 0:
        return None, "Amount must be a positive, finite number."

    if transaction_type not in ("income", "expense"):
        return None, "Choose income or expense."

    if category not in CATEGORIES:
        return None, "Choose a valid category."

    try:
        parsed_date = date.fromisoformat(transaction_date)
        if parsed_date.isoformat() != transaction_date:
            raise ValueError
    except (TypeError, ValueError):
        return None, "Enter a valid date in YYYY-MM-DD format."

    if parsed_date > date.today():
        return None, "Transaction date cannot be in the future."

    if len(note) > 500:
        return None, "Note must be 500 characters or fewer."

    return {
        "title": title,
        "amount": amount,
        "transaction_type": transaction_type,
        "category": category,
        "transaction_date": transaction_date,
        "note": note,
    }, None


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "application": "Expense Tracker"
    })


@app.route("/api/categories", methods=["GET"])
def get_categories():
    return jsonify(CATEGORIES)


@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    transaction_type = request.args.get("type", "").strip()
    search = request.args.get("search", "").strip()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()

    if transaction_type and transaction_type not in ("income", "expense"):
        return jsonify({"error": "Invalid transaction type."}), 400

    if start_date:
        try:
            if date.fromisoformat(start_date).isoformat() != start_date:
                raise ValueError
        except ValueError:
            return jsonify({"error": "Invalid start date."}), 400

    if end_date:
        try:
            if date.fromisoformat(end_date).isoformat() != end_date:
                raise ValueError
        except ValueError:
            return jsonify({"error": "Invalid end date."}), 400

    if start_date and end_date and start_date > end_date:
        return jsonify({
            "error": "Start date cannot be after end date."
        }), 400

    query = "SELECT * FROM transactions WHERE 1=1"
    params = []

    if transaction_type:
        query += " AND transaction_type = ?"
        params.append(transaction_type)

    if search:
        query += " AND (title LIKE ? OR category LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    if start_date:
        query += " AND transaction_date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND transaction_date <= ?"
        params.append(end_date)

    query += " ORDER BY transaction_date DESC, id DESC"

    with get_db() as connection:
        rows = connection.execute(query, params).fetchall()

    return jsonify([dict(row) for row in rows])


@app.route("/api/transactions", methods=["POST"])
def add_transaction():
    data = request.get_json(silent=True) or {}
    transaction, error = validate_transaction(data)

    if error:
        return jsonify({"error": error}), 400

    with get_db() as connection:
        cursor = connection.execute("""
            INSERT INTO transactions
            (title, amount, transaction_type, category,
             transaction_date, note)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            transaction["title"],
            transaction["amount"],
            transaction["transaction_type"],
            transaction["category"],
            transaction["transaction_date"],
            transaction["note"],
        ))

        row = connection.execute(
            "SELECT * FROM transactions WHERE id = ?",
            (cursor.lastrowid,)
        ).fetchone()

    return jsonify(dict(row)), 201


@app.route("/api/transactions/<int:transaction_id>", methods=["PUT"])
def update_transaction(transaction_id):
    data = request.get_json(silent=True) or {}
    transaction, error = validate_transaction(data)

    if error:
        return jsonify({"error": error}), 400

    with get_db() as connection:
        existing = connection.execute(
            "SELECT id FROM transactions WHERE id = ?",
            (transaction_id,)
        ).fetchone()

        if existing is None:
            return jsonify({"error": "Transaction not found."}), 404

        connection.execute("""
            UPDATE transactions
            SET title = ?, amount = ?, transaction_type = ?,
                category = ?, transaction_date = ?, note = ?
            WHERE id = ?
        """, (
            transaction["title"],
            transaction["amount"],
            transaction["transaction_type"],
            transaction["category"],
            transaction["transaction_date"],
            transaction["note"],
            transaction_id,
        ))

        row = connection.execute(
            "SELECT * FROM transactions WHERE id = ?",
            (transaction_id,)
        ).fetchone()

    return jsonify(dict(row))


@app.route("/api/transactions/<int:transaction_id>", methods=["DELETE"])
def delete_transaction(transaction_id):
    with get_db() as connection:
        cursor = connection.execute(
            "DELETE FROM transactions WHERE id = ?",
            (transaction_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Transaction not found."}), 404

    return jsonify({
        "message": "Transaction deleted successfully."
    })


@app.route("/api/summary", methods=["GET"])
def get_summary():
    with get_db() as connection:
        row = connection.execute("""
            SELECT
                COALESCE(SUM(
                    CASE WHEN transaction_type = 'income'
                    THEN amount ELSE 0 END
                ), 0) AS total_income,
                COALESCE(SUM(
                    CASE WHEN transaction_type = 'expense'
                    THEN amount ELSE 0 END
                ), 0) AS total_expenses,
                COUNT(*) AS transaction_count
            FROM transactions
        """).fetchone()

        category_rows = connection.execute("""
            SELECT category, SUM(amount) AS total
            FROM transactions
            WHERE transaction_type = 'expense'
            GROUP BY category
            ORDER BY total DESC
        """).fetchall()

    total_income = row["total_income"]
    total_expenses = row["total_expenses"]

    return jsonify({
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(total_income - total_expenses, 2),
        "transaction_count": row["transaction_count"],
        "category_breakdown": [
            {
                "category": item["category"],
                "total": round(item["total"], 2)
            }
            for item in category_rows
        ]
    })


init_db()

if __name__ == "__main__":
    app.run(debug=True)
