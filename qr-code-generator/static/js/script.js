
const contentInput = document.getElementById("content");
const foregroundInput = document.getElementById("foreground");
const backgroundInput = document.getElementById("background");
const generateButton = document.getElementById("generateButton");
const qrImage = document.getElementById("qrImage");
const emptyState = document.getElementById("emptyState");
const downloadButton = document.getElementById("downloadButton");
const resultDetails = document.getElementById("resultDetails");
const statusText = document.getElementById("status");
const errorMessage = document.getElementById("errorMessage");
const characterCount = document.getElementById("characterCount");

let currentImageUrl = null;

function updateColorLabels() {
  document.getElementById("foregroundValue").textContent =
    foregroundInput.value.toUpperCase();

  document.getElementById("backgroundValue").textContent =
    backgroundInput.value.toUpperCase();
}

function clearResult() {
  qrImage.hidden = true;
  emptyState.hidden = false;
  downloadButton.hidden = true;
  resultDetails.hidden = true;

  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl);
    currentImageUrl = null;
  }
}

function updateCharacterCount() {
  characterCount.textContent = `${contentInput.value.length} / 2000`;
}

async function generateQRCode() {
  const content = contentInput.value.trim();

  errorMessage.textContent = "";

  if (!content) {
    clearResult();
    errorMessage.textContent = "Please enter some text or a URL first.";
    contentInput.focus();
    return;
  }

  generateButton.disabled = true;
  generateButton.innerHTML = "<span>Creating your QR code...</span><span>⏳</span>";
  statusText.textContent = "Generating your QR code…";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content,
        foreground: foregroundInput.value,
        background: backgroundInput.value
      })
    });

    if (!response.ok) {
      let message = "Could not generate the QR code.";

      try {
        const data = await response.json();
        message = data.error || message;
      } catch {
        // Keep the fallback message if the response is not JSON.
      }

      throw new Error(message);
    }

    const imageBlob = await response.blob();

    if (!imageBlob.type.startsWith("image/")) {
      throw new Error("The server did not return a valid image.");
    }

    const newImageUrl = URL.createObjectURL(imageBlob);

    if (currentImageUrl) {
      URL.revokeObjectURL(currentImageUrl);
    }

    currentImageUrl = newImageUrl;
    qrImage.src = currentImageUrl;
    qrImage.hidden = false;
    emptyState.hidden = true;

    downloadButton.href = currentImageUrl;
    downloadButton.hidden = false;
    resultDetails.hidden = false;

    statusText.textContent = "Your QR code is ready to download.";
  } catch (error) {
    clearResult();
    errorMessage.textContent = error.message;
    statusText.textContent = "QR code generation failed.";
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = "<span>Generate QR Code</span><span>↗</span>";
  }
}

contentInput.addEventListener("input", updateCharacterCount);

foregroundInput.addEventListener("input", () => {
  updateColorLabels();
  document.querySelectorAll(".preset").forEach(button => {
    button.classList.remove("active");
  });
});

backgroundInput.addEventListener("input", () => {
  updateColorLabels();
  document.querySelectorAll(".preset").forEach(button => {
    button.classList.remove("active");
  });
});

document.querySelectorAll(".preset").forEach(button => {
  button.addEventListener("click", () => {
    foregroundInput.value = button.dataset.fg;
    backgroundInput.value = button.dataset.bg;

    document.querySelectorAll(".preset").forEach(preset => {
      preset.classList.remove("active");
    });

    button.classList.add("active");
    updateColorLabels();
  });
});

generateButton.addEventListener("click", generateQRCode);

contentInput.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    generateQRCode();
  }
});

window.addEventListener("beforeunload", () => {
  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl);
  }
});

updateColorLabels();
updateCharacterCount();
