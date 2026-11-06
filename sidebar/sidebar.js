// Seitenleiste: Chat mit Claude über die Anthropic Messages API (Streaming).

const DEFAULTS = {
  mode: "api",             // "api" = eigener API-Schlüssel, "pro" = claude.ai mit Pro-Konto
  apiKey: "",
  model: "claude-sonnet-5-5",
  maxTokens: 4096,
  systemPrompt: "Du bist ein hilfreicher Assistent in der Seitenleiste des Zen Browsers. Antworte präzise und in der Sprache des Nutzers.",
};
const MAX_PAGE_CHARS = 60000;
const PRO_MAX_URL_CHARS = 8000;   // längere Prompts gehen über die Zwischenablage

const $ = (id) => document.getElementById(id);
const els = {
  messages: $("messages"), empty: $("empty"), form: $("form"), input: $("input"),
  send: $("send"), stop: $("stop"), includePage: $("includePage"), noKey: $("noKey"),
};

let settings = { ...DEFAULTS };
let history = [];          // [{role, content}]
let controller = null;     // AbortController für laufende Anfrage

// ---------- Einstellungen & Verlauf ----------
async function loadSettings() {
  const s = await browser.storage.local.get(Object.keys(DEFAULTS));
  settings = { ...DEFAULTS, ...s };
  els.noKey.hidden = settings.mode === "pro" || !!settings.apiKey;
  document.body.dataset.mode = settings.mode;
  $("modeBadge").textContent = settings.mode === "pro" ? "Pro" : "API";
  els.input.placeholder = settings.mode === "pro"
    ? "Nachricht → öffnet claude.ai  (Enter = senden)"
    : "Nachricht an Claude…  (Enter = senden, Shift+Enter = Zeile)";
  $("modeBadge").title = settings.mode === "pro"
    ? "Pro-Modus: Nachrichten werden in claude.ai mit deinem Konto geöffnet"
    : "API-Modus: Antworten direkt hier über deinen API-Schlüssel";
}

async function loadHistory() {
  const { chatHistory } = await browser.storage.local.get("chatHistory");
  history = Array.isArray(chatHistory) ? chatHistory : [];
  history.forEach((m) => addBubble(m.role, m.display || m.content));
}

const saveHistory = () => browser.storage.local.set({ chatHistory: history });

// ---------- UI ----------
function addBubble(role, text) {
  els.empty.hidden = true;
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  setBubble(div, role, text);
  els.messages.appendChild(div);
  scrollDown();
  return div;
}

function setBubble(div, role, text) {
  if (role === "assistant") {
    // Markdown-Ausgabe ist bereits HTML-escaped; Parsen via DOMParser (kein Skript-Ausführen).
    const doc = new DOMParser().parseFromString(window.renderMarkdown(text), "text/html");
    div.replaceChildren(...doc.body.childNodes);
  }
  else div.textContent = text;
  if (role === "assistant" && text) {
    const btn = document.createElement("button");
    btn.className = "copy"; btn.textContent = "Kopieren";
    btn.onclick = () => navigator.clipboard.writeText(text).then(() => (btn.textContent = "✓"));
    div.appendChild(btn);
  }
}

function scrollDown() { els.messages.scrollTop = els.messages.scrollHeight; }

function setBusy(busy) {
  els.send.hidden = busy;
  els.stop.hidden = !busy;
  els.input.disabled = busy;
}

function autosize() {
  els.input.style.height = "auto";
  els.input.style.height = Math.min(els.input.scrollHeight, 200) + "px";
}

// ---------- Seiteninhalt ----------
async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getPageContext(tabId) {
  const tab = tabId ? await browser.tabs.get(tabId) : await getActiveTab();
  if (!tab) throw new Error("Kein aktiver Tab gefunden.");
  let text = "";
  try {
    const [res] = await browser.tabs.executeScript(tab.id, {
      code: "(document.body && document.body.innerText) || ''",
    });
    text = res || "";
  } catch (e) {
    throw new Error("Auf diese Seite kann nicht zugegriffen werden (z. B. about:-Seiten oder Add-on-Store).");
  }
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  if (text.length > MAX_PAGE_CHARS) text = text.slice(0, MAX_PAGE_CHARS) + "\n…[gekürzt]";
  return { title: tab.title, url: tab.url, text };
}

// ---------- API ----------
async function streamClaude(messages, onDelta, signal) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: Number(settings.maxTokens) || DEFAULTS.maxTokens,
      system: settings.systemPrompt || undefined,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg += `: ${j.error?.message || JSON.stringify(j)}`; } catch {}
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const event = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const dataLine = event.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      let data;
      try { data = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
      if (data.type === "content_block_delta" && data.delta?.type === "text_delta") onDelta(data.delta.text);
      else if (data.type === "error") throw new Error(data.error?.message || "Stream-Fehler");
    }
  }
}

// ---------- Senden ----------
async function send(text, { withPage = els.includePage.checked, tabId, display } = {}) {
  text = text.trim();
  if (!text || controller) return;
  await loadSettings();
  if (settings.mode === "pro") return sendToClaudeAi(text, { withPage, tabId, display });
  if (!settings.apiKey) { els.noKey.hidden = false; return; }

  let content = text;
  if (withPage) {
    try {
      const page = await getPageContext(tabId);
      content = `<webseite titel="${page.title}" url="${page.url}">\n${page.text}\n</webseite>\n\n${text}`;
    } catch (e) {
      addBubble("error", e.message);
      return;
    }
  }

  const shown = display || text;
  history.push({ role: "user", content, display: shown });
  addBubble("user", shown);
  els.input.value = ""; autosize();

  const bubble = addBubble("assistant", "");
  bubble.classList.add("typing");
  let answer = "";
  controller = new AbortController();
  setBusy(true);

  try {
    await streamClaude(
      history.map(({ role, content }) => ({ role, content })),
      (delta) => { answer += delta; setBubble(bubble, "assistant", answer); scrollDown(); },
      controller.signal
    );
  } catch (e) {
    if (e.name !== "AbortError") {
      bubble.remove();
      addBubble("error", "Fehler: " + e.message);
      history.pop();               // fehlgeschlagene Nutzernachricht nicht im Verlauf behalten
      await saveHistory();
      controller = null; setBusy(false);
      return;
    }
  } finally {
    bubble.classList.remove("typing");
  }

  if (!answer) answer = "_(abgebrochen)_";
  setBubble(bubble, "assistant", answer);
  history.push({ role: "assistant", content: answer });
  await saveHistory();
  controller = null;
  setBusy(false);
  els.input.focus();
}

// ---------- Pro-Modus: an claude.ai übergeben ----------
async function sendToClaudeAi(text, { withPage, tabId, display }) {
  let prompt = text;
  if (withPage) {
    try {
      const page = await getPageContext(tabId);
      prompt = `Webseite: ${page.title}\n${page.url}\n\n"""\n${page.text}\n"""\n\n${text}`;
    } catch (e) {
      addBubble("error", e.message);
      return;
    }
  }

  const encoded = encodeURIComponent(prompt);
  let url = "https://claude.ai/new";
  let note;
  if (encoded.length <= PRO_MAX_URL_CHARS) {
    url += "?q=" + encoded;
    note = "In claude.ai geöffnet ↗";
  } else {
    try {
      await navigator.clipboard.writeText(prompt);
      note = "Zu lang für einen Link – der Text liegt in der Zwischenablage. In claude.ai mit Strg+V einfügen ↗";
    } catch {
      addBubble("error", "Der Text ist zu lang für einen Link und konnte nicht in die Zwischenablage kopiert werden.");
      return;
    }
  }

  addBubble("user", display || text);
  const info = addBubble("info", note);
  info.title = "Die Antwort erscheint im claude.ai-Tab und läuft über dein Pro-Konto.";
  els.input.value = ""; autosize();
  await browser.tabs.create({ url, active: true });
}

// ---------- Aufgaben aus dem Kontextmenü ----------
async function handleTask(task) {
  if (!task) return;
  await browser.storage.local.remove("pendingTask");
  if (task.kind === "prefill") {
    els.input.value = task.text; autosize(); els.input.focus();
    els.input.setSelectionRange(task.text.length, task.text.length);
  } else if (task.kind === "send") {
    send(task.text, { withPage: false });
  } else if (task.kind === "summarize") {
    summarize(task.tabId);
  }
}

function summarize(tabId) {
  send("Fasse diese Webseite prägnant zusammen: zuerst ein Satz als Kernaussage, dann die wichtigsten Punkte als Liste.",
       { withPage: true, tabId, display: "📄 Seite zusammenfassen" });
}

// ---------- Events ----------
els.form.addEventListener("submit", (e) => { e.preventDefault(); send(els.input.value); });
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(els.input.value); }
});
els.input.addEventListener("input", autosize);
els.stop.addEventListener("click", () => controller && controller.abort());
$("summarize").addEventListener("click", () => summarize());
$("newChat").addEventListener("click", async () => {
  if (controller) controller.abort();
  history = []; await saveHistory();
  els.messages.querySelectorAll(".msg").forEach((n) => n.remove());
  els.empty.hidden = false;
});
const openOptions = (e) => { e && e.preventDefault(); browser.runtime.openOptionsPage(); };
$("settings").addEventListener("click", openOptions);
$("openOptions").addEventListener("click", openOptions);

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.pendingTask?.newValue) handleTask(changes.pendingTask.newValue);
  if (Object.keys(DEFAULTS).some((k) => k in changes)) loadSettings();
});

// ---------- Start ----------
(async () => {
  await loadSettings();
  await loadHistory();
  const { pendingTask } = await browser.storage.local.get("pendingTask");
  if (pendingTask && Date.now() - pendingTask.ts < 30000) handleTask(pendingTask);
  els.input.focus();
})();
