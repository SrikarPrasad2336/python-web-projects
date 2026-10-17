# 💰 FinTrack — Personal Expense Tracker

A modern personal finance dashboard built with **Python, Flask, SQLite, HTML, CSS, and JavaScript**. Track income and expenses, manage transactions, and visualize your spending with interactive charts.

## ✨ Features

- **Financial Dashboard:** View your total balance, income, expenses, and transaction count.
- **Transaction Management:** Add, edit, and delete income and expense records.
- **Expense Categories:** Organize transactions into categories such as Food, Transport, Shopping, Bills, and Salary.
- **Interactive Charts:** Visualize income versus expenses and spending by category.
- **Search and Filters:** Find transactions by keyword, type, and date range.
- **Persistent Storage:** Store transaction data in a local SQLite database.
- **Input Validation:** Validate amounts, categories, titles, and transaction dates.
- **Responsive UI:** Dark-themed dashboard designed for desktop and mobile screens.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Python | Backend programming |
| Flask | Web framework and REST API |
| SQLite | Persistent database |
| HTML5 | Dashboard structure |
| CSS3 | Responsive styling |
| JavaScript | Interactions and API integration |
| Chart.js | Interactive financial charts |

## 📁 Project Structure

```text
expense-tracker/
├── app.py
├── requirements.txt
├── expenses.db          # Created automatically
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd python-web-projects/expense-tracker
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL.

### 2. Create a virtual environment

**Windows PowerShell:**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**

```bat
python -m venv .venv
.venv\Scripts\activate.bat
```

### 3. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 4. Run the application

```bash
python app.py
```

### 5. Open the dashboard

Visit:

```text
http://127.0.0.1:5000
```

The SQLite database and transactions table are created automatically when the application starts.

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Dashboard |
| GET | `/api/health` | Application health check |
| GET | `/api/categories` | List available categories |
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions` | Add a transaction |
| PUT | `/api/transactions/<id>` | Update a transaction |
| DELETE | `/api/transactions/<id>` | Delete a transaction |
| GET | `/api/summary` | Financial summary and expense breakdown |

### Filtering transactions

The transaction endpoint supports optional query parameters:

```text
/api/transactions?type=expense
/api/transactions?search=food
/api/transactions?start_date=2026-10-01&end_date=2026-10-31
```

Filters can be combined.

## 💵 Financial Calculations

- **Balance** = Total Income − Total Expenses
- **Total Income** = Sum of all income transactions
- **Total Expenses** = Sum of all expense transactions

Amounts are displayed in Indian rupees (INR).

## 🔒 Data and Privacy

Transaction records are stored in the local `expenses.db` SQLite file. The application does not currently include user authentication or multi-user access controls.

For public deployment, add authentication, authorization, production-grade configuration, and appropriate security protections before storing personal financial information.

Chart.js is loaded from a CDN, so an internet connection is required to load the charting library.

## 🧪 Testing

Verify the following manually:

- Add income and expense transactions.
- Edit and delete transactions.
- Search and filter records.
- Check balance and summary calculations.
- Verify chart updates after changes.
- Confirm that transactions persist after restarting Flask.
- Test invalid amounts and future transaction dates.

## 📌 Future Improvements

- Monthly income and expense reports.
- Budget limits and spending alerts.
- CSV export and downloadable reports.
- Recurring transactions.
- User registration and secure authentication.
- Automated unit and API tests.

## 👨‍💻 Author

**Python Web Projects Collection**

Part of a collection of six Python web applications built to practice backend development, databases, API integration, and frontend design.

## 📄 License

This project is available for educational and personal learning purposes.
