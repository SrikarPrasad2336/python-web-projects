# CurrencyFlow | Currency Converter

CurrencyFlow is a responsive currency conversion web application built with Python, Flask, HTML, CSS, and JavaScript. It fetches exchange rates from ExchangeRate-API's Open Access endpoint.

## Features

- Convert between supported global currencies
- Fetch exchange rates from an external API
- Display the conversion rate and provider update timestamps
- Swap source and target currencies
- Copy conversion results
- Responsive desktop and mobile interface
- In-memory caching to reduce unnecessary API requests
- Input validation and error handling

## Tech Stack

- Python
- Flask
- Requests
- HTML5
- CSS3
- JavaScript
- ExchangeRate-API

## Project Structure

```text
currency-converter/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── script.js
```

## Installation

### 1. Navigate to the project folder

```bash
cd currency-converter
```

### 2. Create a virtual environment

```bash
python -m venv .venv
```

### 3. Activate the environment

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Windows Command Prompt:

```cmd
.venv\Scripts\activate.bat
```

### 4. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 5. Start the application

```bash
python app.py
```

Open http://127.0.0.1:5000 in your browser.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/currencies` | List supported currency codes |
| POST | `/api/convert` | Convert an amount between currencies |

Example conversion request:

```json
{
  "amount": 100,
  "from_currency": "USD",
  "to_currency": "INR"
}
```

## Exchange Rate Information

This project uses the ExchangeRate-API Open Access endpoint. The service publishes rates daily, and its terms require attribution. Rates are indicative and may differ from bank, card, or money-transfer provider rates.

Official documentation: https://www.exchangerate-api.com/docs/free

## Limitations

- Requires an internet connection to retrieve rates.
- Rates may not reflect intraday market changes.
- The in-memory cache is cleared when the application restarts.
- This application is intended for learning and indicative conversions, not financial settlement.

## License

For learning and personal use. Add a license file if distributing under a specific open-source license.
