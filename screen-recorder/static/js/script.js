
const microphoneInput = document.getElementById("microphone");
const systemAudioInput = document.getElementById("systemAudio");

const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const stopButton = document.getElementById("stopButton");

const timer = document.getElementById("timer");
const statusText = document.getElementById("statusText");
const recordingDot = document.getElementById("recordingDot");
const errorMessage = document.getElementById("errorMessage");

const videoPreview = document.getElementById("videoPreview");
const emptyState = document.getElementById("emptyState");
const downloadButton = document.getElementById("downloadButton");
const videoFormat = document.getElementById("videoFormat");
const videoSize = document.getElementById("videoSize");

let displayStream = null;
let microphoneStream = null;
let recordingStream = null;
let recorder = null;
let recordedChunks = [];
let recordingStartedAt = 0;
let accumulatedMs = 0;
let timerInterval = null;
let recordingUrl = null;
let isStopping = false;

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map(value => String(value).padStart(2, "0"))
    .join(":");
}

function elapsedMilliseconds() {
  if (recorder && recorder.state === "recording") {
    return accumulatedMs + (Date.now() - recordingStartedAt);
  }

  return accumulatedMs;
}

function updateTimer() {
  timer.textContent = formatDuration(elapsedMilliseconds());
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 250);
  updateTimer();
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  updateTimer();
}

function setStatus(message, recording = false) {
  statusText.textContent = message;
  recordingDot.classList.toggle("active", recording);
}

function showError(message) {
  errorMessage.textContent = message || "";
}

function stopTracks(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

function releaseStreams() {
  stopTracks(displayStream);
  stopTracks(microphoneStream);

  displayStream = null;
  microphoneStream = null;
  recordingStream = null;
}

function resetRecordingUI() {
  startButton.disabled = false;
  pauseButton.disabled = true;
  pauseButton.textContent = "Ⅱ Pause";
  stopButton.disabled = true;
  recordingDot.classList.remove("active");
}

function cleanupOldRecording() {
  if (recordingUrl) {
    URL.revokeObjectURL(recordingUrl);
    recordingUrl = null;
  }

  downloadButton.hidden = true;
  videoPreview.removeAttribute("src");
  videoPreview.load();
}

async function startRecording() {
  showError("");

  if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) {
    showError(
      "Screen recording is not supported in this browser. Try an updated Chrome or Edge browser."
    );
    return;
  }

  startButton.disabled = true;
  setStatus("Waiting for screen selection…");

  try {
    // Request screen sharing directly from the button interaction.
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: systemAudioInput.checked
    });

    const tracks = [...displayStream.getVideoTracks()];
    const displayAudioTracks = displayStream.getAudioTracks();

    if (systemAudioInput.checked && displayAudioTracks.length === 0) {
      setStatus("Screen selected; shared-tab audio is unavailable.");
    }

    tracks.push(...displayAudioTracks);

    if (microphoneInput.checked) {
      try {
        microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });

        tracks.push(...microphoneStream.getAudioTracks());
      } catch (error) {
        stopTracks(displayStream);
        displayStream = null;
        throw new Error(
          "Microphone permission was denied or unavailable. Allow microphone access and try again."
        );
      }
    }

    recordingStream = new MediaStream(tracks);

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];

    const supportedType = mimeTypes.find(type =>
      MediaRecorder.isTypeSupported(type)
    );

    recorder = supportedType
      ? new MediaRecorder(recordingStream, { mimeType: supportedType })
      : new MediaRecorder(recordingStream);

    recordedChunks = [];
    accumulatedMs = 0;
    recordingStartedAt = Date.now();
    isStopping = false;

    cleanupOldRecording();

    recorder.addEventListener("dataavailable", event => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    });

    recorder.addEventListener("error", () => {
      showError("A recording error occurred. Please try again.");
    });

    recorder.addEventListener("stop", finishRecording, { once: true });

    displayStream.getVideoTracks()[0].addEventListener("ended", () => {
      if (recorder && recorder.state !== "inactive" && !isStopping) {
        stopRecording();
      }
    }, { once: true });

    recorder.start(1000);

    startButton.disabled = true;
    pauseButton.disabled = false;
    stopButton.disabled = false;

    setStatus("Recording your screen", true);
    startTimer();
  } catch (error) {
    releaseStreams();
    resetRecordingUI();

    if (error.name === "NotAllowedError") {
      setStatus("Screen sharing was cancelled or permission was denied.");
    } else {
      setStatus("Could not start recording.");
      showError(error.message || "Please check browser permissions and try again.");
    }
  }
}

function togglePause() {
  if (!recorder) return;

  if (recorder.state === "recording") {
    accumulatedMs += Date.now() - recordingStartedAt;
    recorder.pause();

    pauseButton.textContent = "▶ Resume";
    setStatus("Recording paused");
    stopTimer();
  } else if (recorder.state === "paused") {
    recordingStartedAt = Date.now();
    recorder.resume();

    pauseButton.textContent = "Ⅱ Pause";
    setStatus("Recording your screen", true);
    startTimer();
  }
}

function stopRecording() {
  if (!recorder || recorder.state === "inactive" || isStopping) return;

  isStopping = true;

  if (recorder.state === "recording") {
    accumulatedMs += Date.now() - recordingStartedAt;
  }

  stopTimer();
  setStatus("Preparing your video…");

  // Release display and microphone tracks after the recorder finishes.
  recorder.stop();
}

function finishRecording() {
  const mimeType = recorder?.mimeType || "video/webm";
  const blob = new Blob(recordedChunks, { type: mimeType });

  releaseStreams();
  resetRecordingUI();
  stopTimer();

  if (blob.size === 0) {
    setStatus("No video data was captured.");
    showError("Please record again and keep the screen-sharing session active.");
    return;
  }

  recordingUrl = URL.createObjectURL(blob);
  videoPreview.src = recordingUrl;
  videoPreview.hidden = false;
  emptyState.hidden = true;

  const extension = mimeType.includes("mp4") ? "mp4" : "webm";

  downloadButton.href = recordingUrl;
  downloadButton.download = `screen-recording-${Date.now()}.${extension}`;
  downloadButton.hidden = false;

  videoFormat.textContent = `VIDEO · ${extension.toUpperCase()}`;
  videoSize.textContent = `${(blob.size / (1024 * 1024)).toFixed(2)} MB`;

  setStatus("Recording ready to preview or download.");
  recorder = null;
  isStopping = false;
}

startButton.addEventListener("click", startRecording);
pauseButton.addEventListener("click", togglePause);
stopButton.addEventListener("click", stopRecording);

window.addEventListener("beforeunload", () => {
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }

  releaseStreams();

  if (recordingUrl) {
    URL.revokeObjectURL(recordingUrl);
  }
});
