# TaskFlow | Python To-Do List App

A responsive task management application built with Python, Flask, SQLite, HTML, CSS, and JavaScript.

## Features

- Create, view, edit, and delete tasks
- Mark tasks as completed or pending
- Filter tasks by status
- Live dashboard statistics
- SQLite database for persistent storage
- Responsive design for desktop and mobile
- REST API built with Flask

## Tech Stack

- **Backend:** Python, Flask
- **Database:** SQLite
- **Frontend:** HTML5, CSS3, JavaScript
- **API:** REST with JSON

## Project Structure

```text
01-todo-app/
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

## Installation and Setup

### 1. Navigate to the project folder

```bash
cd 01-todo-app
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

### 6. Open the app

Visit [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

The SQLite database is initialized automatically when the application starts.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | Retrieve all tasks |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/<id>` | Update task title or status |
| DELETE | `/api/tasks/<id>` | Delete a task |

### Example: Create a Task

```json
{
  "title": "Learn Flask"
}
```

## Future Improvements

- Task deadlines and priorities
- Search and sorting
- User authentication
- Cloud database integration
- Deployment to a hosting platform

## License

This project is available for learning and personal use. Add a license file if you intend to distribute it under a specific open-source license.
