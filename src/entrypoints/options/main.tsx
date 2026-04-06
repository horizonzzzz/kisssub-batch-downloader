import { createRoot } from "react-dom/client"

import "./style.css"

import { OptionsPage } from "../../components/options/OptionsPage"
import { optionsApi } from "./api"

const container = document.getElementById("app")

if (!container) {
  throw new Error("Options root container was not found.")
}

createRoot(container).render(<OptionsPage api={optionsApi} />)
