const USERS = {
  bauen2024: { role: "Admin", permissions: "write" },
  anschauen: { role: "Viewer", permissions: "read" },
};

const API_BASE_CANDIDATES = createApiBaseCandidates();
let apiBaseUrl = API_BASE_CANDIDATES[0];
let apiBasePromise = null;
const HOUSE_ROOMS = [
  "Bad",
  "Schlafzimmer",
  "Kinderzimmer",
  "Wohnzimmer",
  "Küche",
  "Eingang & Treppen",
  "Hauswirtschaftsraum",
  "Technik",
];
const generateId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let currentUser = null;
let todos = [];
let isLoadingTodos = false;
let todoError = "";

const loginSection = document.getElementById("login-section");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("password");
const userRole = document.getElementById("user-role");
const logoutButton = document.getElementById("logout");
const scopeSelect = document.getElementById("scope-select");
const roomSelect = document.getElementById("room-select");
const roomLabel = document.getElementById("room-label");
const todoList = document.getElementById("todo-list");
const todoForm = document.getElementById("todo-form");
const viewerInfo = document.getElementById("viewer-info");
const todoTitle = document.getElementById("todo-title");
const todoScope = document.getElementById("todo-scope");
const todoRoomGroup = document.getElementById("todo-room-group");
const todoRoom = document.getElementById("todo-room");
const todoNotes = document.getElementById("todo-notes");
const completedCount = document.getElementById("completed-count");
const totalCount = document.getElementById("total-count");
const progressPercent = document.getElementById("progress-percent");
const progressBarFill = document.getElementById("progress-bar-fill");
const houseMap = document.getElementById("house-map");
const houseZones = houseMap
  ? Array.from(houseMap.querySelectorAll("[data-room-zone]"))
  : [];
const todoStatus = document.getElementById("todo-status");

function updateRoomFilterVisibility() {
  if (scopeSelect.value === "room") {
    roomLabel.classList.remove("hidden");
    roomSelect.classList.remove("hidden");
  } else {
    roomLabel.classList.add("hidden");
    roomSelect.classList.add("hidden");
  }
}

function setTodoStatus(message = "", type = "info") {
  if (!todoStatus) {
    return;
  }
  todoStatus.textContent = message;
  todoStatus.dataset.state = message ? type : "";
  todoStatus.classList.toggle("hidden", !message);
}

function describeFetchError(error) {
  if (!error) {
    return "Unbekannter Fehler";
  }
  const message = typeof error.message === "string" ? error.message : "";
  if (!message) {
    return "Unbekannter Fehler";
  }
  if (message === "Failed to fetch" || message === "TypeError: Failed to fetch") {
    return "Failed to fetch – prüfen Sie die API-URL, HTTPS-Konfiguration oder CORS-Einstellungen.";
  }
  return message;
}

async function parseErrorResponse(response) {
  try {
    const data = await response.json();
    if (data?.code) {
      return `${response.status} (${data.code})`;
    }
    if (data?.message) {
      return `${response.status} (${data.message})`;
    }
    if (data?.error) {
      return `${response.status} (${data.error})`;
    }
    return `${response.status}`;
  } catch (error) {
    return `${response.status}`;
  }
}

async function fetchTodosFromServer() {
  isLoadingTodos = true;
  todoError = "";
  setTodoStatus("Aufgaben werden geladen…", "loading");
  try {
    const baseUrl = await ensureApiBase();
    const response = await fetch(`${baseUrl}/todos`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const label = await parseErrorResponse(response);
      throw new Error(`Server returned ${label}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Unerwartete Antwort vom Server");
    }
    todos = data;
    if (todoStatus?.dataset.state !== "success") {
      setTodoStatus("");
    }
  } catch (error) {
    console.error("Konnte Aufgaben nicht laden", error);
    const message =
      "Die Aufgaben konnten nicht vom Server geladen werden. Bitte versuchen Sie es später erneut.";
    const reason = describeFetchError(error);
    todoError = `${message} (${reason})`;
    setTodoStatus(todoError, "error");
  } finally {
    isLoadingTodos = false;
    renderTodos();
    updateRoomOptions();
    updateProgress();
    updateHouseMap();
  }
}

function login(password) {
  const user = USERS[password];
  if (!user) {
    return false;
  }
  currentUser = user;
  sessionStorage.setItem("casaheueisen_user", JSON.stringify(user));
  renderApp();
  return true;
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem("casaheueisen_user");
  passwordInput.value = "";
  todoForm.reset();
  todoRoomGroup.classList.add("hidden");
  todoRoom.required = false;
  viewerInfo.classList.add("hidden");
  dashboard.classList.add("hidden");
  loginSection.classList.remove("hidden");
  todos = [];
  setTodoStatus("");
}

function restoreSession() {
  try {
    const stored = sessionStorage.getItem("casaheueisen_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.role) {
        currentUser = parsed;
        renderApp();
      }
    }
  } catch (error) {
    console.error("Session konnte nicht wiederhergestellt werden", error);
  }
}

function renderApp() {
  if (!currentUser) {
    return;
  }
  userRole.textContent = `${currentUser.role} · ${currentUser.permissions === "write" ? "Lese- & Schreibrechte" : "Nur Leserechte"}`;
  loginSection.classList.add("hidden");
  dashboard.classList.remove("hidden");

  if (currentUser.permissions === "write") {
    todoForm.classList.remove("hidden");
    viewerInfo.classList.add("hidden");
  } else {
    todoForm.classList.add("hidden");
    viewerInfo.classList.remove("hidden");
  }
  updateRoomFilterVisibility();
  fetchTodosFromServer();
}

function createTodoItemElement(item) {
  const li = document.createElement("li");
  li.className = "todo";

  const header = document.createElement("div");
  header.className = "todo__header";

  const title = document.createElement("h3");
  title.textContent = item.title;

  const meta = document.createElement("div");
  meta.className = "todo__meta";

  const badge = document.createElement("span");
  badge.className = "badge" + (item.scope === "room" ? " badge--room" : "");
  badge.textContent = item.scope === "room" ? "Raumbezug" : "Allgemein";
  meta.appendChild(badge);

  if (item.scope === "room" && item.room) {
    const roomBadge = document.createElement("span");
    roomBadge.className = "badge badge--room";
    roomBadge.textContent = item.room;
    meta.appendChild(roomBadge);
  }

  header.appendChild(title);
  header.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "todo__actions";

  const status = document.createElement("span");
  status.textContent = item.completed ? "Erledigt" : "Offen";
  status.className = "badge";
  if (item.completed) {
    status.style.background = "rgba(34, 197, 94, 0.2)";
    status.style.color = "#15803d";
  }
  actions.appendChild(status);

  if (currentUser && currentUser.permissions === "write") {
    const toggleButton = document.createElement("button");
    toggleButton.textContent = item.completed ? "Zurück auf offen" : "Als erledigt markieren";
    toggleButton.dataset.action = "toggle";
    toggleButton.addEventListener("click", () => toggleTodo(item.id));
    actions.appendChild(toggleButton);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Löschen";
    deleteButton.dataset.action = "delete";
    deleteButton.addEventListener("click", () => deleteTodo(item.id));
    actions.appendChild(deleteButton);
  }

  const notes = document.createElement("p");
  notes.className = "todo__notes";
  notes.textContent = item.notes || "";

  li.appendChild(header);
  li.appendChild(actions);
  li.appendChild(notes);

  if (item.completed) {
    li.style.opacity = 0.75;
  }

  return li;
}

function renderTodos() {
  const filterScope = scopeSelect.value;
  const selectedRoom = roomSelect.value;
  todoList.innerHTML = "";

  if (isLoadingTodos && !todos.length) {
    const loading = document.createElement("li");
    loading.className = "todo todo--status";
    const strong = document.createElement("strong");
    strong.textContent = "Aufgaben werden geladen…";
    loading.appendChild(strong);
    todoList.appendChild(loading);
    return;
  }

  if (todoError && !todos.length) {
    const errorItem = document.createElement("li");
    errorItem.className = "todo todo--status";
    const strong = document.createElement("strong");
    strong.textContent = "Keine Aufgaben verfügbar.";
    const message = document.createElement("p");
    message.textContent = todoError;
    errorItem.appendChild(strong);
    errorItem.appendChild(message);
    todoList.appendChild(errorItem);
    return;
  }

  const filtered = todos.filter((item) => {
    if (filterScope === "general") {
      return item.scope === "general";
    }
    if (filterScope === "room") {
      if (selectedRoom && selectedRoom !== "all") {
        return item.scope === "room" && item.room === selectedRoom;
      }
      return item.scope === "room";
    }
    return true;
  });

  if (!filtered.length) {
    const empty = document.createElement("li");
    empty.className = "todo";
    empty.innerHTML = "<strong>Keine Aufgaben gefunden.</strong>";
    todoList.appendChild(empty);
    return;
  }

  filtered
    .sort((a, b) => Number(a.completed) - Number(b.completed))
    .forEach((item) => {
      const element = createTodoItemElement(item);
      todoList.appendChild(element);
    });
}

function updateRoomOptions() {
  const previousSelection = roomSelect.value;
  const rooms = Array.from(
    new Set([
      ...HOUSE_ROOMS,
      ...todos
        .filter((t) => t.scope === "room" && t.room)
        .map((t) => t.room),
    ])
  ).filter(Boolean);
  roomSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Alle Räume";
  roomSelect.appendChild(allOption);

  rooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = room;
    roomSelect.appendChild(option);
  });

  if (previousSelection && (previousSelection === "all" || rooms.includes(previousSelection))) {
    roomSelect.value = previousSelection;
  }
}

function updateProgress() {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  totalCount.textContent = total;
  completedCount.textContent = completed;
  progressPercent.textContent = `${percent}%`;
  progressBarFill.style.width = `${percent}%`;
}

async function toggleTodo(id) {
  if (!currentUser || currentUser.permissions !== "write") {
    return;
  }
  const todo = todos.find((item) => item.id === id);
  if (!todo) {
    return;
  }

  const newCompletedState = !todo.completed;
  try {
    const baseUrl = await ensureApiBase();
    const response = await fetch(`${baseUrl}/todos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ completed: newCompletedState }),
    });
    if (!response.ok) {
      const label = await parseErrorResponse(response);
      throw new Error(`Server returned ${label}`);
    }
  } catch (error) {
    console.error("Konnte Aufgabe nicht aktualisieren", error);
    setTodoStatus(
      `Die Aufgabe konnte nicht aktualisiert werden. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut. (${describeFetchError(error)})`,
      "error"
    );
    return;
  }

  await fetchTodosFromServer();
}

async function deleteTodo(id) {
  if (!currentUser || currentUser.permissions !== "write") {
    return;
  }
  try {
    const baseUrl = await ensureApiBase();
    const response = await fetch(`${baseUrl}/todos/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const label = await parseErrorResponse(response);
      throw new Error(`Server returned ${label}`);
    }
  } catch (error) {
    console.error("Konnte Aufgabe nicht löschen", error);
    setTodoStatus(
      `Die Aufgabe konnte nicht gelöscht werden. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut. (${describeFetchError(error)})`,
      "error"
    );
    return;
  }

  await fetchTodosFromServer();
}

async function addTodo({ title, scope, room, notes }) {
  const todo = {
    id: generateId(),
    title,
    scope,
    room: scope === "room" ? room?.trim() || "Unbenannter Raum" : undefined,
    notes,
    completed: false,
  };
  try {
    const baseUrl = await ensureApiBase();
    const response = await fetch(`${baseUrl}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(todo),
    });
    if (!response.ok) {
      const label = await parseErrorResponse(response);
      throw new Error(`Server returned ${label}`);
    }
    setTodoStatus("Aufgabe wurde gespeichert.", "success");
  } catch (error) {
    console.error("Konnte Aufgabe nicht speichern", error);
    setTodoStatus(
      `Die Aufgabe konnte nicht gespeichert werden. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut. (${describeFetchError(error)})`,
      "error"
    );
    return;
  }

  todoForm.reset();
  todoRoomGroup.classList.add("hidden");
  todoRoom.required = false;
  await fetchTodosFromServer();
}

function ensureRoomOption(roomName) {
  if (!roomName || roomName === "all") {
    return;
  }
  const existingOption = Array.from(roomSelect.options).find(
    (option) => option.value === roomName
  );
  if (!existingOption) {
    const option = document.createElement("option");
    option.value = roomName;
    option.textContent = roomName;
    roomSelect.appendChild(option);
  }
}

function selectRoom(roomName) {
  scopeSelect.value = "room";
  updateRoomFilterVisibility();
  updateRoomOptions();
  ensureRoomOption(roomName);
  roomSelect.value = roomName;
  renderTodos();
  updateHouseMap();
}

function getRoomStats(roomName) {
  const tasks = todos.filter((todo) => todo.scope === "room" && todo.room === roomName);
  const open = tasks.filter((todo) => !todo.completed).length;
  return { open, total: tasks.length };
}

function updateHouseMap() {
  if (!houseZones.length) {
    return;
  }
  const selectedScope = scopeSelect.value;
  const selectedRoom = roomSelect.value;

  houseZones.forEach((zone) => {
    const roomName = zone.dataset.roomZone;
    const counter = zone.querySelector(".house-map__count");
    const displayLabel = zone.dataset.roomLabel || roomName;
    const { open, total } = getRoomStats(roomName);
    if (counter) {
      counter.textContent = total ? `${open}/${total}` : "0";
      counter.dataset.open = open;
      counter.dataset.total = total;
    }

    const label = zone.querySelector(".house-map__label");
    if (label) {
      label.textContent = displayLabel;
    }

    zone.classList.toggle(
      "is-selected",
      selectedScope === "room" && selectedRoom === roomName
    );
    zone.classList.toggle("is-empty", total === 0);
    zone.setAttribute(
      "aria-pressed",
      selectedScope === "room" && selectedRoom === roomName ? "true" : "false"
    );

    zone.setAttribute(
      "aria-label",
      total
        ? `${roomName}: ${open} von ${total} Aufgaben offen`
        : `${roomName}: keine Aufgaben`
    );
  });
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = passwordInput.value.trim();
  if (!login(password)) {
    loginForm.classList.add("shake");
    passwordInput.setCustomValidity("Ungültiges Passwort");
    passwordInput.reportValidity();
    setTimeout(() => passwordInput.setCustomValidity(""), 400);
    setTimeout(() => loginForm.classList.remove("shake"), 500);
    passwordInput.focus();
    return;
  }
});

logoutButton.addEventListener("click", logout);

scopeSelect.addEventListener("change", () => {
  updateRoomFilterVisibility();
  renderTodos();
  updateHouseMap();
});

roomSelect.addEventListener("change", () => {
  renderTodos();
  updateHouseMap();
});

todoScope.addEventListener("change", () => {
  if (todoScope.value === "room") {
    todoRoomGroup.classList.remove("hidden");
    todoRoom.required = true;
  } else {
    todoRoomGroup.classList.add("hidden");
    todoRoom.required = false;
    todoRoom.value = "";
  }
});

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || currentUser.permissions !== "write") {
    return;
  }

  const data = {
    title: todoTitle.value.trim(),
    scope: todoScope.value,
    room: todoRoom.value,
    notes: todoNotes.value.trim(),
  };

  if (!data.title) {
    todoTitle.focus();
    return;
  }

  if (data.scope === "room" && !data.room.trim()) {
    todoRoom.focus();
    return;
  }

  await addTodo(data);
});

function createApiBaseCandidates() {
  const candidates = [];
  const seen = new Set();

  const addCandidate = (value) => {
    if (!value) {
      return;
    }
    const normalized = value.replace(/\/+$/, "");
    if (!normalized) {
      return;
    }
    if (!seen.has(normalized)) {
      candidates.push(normalized);
      seen.add(normalized);
    }
  };

  const addWithPhpFallback = (value) => {
    addCandidate(value);
    if (value && !/\.php$/i.test(value)) {
      addCandidate(`${value.replace(/\/+$/, "")}/index.php`);
    }
  };

  const configured = window.APP_CONFIG?.apiBaseUrl;
  if (typeof configured === "string" && configured.trim()) {
    addWithPhpFallback(configured.trim());
  }

  const defaultBase = window.location.protocol === "file:" ? "http://localhost:3000/api" : "/api";
  addWithPhpFallback(defaultBase);

  return candidates.length ? candidates : ["/api"];
}

async function ensureApiBase() {
  if (!apiBasePromise) {
    apiBasePromise = detectApiBase()
      .then((base) => {
        apiBaseUrl = base;
        console.info(`Verwende API-Basis: ${base}`);
        return base;
      })
      .catch((error) => {
        apiBasePromise = null;
        throw error;
      });
  }
  return apiBasePromise;
}

async function detectApiBase() {
  const errors = [];
  for (const candidate of API_BASE_CANDIDATES) {
    const base = candidate.replace(/\/+$/, "");
    const endpoints = ["health", "todos"];
    for (const endpoint of endpoints) {
      const url = `${base}/${endpoint}`;
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (response.ok) {
          return base;
        }
        errors.push(`${url} → HTTP ${response.status}`);
      } catch (error) {
        errors.push(`${url} → ${error?.message || "Netzwerkfehler"}`);
      }
    }
  }

  const diagnostic = errors.length ? errors.join("; ") : "Keine Kandidaten getestet.";
  throw new Error(
    `Keine API erreichbar. Prüfen Sie app.config.js oder die Server-Konfiguration. (${diagnostic})`
  );
}

houseZones.forEach((zone) => {
  zone.addEventListener("click", () => selectRoom(zone.dataset.roomZone));
});

restoreSession();
updateRoomFilterVisibility();
renderTodos();
updateRoomOptions();
updateProgress();
updateHouseMap();
