# Seguimiento presupuestal · Jefatura de Innovación — Universidad de La Sabana

Prueba de concepto del **front end** del simulador de seguimiento presupuestal.
Reescritura de la SPA original (JS vanilla) a **React + TypeScript** con **Vite**,
línea gráfica institucional y **estado en memoria** (sin backend).

> Los datos se guardan en `localStorage` del navegador. No hay servidor ni base de
> datos: es una demostración funcional de la interfaz y del flujo de trabajo.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **react-router-dom** (HashRouter, para despliegue estático portable)
- Estado en memoria con Context + persistencia en `localStorage`
- Sistema de diseño propio en CSS (`src/styles/globals.css`) alineado al manual de marca

## Puesta en marcha

```bash
npm install
npm run dev        # entorno de desarrollo
npm run build      # build de producción -> dist/
npm run preview    # sirve el build localmente
```

## Usuarios de demostración

| Usuario    | Rol               | Contraseña    |
| ---------- | ----------------- | ------------- |
| `jefatura` | Jefatura          | `Sabana2026!` |
| `gestor`   | Gestor financiero | `Sabana2026!` |
| `mariana`  | Líder de proyecto | `Sabana2026!` |

## Estructura (arquitectura por features)

```
src/
  app/           # bootstrap: router, guardas
  features/      # dominios: auth, dashboard, projects, cycles, expenses, catalogs, users
  components/    # UI compartida (icons, ui, Modal, Toast) y layout (AppShell, Sidebar, Topbar)
  store/         # estado en memoria + persistencia + reglas de sesión
  lib/           # dominio puro: tipos, formato, cálculos, flujo de vigencia, datos semilla
  styles/        # sistema de diseño (globals.css)
  assets/        # tipografías y logos institucionales
```

## Despliegue

El build (`dist/`) es estático y `base` es relativo (`./`), por lo que funciona
servido desde cualquier subruta (GitHub Pages, Netlify, hosting estático).
Incluye un flujo de GitHub Actions (`.github/workflows/deploy.yml`) que publica en
GitHub Pages al hacer push a la rama `desarrollo` (requiere activar Pages con
origen «GitHub Actions» en la configuración del repositorio).
