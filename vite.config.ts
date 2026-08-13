import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// base "./" -> rutas de assets relativas: la SPA funciona servida desde
// cualquier subruta (GitHub Pages, Netlify, static) sin reconfigurar.
//
// NOTA: El alias "@" usa path.resolve(process.cwd(), "src") en lugar de
// import.meta.url porque este proyecto vive en un directorio cuyo nombre
// contiene "&" y caracteres Unicode. import.meta.url resuelve al path real
// (con "&"), que los navegadores no pueden importar como módulo ES (el "&"
// no codificado rompe el fetch silenciosamente). Al iniciar Vite desde la
// junction C:\SimuladorDev, process.cwd() devuelve la ruta limpia y todos
// los módulos se sirven como /src/... sin el prefijo /@fs/.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  server: {
    fs: {
      strict: false,
    },
  },
});
