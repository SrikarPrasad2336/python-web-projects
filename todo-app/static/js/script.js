
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const message = document.getElementById("message");
const emptyState = document.getElementById("empty-state");

let tasks = [];
let currentFilter = "all";

document.getElementById("today").textContent =
    new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date());

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
}

async function loadTasks() {
    try {
        tasks = await apiRequest("/api/tasks");
        renderTasks();
    } catch (error) {
        showMessage("Could not load tasks: " + error.message, true);
    }
}

function renderTasks() {
    taskList.replaceChildren();

    const visibleTasks = tasks.filter(task => {
        if (currentFilter === "pending") return !task.completed;
        if (currentFilter === "completed") return Boolean(task.completed);
        return true;
    });

    const completedCount = tasks.filter(task => task.completed).length;
    const pendingCount = tasks.length - completedCount;

    document.getElementById("total-count").textContent = tasks.length;
    document.getElementById("pending-count").textContent = pendingCount;
    document.getElementById("completed-count").textContent = completedCount;
    document.getElementById("footer-count").textContent =
        `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

    emptyState.hidden = visibleTasks.length !== 0;

    if (visibleTasks.length === 0) {
        const messages = {
            all: ["A fresh start!", "Add your first task to get started."],
            pending: ["All caught up!", "You have no pending tasks."],
            completed: ["Nothing completed yet", "Finish a task to see it here."]
        };

        document.getElementById("empty-title").textContent =
            messages[currentFilter][0];

        document.getElementById("empty-description").textContent =
            messages[currentFilter][1];
    }

    visibleTasks.forEach(task => {
        const item = document.createElement("li");
        item.className = "task-item";
        if (task.completed) item.classList.add("is-completed");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-check";
        checkbox.checked = Boolean(task.completed);
        checkbox.setAttribute("aria-label", `Complete ${task.title}`);

        checkbox.addEventListener("change", () => {
            updateTask(task.id, { completed: checkbox.checked });
        });

        const title = document.createElement("span");
        title.className = "task-title";
        title.textContent = task.title;

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "action-button";
        editButton.textContent = "Edit";
        editButton.setAttribute("aria-label", `Edit ${task.title}`);

        editButton.addEventListener("click", async () => {
            const newTitle = prompt("Edit your task:", task.title);

            if (newTitle === null) return;

            if (!newTitle.trim()) {
                showMessage("Task title cannot be empty.", true);
                return;
            }

            await updateTask(task.id, { title: newTitle.trim() });
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "action-button delete";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

        deleteButton.addEventListener("click", async () => {
            if (!confirm(`Delete "${task.title}"?`)) return;

            try {
                await apiRequest(`/api/tasks/${task.id}`, {
                    method: "DELETE"
                });

                showMessage("Task deleted successfully.");
                await loadTasks();
            } catch (error) {
                showMessage(error.message, true);
            }
        });

        actions.append(editButton, deleteButton);
        item.append(checkbox, title, actions);
        taskList.appendChild(item);
    });
}

async function updateTask(id, changes) {
    try {
        await apiRequest(`/api/tasks/${id}`, {
            method: "PUT",
            body: JSON.stringify(changes)
        });

        showMessage("Task updated successfully.");
        await loadTasks();
    } catch (error) {
        showMessage(error.message, true);
        await loadTasks();
    }
}

taskForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (!title) {
        showMessage("Please enter a task.", true);
        return;
    }

    try {
        await apiRequest("/api/tasks", {
            method: "POST",
            body: JSON.stringify({ title })
        });

        taskInput.value = "";
        currentFilter = "all";

        document.querySelectorAll(".filter").forEach(button => {
            button.classList.toggle("active", button.dataset.filter === "all");
        });

        showMessage("Task added successfully.");
        await loadTasks();
        taskInput.focus();
    } catch (error) {
        showMessage(error.message, true);
    }
});

document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll(".filter").forEach(filterButton => {
            filterButton.classList.toggle(
                "active",
                filterButton === button
            );
        });

        renderTasks();
    });
});

loadTasks();
