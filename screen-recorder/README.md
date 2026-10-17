# Capture Studio – Screen Recorder

Capture Studio is a browser-based screen recording application built with Python Flask, HTML, CSS, and JavaScript. It lets users record their screen, optionally include microphone or shared-tab audio, preview recordings, and download videos locally.

## Features

- **Screen Recording:** Capture a screen, application window, or browser tab.
- **Microphone Audio:** Optionally record voice narration.
- **Shared-Tab Audio:** Capture shared audio when supported by the browser and selected source.
- **Recording Controls:** Start, pause, resume, and stop recordings.
- **Recording Timer:** View the elapsed recording duration.
- **Video Preview:** Play recordings before downloading.
- **Video Download:** Save recordings in a browser-supported format, typically WebM.
- **Responsive Interface:** Designed for desktop and mobile layouts.
- **Local Processing:** Recording data stays in the browser and is not uploaded to the Flask backend.

## Technology Stack

| Technology | Purpose |
|---|---|
| Python | Backend language |
| Flask | Web server |
| HTML5 | Interface structure |
| CSS3 | Responsive design |
| JavaScript | Screen capture and recording controls |
| MediaDevices API | Screen and microphone access |
| MediaRecorder API | Video recording and encoding |

## Project Structure

```text
screen-recorder/
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

## Prerequisites

- Python 3.10 or later
- pip
- An updated browser that supports the MediaRecorder and screen-capture APIs
- Git, if cloning the repository

## Installation

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd python-web-projects/screen-recorder
```

Replace the placeholder with your repository URL.

### 2. Create a virtual environment

**Windows PowerShell:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 4. Start the application

```bash
python app.py
```

Open the application at:

**http://127.0.0.1:5000**

## How to Use

1. Open Capture Studio in a supported browser.
2. Enable microphone audio if voice narration is required.
3. Enable shared-tab audio if needed and supported.
4. Click **Start Recording**.
5. Select the screen, window, or tab you want to share.
6. Use Pause and Resume as needed.
7. Click Stop to finish the recording.
8. Preview the video and download it.

## API Endpoint

### Health Check

`GET /api/health`

Example response:

```json
{
  "status": "ok",
  "application": "Screen Recorder",
  "recording": "Browser MediaRecorder API"
}
```

## Browser Support and Limitations

- Screen capture requires user permission and a secure browser context. Localhost is generally permitted.
- Production deployments must use HTTPS.
- Available recording formats and codecs depend on the browser.
- Microphone and shared-tab audio depend on browser permissions and the selected capture source.
- The application does not upload recordings to Flask. Recordings are held in browser memory until downloaded or the page is closed.
- Large or lengthy recordings may consume significant browser memory.
- The Flask development server is intended for local development, not public production deployment.

## Future Enhancements

- Recording quality and frame-rate settings.
- Webcam overlay.
- Countdown before recording.
- Recording history and metadata.
- Additional video format options where supported.
- Production deployment.

## License

This project is intended for educational and portfolio use. Add a `LICENSE` file if you plan to distribute it under a specific open-source license.

---

Built with Python and browser APIs as part of the **Python Web Projects** collection.