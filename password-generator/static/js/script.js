
const lengthSlider = document.getElementById("length");
const lengthValue = document.getElementById("length-value");
const passwordOutput = document.getElementById("password-output");
const generateButton = document.getElementById("generate-button");
const copyButton = document.getElementById("copy-button");
const toggleButton = document.getElementById("toggle-visibility");
const message = document.getElementById("message");

const optionIds = ["lowercase", "uppercase", "numbers", "symbols"];

lengthSlider.addEventListener("input", () => {
    lengthValue.value = lengthSlider.value;
    lengthValue.textContent = lengthSlider.value;
});

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
}

function getOptions() {
    return {
        length: Number(lengthSlider.value),
        lowercase: document.getElementById("lowercase").checked,
        uppercase: document.getElementById("uppercase").checked,
        numbers: document.getElementById("numbers").checked,
        symbols: document.getElementById("symbols").checked
    };
}

function updateStrength(password, options) {
    const bars = document.querySelectorAll(".strength-bars span");
    const label = document.getElementById("strength-label");

    let poolSize = 0;

    if (options.lowercase) poolSize += 26;
    if (options.uppercase) poolSize += 26;
    if (options.numbers) poolSize += 10;
    if (options.symbols) poolSize += 26;

    // Estimate entropy from length and the selected character pool.
    const entropy = password.length * Math.log2(Math.max(poolSize, 1));

    let score = 1;

    if (entropy >= 60) score = 2;
    if (entropy >= 80) score = 3;
    if (entropy >= 100) score = 4;

    const labels = ["", "Weak", "Fair", "Strong", "Very strong"];

    bars.forEach((bar, index) => {
        bar.classList.toggle("filled", index < score);
    });

    label.textContent = labels[score];

    // This is an estimate, not a guarantee against password cracking.
}

async function generatePassword() {
    const options = getOptions();

    if (!optionIds.some(id => options[id])) {
        showMessage("Select at least one character type.", true);
        return;
    }

    generateButton.disabled = true;
    generateButton.textContent = "Generating...";
    showMessage("");

    try {
        const response = await fetch("/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(options)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to generate password.");
        }

        passwordOutput.value = data.password;
        passwordOutput.type = "password";
        toggleButton.textContent = "◉";
        toggleButton.setAttribute("aria-label", "Show password");

        updateStrength(data.password, options);
        showMessage("Password generated successfully.");
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        generateButton.disabled = false;
        generateButton.innerHTML = "<span>✳</span> Generate password";
    }
}

generateButton.addEventListener("click", generatePassword);

toggleButton.addEventListener("click", () => {
    if (!passwordOutput.value) {
        showMessage("Generate a password first.", true);
        return;
    }

    const isHidden = passwordOutput.type === "password";
    passwordOutput.type = isHidden ? "text" : "password";

    toggleButton.textContent = isHidden ? "◎" : "◉";
    toggleButton.setAttribute(
        "aria-label",
        isHidden ? "Hide password" : "Show password"
    );
});

copyButton.addEventListener("click", async () => {
    if (!passwordOutput.value) {
        showMessage("Generate a password first.", true);
        return;
    }

    try {
        await navigator.clipboard.writeText(passwordOutput.value);
        showMessage("Password copied to clipboard.");
    } catch {
        // Fallback for browsers where clipboard access is unavailable.
        passwordOutput.type = "text";
        passwordOutput.select();

        const copied = document.execCommand("copy");

        passwordOutput.setSelectionRange(0, 0);
        passwordOutput.type = "password";

        if (copied) {
            showMessage("Password copied to clipboard.");
        } else {
            showMessage("Copy failed. Select and copy the password manually.", true);
        }
    }
});

optionIds.forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
        showMessage("");
    });
});

// Generate an initial password when the page loads.
generatePassword();
