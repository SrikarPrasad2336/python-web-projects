
import logging
import math
import os
import time

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

load_dotenv()

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

API_KEY = os.getenv("TWELVE_DATA_API_KEY")
API_BASE = "https://api.twelvedata.com"
REQUEST_TIMEOUT = 15

# Currency/crypto symbol lists are cached for 24 hours.
SYMBOL_CACHE_SECONDS = 24 * 60 * 60

symbol_cache = {
    "expires_at": 0,
    "pairs": set(),
    "currencies": [],
}

# Automatic quote refresh interval.
AUTO_REFRESH_SECONDS = 60


def provider_get(endpoint, params=None):
    """Send a request to Twelve Data and report provider errors."""
    if not API_KEY:
        raise RuntimeError(
            "Missing API key. Add TWELVE_DATA_API_KEY to your .env file."
        )

    query = dict(params or {})
    query["apikey"] = API_KEY

    response = requests.get(
        f"{API_BASE}/{endpoint}",
        params=query,
        timeout=REQUEST_TIMEOUT,
    )

    response.raise_for_status()
    data = response.json()

    if isinstance(data, dict) and (
        data.get("status") == "error" or "code" in data
    ):
        app.logger.error("Twelve Data error response: %s", data)
        raise ValueError(
            data.get("message", "Twelve Data rejected the request.")
        )

    if not isinstance(data, dict):
        raise ValueError("Unexpected response from Twelve Data.")

    return data


def parse_pair_list(data):
    """Extract pair symbols such as EUR/USD and BTC/USD."""
    rows = data.get("data", [])
    pairs = set()

    if not isinstance(rows, list):
        return pairs

    for row in rows:
        if not isinstance(row, dict):
            continue

        symbol = row.get("symbol")

        if isinstance(symbol, str) and "/" in symbol:
            base, quote = symbol.upper().split("/", 1)

            if base.strip() and quote.strip():
                pairs.add(f"{base.strip()}/{quote.strip()}")

    return pairs


def get_supported_symbols(force_refresh=False):
    """Load and cache all pairs returned by both reference endpoints."""
    now = time.time()

    if (
        not force_refresh
        and symbol_cache["pairs"]
        and now < symbol_cache["expires_at"]
    ):
        return symbol_cache["pairs"], symbol_cache["currencies"]

    forex_data = provider_get("forex_pairs")
    crypto_data = provider_get("cryptocurrencies")

    forex_pairs = parse_pair_list(forex_data)
    crypto_pairs = parse_pair_list(crypto_data)
    pairs = forex_pairs | crypto_pairs

    if not pairs:
        raise ValueError("No supported currency pairs were returned.")

    currencies = sorted({
        code
        for pair in pairs
        for code in pair.split("/")
    })

    symbol_cache.update({
        "expires_at": now + SYMBOL_CACHE_SECONDS,
        "pairs": pairs,
        "currencies": currencies,
    })

    app.logger.info(
        "Loaded %s forex pairs and %s crypto pairs.",
        len(forex_pairs),
        len(crypto_pairs),
    )

    return pairs, currencies


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/currencies")
def currencies():
    try:
        pairs, codes = get_supported_symbols()

        return jsonify({
            "currencies": codes,
            "pair_count": len(pairs),
            "provider": "Twelve Data",
            "symbol_list_cache_hours": 24,
        })

    except (
        requests.RequestException,
        ValueError,
        RuntimeError,
    ) as exc:
        app.logger.warning("Currency-list request failed: %s", exc)

        return jsonify({
            "error": str(exc),
        }), 502


@app.route("/api/convert", methods=["POST"])
def convert():
    data = request.get_json(silent=True) or {}

    amount = data.get("amount")
    base = data.get("from_currency")
    target = data.get("to_currency")

    # Validate the amount.
    if (
        isinstance(amount, bool)
        or not isinstance(amount, (int, float))
        or not math.isfinite(amount)
        or amount <= 0
        or amount > 1e12
    ):
        return jsonify({
            "error": "Enter a valid amount greater than zero."
        }), 400

    # Validate the currency selections.
    if not isinstance(base, str) or not isinstance(target, str):
        return jsonify({
            "error": "Select both currencies."
        }), 400

    base = base.strip().upper()
    target = target.strip().upper()

    try:
        pairs, currencies = get_supported_symbols()

        if base not in currencies or target not in currencies:
            return jsonify({
                "error": "Select currencies from the supported list."
            }), 400

        # Same-currency conversion does not need an external quote.
        if base == target:
            return jsonify({
                "amount": amount,
                "from_currency": base,
                "to_currency": target,
                "rate": 1,
                "result": amount,
                "timestamp": int(time.time()),
                "provider": "Local calculation",
                "is_live_quote": False,
                "note": "Same-currency conversion; no market quote required.",
            })

        direct = f"{base}/{target}"
        inverse = f"{target}/{base}"

        if direct in pairs:
            symbol_used = direct
            inverted = False
        elif inverse in pairs:
            symbol_used = inverse
            inverted = True
        else:
            return jsonify({
                "error": (
                    f"{direct} is not listed as a supported pair. "
                    "Choose another pair."
                )
            }), 422

        # Twelve Data currency_conversion requires BOTH symbol and amount.
        # Request a one-unit conversion so the response amount equals the rate.
        quote = provider_get(
            "currency_conversion",
            {
                "symbol": symbol_used,
                "amount": 1,
                "timezone": "UTC",
            },
        )

        raw_rate = float(quote["rate"])
        raw_timestamp = quote.get("timestamp")

        if not math.isfinite(raw_rate) or raw_rate <= 0:
            raise ValueError("Twelve Data returned an invalid rate.")

        if raw_timestamp is None:
            raise ValueError(
                "Twelve Data did not return a quote timestamp."
            )

        timestamp = int(raw_timestamp)

        if timestamp <= 0:
            raise ValueError("Twelve Data returned an invalid timestamp.")

        # If only the inverse pair exists, calculate its reciprocal.
        rate = 1 / raw_rate if inverted else raw_rate

        if not math.isfinite(rate) or rate <= 0:
            raise ValueError("Could not calculate a valid conversion rate.")

        return jsonify({
            "amount": amount,
            "from_currency": base,
            "to_currency": target,
            "rate": rate,
            "result": amount * rate,
            "timestamp": timestamp,
            "quote_pair": symbol_used,
            "inverted": inverted,
            "provider": "Twelve Data",
            "is_live_quote": True,
        })

    except requests.RequestException as exc:
        app.logger.exception("Network/API request failed.")

        return jsonify({
            "error": (
                "Could not reach Twelve Data. Check your internet connection "
                "and API request limits."
            )
        }), 502

    except (KeyError, TypeError, ValueError, RuntimeError, OverflowError) as exc:
        app.logger.exception("Conversion failed.")

        return jsonify({
            "error": (
                "Could not obtain a valid, timestamped quote. "
                "Check the Flask terminal for the provider error."
            )
        }), 502


@app.route("/api/config")
def config():
    return jsonify({
        "auto_refresh_seconds": AUTO_REFRESH_SECONDS,
        "provider": "Twelve Data",
    })


if __name__ == "__main__":
    # Local development only. Use a production server for public deployment.
    app.run(debug=True)
