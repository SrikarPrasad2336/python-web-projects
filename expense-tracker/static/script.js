
const API = {
    transactions: "/api/transactions",
    summary: "/api/summary",
    categories: "/api/categories"
};

const $ = (selector) => document.querySelector(selector);

const dialog = $("#transactionDialog");
const form = $("#transactionForm");
const tableBody = $("#transactionTableBody");

let transactions = [];
let editingId = null;
let showAllTransactions = false;
let cashFlowChart = null;
let categoryChart = null;
let toastTimer = null;
let searchTimer = null;

const money = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);

const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);

function localDateString() {
    const today = new Date();

    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");
}

function showToast(message, isError = false) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...options.headers
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error || "Something went wrong. Please try again."
        );
    }

    return data;
}

function formatDate(dateString) {
    if (!dateString) return "—";

    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;

    const parsed = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

    return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getInitial(title) {
    return String(title || "?").trim().charAt(0).toUpperCase() || "?";
}

async function loadCategories() {
    const categories = await apiRequest(API.categories);
    const categorySelect = $("#categoryInput");

    categorySelect.replaceChildren(
        new Option("Select category", "")
    );

    categories.forEach((category) => {
        categorySelect.add(new Option(category, category));
    });
}

function getFilters() {
    const type = $("#typeFilter").value;
    const search = $("#searchInput").value.trim();
    const startDate = $("#startDate").value;
    const endDate = $("#endDate").value;

    if (startDate && endDate && startDate > endDate) {
        throw new Error(
            "Start date cannot be after end date."
        );
    }

    const params = new URLSearchParams();

    if (type) params.set("type", type);
    if (search) params.set("search", search);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    return params.toString();
}

async function loadTransactions() {
    const query = getFilters();

    const data = await apiRequest(
        `${API.transactions}${query ? `?${query}` : ""}`
    );

    transactions = data;
    renderTransactions();
}

async function loadSummary() {
    const summary = await apiRequest(API.summary);

    $("#totalBalance").textContent = money(summary.balance);
    $("#totalIncome").textContent = money(summary.total_income);
    $("#totalExpenses").textContent = money(summary.total_expenses);
    $("#transactionCount").textContent = summary.transaction_count;

    $("#totalBalance").style.color =
        summary.balance < 0 ? "var(--red)" : "var(--green)";

    renderCashFlowChart(summary);
    renderCategoryChart(summary.category_breakdown || []);
}

function renderTransactions() {
    const visibleTransactions = showAllTransactions
        ? transactions
        : transactions.slice(0, 6);

    if (!visibleTransactions.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">
                    <strong>No transactions found</strong>
                    <p>Try changing your filters or add a transaction.</p>
                </td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = visibleTransactions.map((transaction) => {
            const isIncome =
                transaction.transaction_type === "income";
            const typeClass = isIncome ? "income" : "expense";
            const sign = isIncome ? "+" : "−";

            return `
                <tr>
                    <td>
                        <div class="transaction-title">
                            <span class="transaction-avatar">
                                ${escapeHTML(getInitial(transaction.title))}
                            </span>
                            <div>
                                <div class="transaction-name">
                                    ${escapeHTML(transaction.title)}
                                </div>
                                ${transaction.note
                                    ? `<div class="transaction-note">${escapeHTML(transaction.note)}</div>`
                                    : ""}
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="category-pill">
                            ${escapeHTML(transaction.category)}
                        </span>
                    </td>
                    <td>
                        ${escapeHTML(formatDate(transaction.transaction_date))}
                    </td>
                    <td>
                        <span class="type-pill ${typeClass}">
                            ${isIncome ? "Income" : "Expense"}
                        </span>
                    </td>
                    <td class="amount-value ${typeClass}">
                        ${sign}${escapeHTML(money(transaction.amount))}
                    </td>
                    <td>
                        <div class="row-actions">
                            <button class="row-action"
                                    data-action="edit"
                                    data-id="${transaction.id}">
                                Edit
                            </button>
                            <button class="row-action delete"
                                    data-action="delete"
                                    data-id="${transaction.id}">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    $("#transactionFooter").textContent =
        `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;

    $("#viewAllButton").textContent = showAllTransactions
        ? "Show recent ↑"
        : "View all ↓";
}

function renderCashFlowChart(summary) {
    const canvas = $("#cashFlowChart");
    const empty = $("#cashFlowEmpty");

    const income = Number(summary.total_income) || 0;
    const expenses = Number(summary.total_expenses) || 0;
    const hasData = income > 0 || expenses > 0;

    empty.hidden = hasData;
    canvas.hidden = !hasData;

    cashFlowChart?.destroy();
    cashFlowChart = null;

    if (!hasData) return;

    cashFlowChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: ["Income", "Expenses"],
            datasets: [{
                label: "Amount",
                data: [income, expenses],
                backgroundColor: ["#55d6a3", "#ff7d8c"],
                borderRadius: 7,
                maxBarThickness: 65
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => money(context.raw)
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: "#a5b3cd" },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "#26324a" },
                    ticks: {
                        color: "#8996b2",
                        callback: (value) =>
                            new Intl.NumberFormat("en-IN", {
                                notation: "compact"
                            }).format(value)
                    },
                    border: { display: false }
                }
            }
        }
    });
}

function renderCategoryChart(categories) {
    const canvas = $("#categoryChart");
    const empty = $("#categoryEmpty");

    const filteredCategories = categories.filter(
        (item) => Number(item.total) > 0
    );

    const hasData = filteredCategories.length > 0;

    empty.hidden = hasData;
    canvas.hidden = !hasData;

    categoryChart?.destroy();
    categoryChart = null;

    if (!hasData) return;

    categoryChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: filteredCategories.map((item) => item.category),
            datasets: [{
                data: filteredCategories.map((item) => Number(item.total)),
                backgroundColor: [
                    "#7d9cff", "#55d6a3", "#ff7d8c", "#b29aff",
                    "#ffc778", "#61c7d9", "#e6a4d9", "#94a3b8",
                    "#c1d85a", "#f19a70"
                ],
                borderColor: "#121a2d",
                borderWidth: 4,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#bdc8dc",
                        padding: 14,
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 8,
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) =>
                            `${context.label}: ${money(context.raw)}`
                    }
                }
            }
        }
    });
}

async function refreshDashboard() {
    try {
        await Promise.all([
            loadTransactions(),
            loadSummary()
        ]);
    } catch (error) {
        showToast(error.message, true);
    }
}

function openAddDialog() {
    editingId = null;
    form.reset();

    $("#dialogTitle").textContent = "Add transaction";
    $("#saveTransaction").textContent = "Save transaction";
    $("#formError").textContent = "";

    $("#transactionType").value = "expense";
    $("#dateInput").value = localDateString();

    dialog.showModal();
}

function openEditDialog(transaction) {
    editingId = transaction.id;
    form.reset();

    $("#dialogTitle").textContent = "Edit transaction";
    $("#saveTransaction").textContent = "Update transaction";
    $("#formError").textContent = "";

    $("#titleInput").value = transaction.title;
    $("#amountInput").value = transaction.amount;
    $("#transactionType").value = transaction.transaction_type;
    $("#categoryInput").value = transaction.category;
    $("#dateInput").value = transaction.transaction_date;
    $("#noteInput").value = transaction.note || "";

    dialog.showModal();
}

async function handleFormSubmit(event) {
    event.preventDefault();
    $("#formError").textContent = "";

    const amount = Number($("#amountInput").value);
    const transactionDate = $("#dateInput").value;

    if (!Number.isFinite(amount) || amount <= 0) {
        $("#formError").textContent =
            "Enter an amount greater than zero.";
        return;
    }

    if (!transactionDate) {
        $("#formError").textContent =
            "Please select a transaction date.";
        return;
    }

    if (transactionDate > localDateString()) {
        $("#formError").textContent =
            "Transaction date cannot be in the future.";
        return;
    }

    const payload = {
        title: $("#titleInput").value.trim(),
        amount,
        transaction_type: $("#transactionType").value,
        category: $("#categoryInput").value,
        transaction_date: transactionDate,
        note: $("#noteInput").value.trim()
    };

    const wasEditing = editingId !== null;
    const saveButton = $("#saveTransaction");

    saveButton.disabled = true;
    saveButton.textContent = wasEditing ? "Updating..." : "Saving...";

    try {
        if (wasEditing) {
            await apiRequest(`${API.transactions}/${editingId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            showToast("Transaction updated successfully.");
        } else {
            await apiRequest(API.transactions, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showToast("Transaction added successfully.");
        }

        dialog.close();
        await refreshDashboard();
    } catch (error) {
        $("#formError").textContent = error.message;
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = wasEditing
            ? "Update transaction"
            : "Save transaction";
    }
}

async function deleteTransaction(id) {
    const transaction = transactions.find(
        (item) => item.id === id
    );

    if (!transaction) return;

    const confirmed = window.confirm(
        `Delete "${transaction.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
        await apiRequest(`${API.transactions}/${id}`, {
            method: "DELETE"
        });

        showToast("Transaction deleted successfully.");
        await refreshDashboard();
    } catch (error) {
        showToast(error.message, true);
    }
}

async function applyFilters() {
    try {
        // Validate before requesting data so invalid dates
        // do not replace the current transaction list.
        getFilters();
        await refreshDashboard();
    } catch (error) {
        showToast(error.message, true);
    }
}

$("#addTransactionButton").addEventListener("click", openAddDialog);

$("#closeDialog").addEventListener("click", () => dialog.close());
$("#cancelDialog").addEventListener("click", () => dialog.close());

form.addEventListener("submit", handleFormSubmit);

tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "edit") {
        const transaction = transactions.find(
            (item) => item.id === id
        );

        if (transaction) openEditDialog(transaction);
    }

    if (action === "delete") {
        deleteTransaction(id);
    }
});

$("#viewAllButton").addEventListener("click", () => {
    showAllTransactions = !showAllTransactions;
    renderTransactions();
});

$("#typeFilter").addEventListener("change", applyFilters);
$("#startDate").addEventListener("change", applyFilters);
$("#endDate").addEventListener("change", applyFilters);

$("#searchInput").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 300);
});

$("#clearFilters").addEventListener("click", () => {
    $("#searchInput").value = "";
    $("#typeFilter").value = "";
    $("#startDate").value = "";
    $("#endDate").value = "";

    applyFilters();
});

async function initializeApp() {
    try {
        await loadCategories();
        await refreshDashboard();
    } catch (error) {
        showToast(
            `Unable to load dashboard: ${error.message}`,
            true
        );
    }
}

initializeApp();
