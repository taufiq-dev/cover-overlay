import path from "node:path";
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

const demoModules = path.resolve(import.meta.dirname, "node_modules");

// No HTTPS here, unlike a camera demo: nothing on the page needs a secure context, so a phone on
// the LAN can open http://<your-ip>:3002 directly.
export default defineConfig({
  plugins: [pluginReact()],
  html: { title: "cover-overlay demo" },
  server: { host: "0.0.0.0", port: 3002 },
  resolve: {
    alias: { "@cover-overlay": path.resolve(import.meta.dirname, "../components/CoverOverlay") },
  },
  tools: {
    rspack: {
      // ../components stays a plain folder with no node_modules of its own, so its bare imports
      // (react, styled-components) resolve against this app's dependencies.
      resolve: { modules: [demoModules, "node_modules"] },
    },
  },
});
