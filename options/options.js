const DEFAULTS = {
  apiKey: "",
  model: "claude-sonnet-5-5",
  maxTokens: 4096,
  systemPrompt: "Du bist ein hilfreicher Assistent in der Seitenleiste des Zen Browsers. Antworte präzise und in der Sprache des Nutzers.",
};
const $ = (id) => document.getElementById(id);
const status = (t) => { $("status").textContent = t; };

function currentModel() {
  return $("modelSelect").value === "custom" ? $("customModel").value.trim() : $("modelSelect").value;
}

async function load() {
  const s = { ...DEFAULTS, ...(await browser.storage.local.get(Object.keys(DEFAULTS))) };
  $("apiKey").value = s.apiKey;
  $("maxTokens").value = s.maxTokens;
  $("systemPrompt").value = s.systemPrompt;
  const known = [...$("modelSelect").options].some((o) => o.value === s.model);
  $("modelSelect").value = known ? s.model : "custom";
  $("customModel").value = known ? "" : s.model;
  $("customModel").hidden = known;
}

$("modelSelect").addEventListener("change", () => { $("customModel").hidden = $("modelSelect").value !== "custom"; });

$("save").addEventListener("click", async () => {
  await browser.storage.local.set({
    apiKey: $("apiKey").value.trim(),
    model: currentModel() || DEFAULTS.model,
    maxTokens: Number($("maxTokens").value) || DEFAULTS.maxTokens,
    systemPrompt: $("systemPrompt").value,
  });
  status("Gespeichert ✓");
});

$("test").addEventListener("click", async () => {
  status("Teste…");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": $("apiKey").value.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: currentModel(), max_tokens: 16, messages: [{ role: "user", content: "Sag nur: OK" }] }),
    });
    const j = await res.json();
    status(res.ok ? "Verbindung OK ✓" : `Fehler ${res.status}: ${j.error?.message || ""}`);
  } catch (e) {
    status("Fehler: " + e.message);
  }
});

$("clear").addEventListener("click", async () => {
  await browser.storage.local.set({ chatHistory: [] });
  status("Verlauf gelöscht (Seitenleiste neu öffnen).");
});

load();
