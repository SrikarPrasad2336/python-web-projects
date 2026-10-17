# KeyForge | Password Generator

KeyForge is a responsive password generator built using Python, Flask, HTML, CSS, and JavaScript. It generates random passwords using Python's cryptographically secure `secrets` module.

## Features

- Generate passwords between 8 and 64 characters
- Customize lowercase letters, uppercase letters, numbers, and symbols
- Ensure every selected character category appears in the generated password
- Show or hide the generated password
- Copy passwords to the clipboard
- Display an estimated password-strength indicator
- Responsive interface for desktop and mobile
- No database or external API required

## Tech Stack

- Python
- Flask
- HTML5
- CSS3
- JavaScript
- Python `secrets` module

## Project Structure

```text
password-generator/
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
cd password-generator
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

### 5. Run the application

```bash
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

## API

### Generate a password

`POST /api/generate`

Example JSON request:

```json
{
  "length": 20,
  "lowercase": true,
  "uppercase": true,
  "numbers": true,
  "symbols": true
}
```

The API returns the generated password as JSON. Invalid lengths and requests without selected character categories are rejected.

## Security Notes

- Uses Python's `secrets` module for secure randomness.
- Passwords are generated on the server and are not saved by this application.
- Use HTTPS if deploying publicly.
- Avoid sharing generated passwords or entering them into untrusted websites.
- The strength indicator is an estimate, not a security guarantee.

## License

For learning and personal use. Add a license file if distributing under a specific open-source license.
