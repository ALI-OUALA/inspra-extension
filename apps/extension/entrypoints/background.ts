export default defineBackground({
  type: "module",
  main() {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
    });

    chrome.commands.onCommand.addListener((command) => {
      if (command !== "toggle-capture") return;
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) return;
        chrome.tabs.sendMessage(tab.id, { type: "INSPRA_TOGGLE_CAPTURE" }, () => {
          void chrome.runtime.lastError;
        });
      });
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === "INSPRA_START_CAPTURE") {
        const tabId = message.tabId ?? sender.tab?.id;
        if (!tabId) {
          sendResponse({ ok: false, error: "No active tab found." });
          return true;
        }
        chrome.tabs.sendMessage(tabId, { type: "INSPRA_START_CAPTURE" }, (response) => {
          sendResponse(response ?? { ok: !chrome.runtime.lastError, error: chrome.runtime.lastError?.message });
        });
        return true;
      }

      if (message?.type === "INSPRA_OPEN_PANEL") {
        const windowId = sender.tab?.windowId;
        if (!windowId) {
          sendResponse({ ok: false, error: "No browser window found for side panel." });
          return true;
        }
        chrome.sidePanel?.open({ windowId })
          .then(() => sendResponse({ ok: true }))
          .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Side panel could not open." }));
        return true;
      }

      return false;
    });
  }
});
