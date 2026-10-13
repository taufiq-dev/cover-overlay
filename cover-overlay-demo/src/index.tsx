import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { GlobalStyle } from "./app.styles";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    <GlobalStyle />
    <App />
  </StrictMode>,
);
