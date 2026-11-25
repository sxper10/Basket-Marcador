import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import favicon from "./assets/turina-escudo-mini.png";

// El icono de la pestaña es el escudo oficial del instituto.
const icon = document.createElement("link");
icon.rel = "icon";
icon.type = "image/png";
icon.href = favicon;
document.head.appendChild(icon);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
