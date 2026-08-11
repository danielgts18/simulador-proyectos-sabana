import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// base "./" -> rutas de assets relativas: la SPA funciona servida desde
// cualquier subruta (GitHub Pages, Netlify, static) sin reconfigurar.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
