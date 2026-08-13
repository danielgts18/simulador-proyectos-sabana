# Simulador Presupuestal — Universidad de La Sabana

Herramienta interna para gestión y seguimiento presupuestal de proyectos de innovación de la Dirección de Innovación, Investigación, Transferencia y Emprendimiento (IITE).

## Reglas de trabajo (leer siempre)

**Local-first obligatorio.** Todos los cambios de código se implementan y verifican localmente. El push a GitHub y cualquier acción sobre AWS en producción requieren **autorización explícita del usuario** antes de ejecutarse.

### Requiere autorización antes de ejecutar
- `git push` a cualquier rama remota
- `amplify start-job` (deploy manual)
- `cdk deploy` de cualquier stack
- Modificar recursos AWS en producción (Lambdas, variables Amplify, secrets, RDS)

### Flujo estándar de un cambio
1. Implementar cambios localmente
2. Verificar TypeScript: `cd frontend && ./node_modules/.bin/tsc --noEmit`
3. `git add` + `git commit` local
4. **Pausar** — mostrar resumen de archivos y consecuencias del push
5. Esperar confirmación del usuario → entonces ejecutar `git push`

> Skill disponible: invoca `/simulador` para cargar las instrucciones completas del flujo de trabajo.

## Arquitectura general

```
React SPA (Amplify)
        │  HTTPS · Authorization: Bearer <JWT>
        ▼
API Gateway REST v1  (us-east-1)
        │
  ┌─────┴──────────────────────────────────────────────────────┐
  │  VPC: vpc-0763e7280387127d7  (vpc-pocs-iite · 10.0.0.0/16) │
  │                                                            │
  │  Lambda × 7 ──(5432)──► RDS PostgreSQL 16 (db.t3.micro)   │
  │  Lambda × 7 ──(endpoint)──► DynamoDB (usuarios)           │
  └────────────────────────────────────────────────────────────┘
```

**Sin NAT Gateway.** Las Lambdas solo necesitan RDS (IP privada en la misma VPC) y DynamoDB (VPC Gateway Endpoint gratuito).

## AWS — datos clave

| Parámetro | Valor |
|---|---|
| Cuenta | `885550607472` |
| Región | `us-east-1` |
| Perfil CLI | `UNISABANA` |
| CLI path (Windows) | `"C:\Program Files\Amazon\AWSCLIV2\aws.exe"` |
| API Gateway URL | `https://9w29mizn2e.execute-api.us-east-1.amazonaws.com/prod` |
| Amplify App ID | `d1zbctjjssquho` |
| Amplify rama | `desarrollo` |
| Amplify URL | `https://desarrollo.d1zbctjjssquho.amplifyapp.com` |
| GitHub repo | `https://github.com/danielgts18/simulador-proyectos-sabana` |
| VPC | `vpc-0763e7280387127d7` |
| Subnet privada us-east-1a | `subnet-07cb832d9e7e4f0d3` |

### Stacks CDK desplegados

| Stack | Descripción |
|---|---|
| `AviPocNetworkStack` | Subnet us-east-1b, DynamoDB Gateway Endpoint, SGs Lambda y RDS |
| `AviPocDatabaseStack` | RDS PostgreSQL 16, DynamoDB tabla usuarios, JWT secret |
| `AviPocApiStack` | 7 Lambdas Node 22, API Gateway REST, IAM role |

### Recursos AWS por nombre

| Recurso | Nombre / ID |
|---|---|
| RDS secret | `avi-poc-simulador-presupuesto-db-secret` |
| JWT secret | `avi-poc-simulador-presupuesto-jwt-secret` |
| DynamoDB tabla | `avi-poc-simulador-presupuesto-users` |
| Lambda SG | `avi-poc-simulador-presupuesto-lambda-sg` |
| RDS SG | `avi-poc-simulador-presupuesto-rds-sg` |
| Lambda role | `avi-poc-simulador-presupuesto-lambda-role` |

## Estructura del repositorio

Este repositorio contiene **solo el frontend**. Backend e infra CDK están en el directorio local `Simulador v2/` (no versionados en este repo).

```
Simulador v2/
├── frontend/          ← este repositorio (GitHub + Amplify)
│   ├── src/
│   │   ├── app/           App.tsx, RequireAuth.tsx (rutas)
│   │   ├── components/    icons.tsx, layout/, ui/
│   │   ├── features/      auth/, catalogs/, cycles/, dashboard/,
│   │   │                  expenses/, projects/, users/
│   │   ├── lib/           api.ts (cliente HTTP), types.ts,
│   │   │                  calculations.ts, format.ts
│   │   └── store/         apiStore.tsx (estado global async)
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.app.json  (strict: true, noUnusedLocals: true)
│
├── backend/           ← Lambdas Node.js/TypeScript
│   ├── src/
│   │   ├── handlers/  auth.ts, users.ts, projects.ts, cycles.ts,
│   │   │              expenses.ts, catalogs.ts, dashboard.ts
│   │   └── lib/       db.ts (PostgreSQL), dynamo.ts (DynamoDB),
│   │                  jwt.ts, auth-middleware.ts, rbac.ts,
│   │                  errors.ts, types.ts
│   ├── migrations/    001_initial_schema.sql, 002_seed_catalogs.sql
│   └── scripts/       seed-admin-user.ts
│
└── infra/             ← AWS CDK v2 TypeScript
    ├── bin/app.ts
    └── lib/           network-stack.ts, database-stack.ts, api-stack.ts
```

## Stack tecnológico

### Frontend
- **React 19** + **Vite** + **TypeScript** (strict mode)
- **React Router v6** para navegación SPA
- Sin librerías de UI externas — CSS propio en `src/styles/`
- Estado global: `src/store/apiStore.tsx` (Context + hooks async)
- Cliente HTTP: `src/lib/api.ts` (fetch con JWT Bearer automático)

### Backend
- **Node.js 22** en AWS Lambda
- **PostgreSQL 16** (RDS) vía `pg` para proyectos, vigencias, gastos y catálogos
- **DynamoDB** para usuarios (tabla con GSIs `username-index` y `role-active-index`)
- **JWT** (jsonwebtoken) para autenticación — secret en Secrets Manager
- **bcryptjs** para hash de contraseñas
- Bundling: `esbuild.buildSync()` programático (no `npx esbuild` — ver advertencia abajo)

### Infra
- **AWS CDK v2** TypeScript
- `lambda.Function` + `lambda.Code.fromAsset()` (NO `NodejsFunction`)

## Comandos de desarrollo

### Frontend (desarrollo local)
```bash
cd frontend
npm install
npm run dev          # Vite dev server en http://localhost:5173
                     # Apunta a http://localhost:3000 (VITE_API_URL en .env.development)
```

### Frontend (build y deploy)
```bash
cd frontend
npm run build        # tsc -b && vite build
git add . && git commit -m "..." && git push origin desarrollo
# Amplify detecta el push y despliega automáticamente
```

### Verificar build de Amplify
```bash
"C:\Program Files\Amazon\AWSCLIV2\aws.exe" amplify list-jobs \
  --app-id d1zbctjjssquho --branch-name desarrollo \
  --profile UNISABANA \
  --query "jobSummaries[0].{jobId:jobId,status:status}" --output table
```

### CDK (infra)
```bash
cd infra
npm install
# Deploy en orden obligatorio:
npx cdk deploy AviPocNetworkStack  --profile UNISABANA
npx cdk deploy AviPocDatabaseStack --profile UNISABANA
npx cdk deploy AviPocApiStack      --profile UNISABANA
```

### Seed de usuarios en DynamoDB
```bash
cd backend
AWS_PROFILE=UNISABANA ./node_modules/.bin/tsx scripts/seed-admin-user.ts
```

## Variables de entorno

### Frontend — Amplify (producción)
Configurada a nivel de app en Amplify Console:
```
VITE_API_URL=https://9w29mizn2e.execute-api.us-east-1.amazonaws.com/prod
```

### Frontend — desarrollo local
```
# frontend/.env.development
VITE_API_URL=http://localhost:3000
```

### Backend (Lambda) — inyectadas por CDK desde Secrets Manager
```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL
DYNAMO_TABLE_USERS
JWT_SECRET
JWT_EXPIRES_IN   (default: 28800 segundos = 8 horas)
```

## Usuarios demo

| Usuario | Contraseña | Rol | Permisos |
|---|---|---|---|
| `jefatura` | `Sabana2026!` | JEFATURA | Acceso total, gestión de usuarios |
| `gestor` | `Sabana2026!` | GESTOR_FINANCIERO | Lee usuarios, sin gestión de usuarios ni decisiones |
| `mariana` | `Sabana2026!` | LIDER_PROYECTO | Solo sus propios proyectos |

## API — rutas principales

| Método | Ruta | Lambda | Roles |
|---|---|---|---|
| POST | `/auth/login` | FnAuth | — |
| GET | `/auth/me` | FnAuth | Autenticado |
| GET | `/users` | FnUsers | JEFATURA, GESTOR_FINANCIERO |
| POST | `/users` | FnUsers | JEFATURA |
| GET | `/projects` | FnProjects | Todos |
| POST | `/projects` | FnProjects | JEFATURA, GESTOR_FINANCIERO |
| GET/PATCH | `/projects/:id/cycles/:cid/*` | FnCycles | Varios |
| GET/POST | `/projects/:id/cycles/:cid/expenses` | FnExpenses | Según proyecto |
| GET | `/catalogs` | FnCatalogs | Todos |
| GET | `/dashboard` | FnDashboard | Todos |

## Modelo de datos

### DynamoDB — tabla `avi-poc-simulador-presupuesto-users`
- **PK**: `userId` (String, UUID)
- **GSI `username-index`**: `username` (String)
- **GSI `role-active-index`**: `role` (String) + `active` (String — **"true"/"false"**, NO booleano)

> El campo `active` se almacena como String porque DynamoDB solo admite S/N/B como tipo de clave en GSIs. La API convierte a booleano antes de devolver al cliente.

### PostgreSQL — tablas
- `projects` — proyectos con ecosistema, líder y fechas
- `cycles` — vigencias anuales por proyecto (presupuesto, estado, aprobación)
- `expenses` — gastos comprometidos/ejecutados por vigencia
- `catalog_items` — catálogo de ecosistemas y tipos de gasto

## Gotchas importantes

### `&` en el path de Windows
El directorio del proyecto contiene `Transferencia & Emprendimiento-Agentes`. El `&` hace que Windows interprete el comando como dos comandos separados cuando se pasa como argumento de shell. **Nunca uses `npx <tool>`** desde este directorio. En su lugar:
- Usa `./node_modules/.bin/<tool>` directamente
- Para esbuild: usa la API programática `esbuild.buildSync()` (no `npx esbuild`)

### TypeScript strict en el frontend
`tsconfig.app.json` tiene `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. El build de Amplify ejecuta `tsc -b && vite build` — si TypeScript falla, el deploy falla. Verifica con `./node_modules/.bin/tsc --noEmit` antes de hacer push.

### RDS no es públicamente accesible
`publiclyAccessible: false` + subnets privadas sin IGW = no se puede conectar desde fuera de la VPC. Para correr migraciones SQL hay que crear una Lambda temporal en la VPC con el mismo SG, ejecutar las migraciones y borrarla. Ver el archivo `backend/scripts/migration-lambda.ts` como referencia del patrón.

### `active` en DynamoDB como String
El tipo del campo `active` en `backend/src/lib/types.ts` es `string` (no `boolean`). Se almacena `"true"` o `"false"`. La API convierte `u.active === "true"` al devolver usuarios al cliente.

## Flujo de autenticación

1. Cliente hace POST `/auth/login` → recibe JWT
2. JWT se guarda en `localStorage` con key `avi-poc-jwt`
3. Cada request posterior incluye `Authorization: Bearer <token>`
4. Lambdas validan el JWT con `requireAuth(event)` → retornan el payload
5. RBAC con `requireRole(user, ...roles)` — lanza 403 si el rol no está permitido

## Costo mensual estimado (PoC · ~500 requests/día)

| Servicio | USD/mes |
|---|---|
| RDS PostgreSQL db.t3.micro single-AZ | ~$15.33 |
| Lambda × 7 (dentro de free tier) | ~$0.00 |
| API Gateway REST ~15K req/mes | ~$0.02 |
| DynamoDB PAY_PER_REQUEST (free tier) | ~$0.00 |
| Secrets Manager × 2 | ~$0.80 |
| CloudWatch Logs ~500MB | ~$0.25 |
| **Total** | **~$16–18/mes** |
