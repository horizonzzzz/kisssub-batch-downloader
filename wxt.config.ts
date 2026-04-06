import { defineConfig } from "wxt"

export default defineConfig({
  browser: "chrome",
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  outDir: "build",
  outDirTemplate: "chrome-mv3-prod",
  manifest: {
    name: "Anime BT Batch",
    description:
      "Select posts from supported anime BT source pages, resolve real download links, and send them to qBittorrent in one batch.",
    minimum_chrome_version: "114",
    permissions: ["storage", "tabs", "scripting"],
    host_permissions: [
      "http://www.kisssub.org/*",
      "https://www.kisssub.org/*",
      "http://*/*",
      "https://*/*"
    ],
    icons: {
      16: "/icon.png",
      32: "/icon.png",
      48: "/icon.png",
      64: "/icon.png",
      128: "/icon.png"
    },
    action: {
      default_title: "Anime BT Batch",
      default_popup: "popup.html",
      default_icon: {
        16: "/icon.png",
        32: "/icon.png"
      }
    },
    options_ui: {
      page: "options.html",
      open_in_tab: true
    }
  }
})
