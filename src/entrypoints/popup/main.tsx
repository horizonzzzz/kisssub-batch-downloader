import { createRoot } from "react-dom/client"

import "./style.css"

import { PopupContainer } from "../../components/popup"

const container = document.getElementById("app")

if (!container) {
  throw new Error("Popup root container was not found.")
}

createRoot(container).render(<PopupContainer />)
