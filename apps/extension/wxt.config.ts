import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [react()]
  }),
  manifest: {
    name: "Inspra",
    short_name: "Inspra",
    description: "The first Inspra product: capture web inspiration and experience patterns as reusable AI-agent-ready skills.",
    version: "0.1.0",
    permissions: ["activeTab", "storage", "sidePanel", "tabs"],
    optional_host_permissions: ["<all_urls>"],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "Open Inspra Extension",
      default_popup: "popup.html",
      default_icon: {
        "16": "icon/16.png",
        "32": "icon/32.png",
        "48": "icon/48.png",
        "128": "icon/128.png"
      }
    },
    side_panel: {
      default_path: "sidepanel.html"
    },
    commands: {
      "toggle-capture": {
        suggested_key: {
          default: "Alt+Shift+I",
          mac: "Alt+Shift+I"
        },
        description: "Toggle Inspra capture mode"
      }
    },
    icons: {
      "16": "icon/16.png",
      "32": "icon/32.png",
      "48": "icon/48.png",
      "128": "icon/128.png"
    }
  }
});
