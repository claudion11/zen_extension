// Hintergrundskript: Kontextmenüs, Toolbar-Button, Übergabe von Aufgaben an die Seitenleiste.

const MENU = {
  ASK: "zc-ask-selection",
  EXPLAIN: "zc-explain-selection",
  TRANSLATE: "zc-translate-selection",
  SUMMARIZE: "zc-summarize-page",
};

browser.runtime.onInstalled.addListener(() => {
  browser.menus.removeAll().then(() => {
    browser.menus.create({ id: MENU.ASK, title: "Claude fragen: „%s“", contexts: ["selection"] });
    browser.menus.create({ id: MENU.EXPLAIN, title: "Mit Claude erklären", contexts: ["selection"] });
    browser.menus.create({ id: MENU.TRANSLATE, title: "Mit Claude übersetzen (Deutsch)", contexts: ["selection"] });
    browser.menus.create({ id: MENU.SUMMARIZE, title: "Seite mit Claude zusammenfassen", contexts: ["page", "frame"] });
  });
});

browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.toggle();
});

browser.menus.onClicked.addListener((info, tab) => {
  // sidebarAction.open() muss synchron im User-Event-Handler aufgerufen werden.
  browser.sidebarAction.open();

  let task;
  const sel = (info.selectionText || "").trim();
  switch (info.menuItemId) {
    case MENU.ASK:
      task = { kind: "prefill", text: `Zu folgendem Text:\n\n"""\n${sel}\n"""\n\n` };
      break;
    case MENU.EXPLAIN:
      task = { kind: "send", text: `Erkläre mir bitte verständlich folgenden Text:\n\n"""\n${sel}\n"""` };
      break;
    case MENU.TRANSLATE:
      task = { kind: "send", text: `Übersetze folgenden Text ins Deutsche (falls er schon Deutsch ist, ins Englische). Gib nur die Übersetzung aus:\n\n"""\n${sel}\n"""` };
      break;
    case MENU.SUMMARIZE:
      task = { kind: "summarize", tabId: tab && tab.id };
      break;
    default:
      return;
  }
  task.ts = Date.now();
  // Über storage übergeben, damit die Seitenleiste die Aufgabe auch erhält, wenn sie gerade erst lädt.
  browser.storage.local.set({ pendingTask: task });
});
