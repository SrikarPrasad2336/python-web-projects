
const amountInput = document.getElementById("amount");
const fromSelect = document.getElementById("fromCurrency");
const toSelect = document.getElementById("toCurrency");
const convertButton = document.getElementById("convertButton");
const swapButton = document.getElementById("swapButton");
const statusText = document.getElementById("status");
const errorMessage = document.getElementById("errorMessage");
const resultPanel = document.getElementById("resultPanel");
const resultAmount = document.getElementById("resultAmount");
const rateText = document.getElementById("rateText");
const timestampText = document.getElementById("timestampText");
const sourceText = document.getElementById("sourceText");
const refreshText = document.getElementById("refreshText");

let refreshSeconds = 60;
let refreshTimer = null;
let requestInProgress = false;
let lastQuote = null;

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 8
  }).format(value);
}


function formatTimestamp(unixTimestamp) {
  const date = new Date(Number(unixTimestamp) * 1000);

  if (Number.isNaN(date.getTime())) {
    return "Timestamp unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
    hour12: true
  }).format(date);
}

function setError(message) {
  errorMessage.textContent = message || "";
}

function addOptions(select, currencies, selectedValue) {
  select.replaceChildren();

  for (const currency of currencies) {
    const option = document.createElement("option");
    option.value = currency;
    option.textContent = currency;
    select.appendChild(option);
  }

  if (currencies.includes(selectedValue)) {
    select.value = selectedValue;
  }
}

async function loadCurrencies() {
  statusText.textContent = "Loading supported currencies…";
  setError("");

  const response = await fetch("/api/currencies", { cache: "no-store" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load currencies.");
  }

  if (!Array.isArray(data.currencies) || data.currencies.length === 0) {
    throw new Error("The provider returned no supported currencies.");
  }

  addOptions(fromSelect, data.currencies, "INR");
  addOptions(toSelect, data.currencies, "USD");

  // Use sensible fallbacks if INR or USD is not available.
  if (!fromSelect.value) fromSelect.selectedIndex = 0;
  if (!toSelect.value) toSelect.selectedIndex = Math.min(1, data.currencies.length - 1);

  statusText.textContent =
    `${data.currencies.length} currency/crypto codes loaded. ` +
    `${data.pair_count} supported pairs found.`;
}

async function convertCurrency({ automatic = false } = {}) {
  if (requestInProgress) return;

  const amount = Number(amountInput.value);
  const fromCurrency = fromSelect.value;
  const toCurrency = toSelect.value;

  if (!Number.isFinite(amount) || amount <= 0) {
    setError("Enter an amount greater than zero.");
    return;
  }

  if (!fromCurrency || !toCurrency) {
    setError("Select both currencies.");
    return;
  }

  requestInProgress = true;
  convertButton.disabled = true;
  setError("");

  if (!automatic) {
    statusText.textContent = "Fetching the latest available quote…";
  }

  try {
    const response = await fetch("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        amount,
        from_currency: fromCurrency,
        to_currency: toCurrency
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Conversion failed.");
    }

    // Do not keep presenting an old quote if the user changed the pair.
    lastQuote = {
      ...data,
      fetchedAt: Date.now()
    };

    resultAmount.textContent =
      `${formatNumber(data.amount)} ${data.from_currency} = ` +
      `${formatNumber(data.result)} ${data.to_currency}`;

    rateText.textContent =
      `Rate: 1 ${data.from_currency} = ` +
      `${formatNumber(data.rate)} ${data.to_currency}`;

    timestampText.textContent =
      `Provider quote timestamp: ${formatTimestamp(data.timestamp)}`;

    sourceText.textContent =
      `Source: ${data.provider}` +
      (data.inverted ? " (inverse of the provider's listed pair)" : "");

    resultPanel.hidden = false;
    statusText.textContent = automatic
      ? "Quote refreshed successfully."
      : "Latest available quote received.";
    refreshText.textContent =
      `Automatic refresh: every ${refreshSeconds} seconds while this tab is visible.`;
  } catch (error) {
    // Hide the prior result so it cannot be mistaken for a current quote.
    resultPanel.hidden = true;
    lastQuote = null;
    setError(error.message);
    statusText.textContent = "No verified current quote available.";
  } finally {
    requestInProgress = false;
    convertButton.disabled = false;
  }
}

function stopAutoRefresh() {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();

  if (document.hidden) return;

  refreshTimer = setInterval(() => {
    if (!document.hidden) {
      convertCurrency({ automatic: true });
    }
  }, refreshSeconds * 1000);
}

convertButton.addEventListener("click", () => {
  convertCurrency();
});

swapButton.addEventListener("click", () => {
  const previousFrom = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = previousFrom;
  convertCurrency();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopAutoRefresh();
  } else {
    convertCurrency({ automatic: true });
    startAutoRefresh();
  }
});

// Currency changes should immediately request a quote for the new pair.
fromSelect.addEventListener("change", () => convertCurrency());
toSelect.addEventListener("change", () => convertCurrency());
amountInput.addEventListener("change", () => convertCurrency());

async function initialise() {
  try {
    const configResponse = await fetch("/api/config", { cache: "no-store" });
    if (configResponse.ok) {
      const config = await configResponse.json();
      if (Number.isInteger(config.auto_refresh_seconds)) {
        refreshSeconds = Math.max(60, config.auto_refresh_seconds);
      }
    }

    await loadCurrencies();
    await convertCurrency();
    startAutoRefresh();
  } catch (error) {
    statusText.textContent = "Could not initialise the converter.";
    setError(error.message);
  }
}

initialise();
