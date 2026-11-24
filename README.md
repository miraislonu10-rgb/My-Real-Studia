# MY REAL STUDIA (STUDIA)

Plataforma académica de organización, seguimiento y mejora del estudio, basada en el
análisis de errores, el repaso espaciado, la analítica real de datos y las
recomendaciones personalizadas. El nombre visible en la interfaz es **MY REAL STUDIA**;
los nombres internos de archivos, base de datos y rutas conservan **studia**.

El proyecto está dividido en tres aplicaciones independientes que se comunican por HTTP:

| Capa | Tecnología | Puerto por defecto |
| --- | --- | --- |
| Frontend | React 19 + Vite 8 | `5173` |
| Backend | Node.js 20+ + Express 5 | `4000` |
| Base de datos | MySQL / MariaDB (XAMPP) | `3306` |
| Módulo PHP | PHP + MySQL (Apache de XAMPP) | `80` |

> **Importante:** XAMPP solo aporta Apache (80) y MySQL (3306). La aplicación principal
> **no la sirve Apache**: son dos servidores propios (Node en `4000` y Vite en `5173`) y
> deben estar en marcha. Si la página "no carga" con XAMPP activo, casi siempre es que
> falta arrancar `backend` y/o `frontend` (ver §7).

---

## 0. Primeros pasos en 5 minutos

Para ver la aplicación funcionando sin configurar nada:

1. Inicia **Apache** y **MySQL** en el panel de XAMPP.
2. Importa la base de datos: abre http://localhost/phpmyadmin → **Importar** →
   `backend/database/studia_database.sql` (crea `studia_db` con datos demo).
3. Copia los entornos (no hace falta editar nada para probar):
   ```powershell
   Copy-Item backend\.env.example backend\.env
   Copy-Item frontend\.env.example frontend\.env
   ```
   En desarrollo, si dejas los secretos JWT vacíos, el backend los genera solo.
4. Instala dependencias y arranca ambos servidores:
   ```powershell
   npm install ; npm run install:all ; npm run dev
   ```
5. Entra en **http://localhost:5173** con una cuenta demo:
   `admin@studia.demo` / `StudiaDemo123!` (o `ana@studia.demo`).

Cuando quieras sacarle el máximo partido: define tus secretos JWT en `backend/.env`, crea tu
propio administrador con `npm run create:admin` (o desde la propia interfaz en
**http://localhost:5173/configuracion-inicial**, disponible solo mientras no exista ningún
admin) y añade una `GEMINI_API_KEY` para el AI Companion (ver §10).

---

## 1. Requisitos previos

| Herramienta | Versión mínima | Notas |
| --- | --- | --- |
| Node.js | 20 LTS o superior | Incluye `npm`. Verifica con `node -v` y `npm -v`. |
| npm | 10 o superior | Se instala junto con Node.js. |
| XAMPP | Cualquier versión reciente | Aporta Apache, MySQL/MariaDB (probado en MariaDB 10.4) y phpMyAdmin. |
| PHP | 7.4 o superior | Solo para el módulo opcional `php-practice`. |
| Git | 2.x | Para el control de versiones. |

> **Windows / PowerShell:** si `npm` falla con *"No se puede cargar el archivo npm.ps1
> porque la ejecución de scripts está deshabilitada"*, usa `npm.cmd` en lugar de `npm`,
> o habilita los scripts con:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

---

## 2. Módulos implementados (estado actual)

Todas las funcionalidades siguientes están **desarrolladas y operativas** (frontend + backend + base de datos).
Las estadísticas y recomendaciones se calculan **siempre a partir de datos reales de MySQL**;
no se generan cifras inventadas.

| Módulo | Ruta frontend | Descripción |
| --- | --- | --- |
| Autenticación | `/iniciar-sesion`, `/registro`, `/recuperar-password`, `/restablecer-password` | Registro (siempre rol estudiante), login, refresh con rotación, logout global, recuperación de contraseña. |
| Configuración inicial | `/configuracion-inicial` | Crea, desde la interfaz, la **primera** cuenta de administrador de una instalación nueva (solo si aún no existe ningún admin). |
| Panel (Dashboard) | `/panel` | Resumen del estudiante o del administrador y datos del perfil. Botón para cargar **datos de ejemplo** en una cuenta vacía. |
| Materias y detalle | `/materias`, `/materias/:id` | CRUD de materias y, en el detalle, CRUD completo de **Temas, Tareas y Ejercicios** con pestañas y progreso real. |
| Smart Focus | `/cronometro` | Cronómetro resiliente basado en marcas de tiempo del servidor; sesiones con pausa/reanudación, materia/tema, productividad e historial. |
| Smart Planner | `/planificador` | Tareas con prioridad y fechas, objetivos diarios/semanales, calendario visual y reorganización inteligente de tareas atrasadas. |
| Error Journal | `/diario-errores` | Diario de errores: registro, clasificación por tipo, búsqueda, filtros, estados (pendiente / en revisión / comprendido) y métricas. |
| Academic Analytics | `/estadisticas` | Analítica real de tiempo de estudio, sesiones, ejercicios, precisión y errores recurrentes, con gráficas (Recharts) y reporte semanal. |
| Memory Lab | `/memory-lab` | Tarjetas de repaso espaciado con algoritmo **SM-2** (intervalo, factor de facilidad, estados y historial de repasos). |
| AI Companion | `/ai-companion` | Asistente académico con Google Gemini (o motor pedagógico local de respaldo) para explicar conceptos, generar ejercicios, dar pistas, analizar errores y recomendar teoría. |
| Learning Profile | `/perfil-aprendizaje` | Cuestionario multidimensional de preferencias de aprendizaje que alimenta las recomendaciones de los demás módulos. |
| Perfil | `/perfil` | Datos de la cuenta y del perfil académico (actualización y borrado lógico de la propia cuenta). |
| Recursos educativos | `/recursos` | Catálogo global (`/api/resources`): los estudiantes consultan y abren los recursos **publicados**; el administrador los crea, edita, publica/oculta y elimina. |
| Administración | `/admin/usuarios` | Gestión de cuentas: listado paginado, filtros por rol y estado, activar/suspender. |
| PHP practice | módulo aparte | Demostración de PHP básico, superglobales y CRUD con PDO (su propia base de datos). Ver `php-practice/README.md`. |

---

## 3. Estructura del proyecto

```
My Real STUDIA/
├── backend/                          # API REST (Node.js + Express + MySQL)
│   ├── database/
│   │   ├── studia_database.sql       # Script SQL completo (18 tablas + datos demo)
│   │   ├── migrations/
│   │   │   └── 001_educational_resources.sql
│   │   └── update_*.sql              # Actualizaciones incrementales para bases antiguas
│   ├── docs/
│   │   └── studia_api_collection.http
│   ├── scripts/
│   │   ├── hashPassword.js           # Genera hashes bcrypt
│   │   ├── createAdmin.js            # Crea la cuenta de administrador inicial (seguro)
│   │   └── testApi.js                # Pruebas rápidas de la API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js           # Pool mysql2 + transacciones + estado
│   │   │   ├── env.js                # Lectura y validación de variables de entorno
│   │   │   └── migrate.js            # Migraciones automáticas idempotentes al arrancar
│   │   ├── controllers/              # Lógica HTTP por recurso
│   │   ├── middlewares/              # 404, errores, auth/roles, rate limit, validación
│   │   ├── models/                   # Acceso a datos con sentencias preparadas
│   │   ├── services/                 # Lógica de negocio: auth, correo e IA (ai.service.js)
│   │   ├── validators/               # Reglas de validación (express-validator)
│   │   ├── utils/                    # errors, jwt, cookies, respond, ownership, security, duration
│   │   ├── routes/                   # Definición de rutas por módulo + index.js
│   │   ├── app.js                    # Configuración de Express (middlewares globales)
│   │   └── server.js                 # Punto de entrada y cierre ordenado
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
├── frontend/                         # Cliente web (React + Vite)
│   ├── src/
│   │   ├── components/               # Atomic Design
│   │   │   ├── atoms/                # Avatar, Badge, Button, EmptyState, Icon, Portal, ProgressBar, Spinner, StatCard
│   │   │   ├── molecules/            # CalendarPanel, ChartCard, ConfirmDialog, DataTable, FormField, Modal,
│   │   │   │                         #   Pagination, RecommendationList, SearchInput, StatusMessage, TaskList, WeeklySummary
│   │   │   ├── organisms/            # Sidebar (menú lateral), Topbar, UserMenu
│   │   │   ├── templates/            # AppShell (privado, menú lateral), AuthLayout (acceso)
│   │   │   └── layout/               # Layout (páginas públicas: cabecera, contenido, pie, skip link)
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Sesión, roles y acciones de autenticación
│   │   ├── pages/                    # Vistas (ver §2)
│   │   ├── routes/
│   │   │   └── guards.jsx            # ProtectedRoute, RoleRoute, PublicOnlyRoute
│   │   ├── services/                 # api.js (axios + refresh) y un servicio por dominio
│   │   ├── styles/index.css          # Sistema de diseño (tokens CSS)
│   │   ├── utils/                    # format.js, formErrors.js
│   │   ├── App.jsx                   # Rutas y metadatos SEO por ruta
│   │   └── main.jsx                  # Punto de entrada
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── php-practice/                     # Módulo complementario PHP + MySQL (independiente)
│   ├── crud/                         # CRUD con PDO (index, crear, editar, eliminar)
│   ├── config/                       # config.php, database.php (conexión PDO)
│   ├── includes/                     # bootstrap, functions (CSRF, escape), header, footer, error
│   ├── sql/php_practice.sql          # Base y tabla de demostración
│   └── README.md                     # Documentación propia del módulo
│
├── .gitignore
├── package.json                      # Scripts de orquestación del repositorio
└── README.md
```

---

## 4. Dependencias y para qué sirve cada una

### Backend

| Paquete | Versión | Uso |
| --- | --- | --- |
| `express` | ^5 | Framework HTTP: enrutado y middlewares. |
| `cors` | ^2 | Permite que el frontend (`localhost:5173`) consuma la API (`localhost:4000`). |
| `dotenv` | ^18 | Carga las variables de entorno desde `.env`. |
| `mysql2` | ^3 | Driver con pool de conexiones y sentencias preparadas (evita inyección SQL). |
| `bcryptjs` | ^3 | Hash de contraseñas (JS puro, sin compilación nativa en Windows). |
| `jsonwebtoken` | ^9 | Firma y verifica los JWT de acceso. |
| `helmet` | ^8 | Cabeceras HTTP de seguridad. |
| `morgan` | ^1 | Registro de peticiones HTTP en consola. |
| `express-rate-limit` | ^8 | Límite de peticiones por IP (global y reforzado en auth y IA). |
| `express-validator` | ^7 | Validación y saneamiento de datos de entrada. |
| `nodemailer` | *(opcional)* | Envío real de correos (`MAIL_TRANSPORT=smtp`). No necesario en desarrollo. |
| `nodemon` | *(dev)* | Reinicio automático del servidor al guardar. |

### Frontend

| Paquete | Versión | Uso |
| --- | --- | --- |
| `react`, `react-dom` | ^19 | Interfaz por componentes. |
| `react-router-dom` | ^7 | Enrutado SPA y guardas de ruta. |
| `axios` | ^1 | Cliente HTTP centralizado (con interceptor de refresh). |
| `recharts` | ^3 | Gráficas del módulo de analítica. |
| `vite`, `@vitejs/plugin-react` | ^8 / ^6 | *(dev)* Dev server, build y soporte JSX. |

### Raíz

| Paquete | Uso |
| --- | --- |
| `concurrently` | *(dev)* Ejecuta backend y frontend a la vez con un solo comando. |

---

## 5. Instalación

### 5.1 Clonar e instalar dependencias

```powershell
git clone https://github.com/TU_USUARIO/studia.git
cd studia

# Opción A: todo de una vez desde la raíz
npm install
npm run install:all

# Opción B: proyecto por proyecto
cd backend ; npm install
cd ..\frontend ; npm install
```

### 5.2 Crear los archivos de entorno

```powershell
Copy-Item backend\.env.example  backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Ajusta `backend/.env` si tu MySQL tiene contraseña. **Es obligatorio** sustituir los
secretos de ejemplo (`JWT_SECRET` y `JWT_REFRESH_SECRET`) por valores propios y aleatorios:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> Los archivos `.env` están en `.gitignore`: **nunca** se suben al repositorio.
> Ninguna credencial real se escribe dentro del código fuente.

Variables relevantes de `backend/.env` (ver `.env.example` para todas): servidor
(`PORT`, `CORS_ORIGIN`, `FRONTEND_URL`), base de datos (`DB_*`), JWT (`JWT_*`,
`BCRYPT_SALT_ROUNDS`, `MIN_PASSWORD_LENGTH`), límites de peticiones, correo
(`MAIL_TRANSPORT`) y **AI Companion** (`GEMINI_API_KEY`, `GEMINI_MODEL`,
`OPENAI_API_KEY`, `AI_TIMEOUT_MS`).

---

## 6. Base de datos

### 6.1 Importar `studia_database.sql` en phpMyAdmin (XAMPP)

1. En **XAMPP Control Panel** pulsa **Start** en `Apache` y en `MySQL`.
2. Abre **http://localhost/phpmyadmin**.
3. Pestaña **Importar** → **Seleccionar archivo** → `backend/database/studia_database.sql`.
4. Verifica **Conjunto de caracteres: `utf-8`** y **Formato: `SQL`** → **Continuar**.
5. Debe aparecer la base **`studia_db`**. El script crea **18 tablas** y datos demo.

**Alternativa por línea de comandos (Windows):**

```powershell
cd "C:\xampp\mysql\bin"
.\mysql.exe -u root --default-character-set=utf8mb4 -e "source C:/ruta/completa/backend/database/studia_database.sql"
```

> El script es reejecutable: elimina y recrea las tablas (perdiendo los datos previos).

### 6.2 Migraciones automáticas al arrancar

Al iniciar, el backend ejecuta `src/config/migrate.js`, que **verifica y completa el
esquema de forma idempotente** (añade columnas nuevas de Smart Focus, Error Journal,
Smart Planner y Learning Profile, y crea la tabla `flashcard_reviews` de Memory Lab si
falta). Por eso, tras arrancar el backend, la base puede tener **19 tablas** (18 base +
`flashcard_reviews`); el chequeo de salud exige `>= 18`.

### 6.3 Modelo de datos

**18 tablas base** (15 de dominio + 1 catálogo de recursos + 2 de seguridad). Todas las
tablas de datos del estudiante incluyen `user_id`, de modo que la información queda
asociada a su dueño.

| Tabla | Propósito | Relación principal |
| --- | --- | --- |
| `users` | Cuentas de acceso (student, tutor, admin). | — |
| `student_profiles` | Datos académicos del estudiante. | `user_id` → `users` (1:1) |
| `subjects` | Materias. | `user_id` → `users` |
| `topics` | Temas dentro de cada materia. | `subject_id`, `user_id` |
| `study_sessions` | Sesiones de estudio (Smart Focus). | `user_id`, `subject_id`, `topic_id` |
| `tasks` | Tareas/pendientes (Smart Planner). | `user_id`, `subject_id`, `topic_id` |
| `exercises` | Ejercicios de práctica. | `user_id`, `subject_id`, `topic_id` |
| `exercise_attempts` | Intentos de resolución. | `exercise_id`, `user_id` |
| `errors` | Diario y análisis de errores (Error Journal). | `user_id`, `topic_id`, `exercise_id`, `attempt_id` |
| `learning_preferences` | Perfil de aprendizaje multidimensional. | `user_id` → `users` (1:1) |
| `study_plans` | Planes de estudio con objetivo y periodo. | `user_id`, `subject_id` |
| `recommendations` | Recomendaciones personalizadas. | `user_id`, `study_plan_id`, `subject_id`, `topic_id` |
| `weekly_reports` | Reporte semanal (uno por semana). | `user_id` (único por semana) |
| `flashcards` | Tarjetas de repaso espaciado (SM-2). | `user_id`, `topic_id`, `error_id` |
| `achievements` | Logros desbloqueados. | `user_id` (único por código) |
| `educational_resources` | Catálogo global de recursos (gestionado por admin). | `created_by` → `users` |
| `refresh_tokens` | Sesiones activas: guarda **solo el hash** del token de refresco. | `user_id` → `users` |
| `password_reset_tokens` | Tokens de recuperación (**solo el hash**), de un único uso y con caducidad. | `user_id` → `users` |

**Tabla adicional creada automáticamente (Memory Lab):**

| Tabla | Propósito | Relación principal |
| --- | --- | --- |
| `flashcard_reviews` | Historial de repasos espaciados (rating, intervalo, factor de facilidad, tiempo). | `flashcard_id`, `user_id` |

**Detalles de integridad y buen diseño**

- Claves primarias `BIGINT UNSIGNED AUTO_INCREMENT` y claves foráneas con nombre explícito (`fk_*`).
- Restricciones de unicidad que evitan duplicados (`uq_users_email`, `uq_subjects_user_name`,
  `uq_topics_subject_name`, `uq_weekly_reports_user_week`, `uq_achievements_user_code`, …).
- Índices en los filtros habituales (fechas, estados, prioridades) y claves foráneas.
- Restricciones `CHECK` para rangos coherentes (progreso 0-100, `focus_score` 1-5, etc.).
- `created_at` / `updated_at` en todas las tablas; `updated_at` se actualiza automáticamente.
- `JSON` para opciones de ejercicios de opción múltiple y para `dynamic_profile`.

### 6.4 Estrategia de eliminación de registros relacionados

| Situación | Estrategia | Motivo |
| --- | --- | --- |
| Cuenta de usuario | **Borrado lógico**: `status = 'deleted'` + `deleted_at` (y revocación de sesiones) | Conserva el histórico de aprendizaje. |
| Eliminación física de un usuario | `ON DELETE CASCADE` en sus tablas dependientes | No quedan datos huérfanos. |
| Borrado de una materia o tema | `ON DELETE SET NULL` en sesiones, tareas, errores, tarjetas, planes y recomendaciones | El estudiante no pierde su historial. |
| Borrado de un ejercicio | `ON DELETE CASCADE` en sus intentos; `SET NULL` en los errores asociados | Desaparece la práctica, se conserva el aprendizaje derivado. |

### 6.5 Datos de demostración

- Correos con el dominio reservado **`@studia.demo`**.
- Contraseña común de la demo: **`StudiaDemo123!`** (guardada **solo** como hash bcrypt coste 12).
- Usuarios: `admin@studia.demo` (admin), `ana@studia.demo` y `luis@studia.demo` (estudiantes).

Para eliminar toda la demo:

```sql
DELETE FROM users WHERE email LIKE '%@studia.demo';
```

### 6.6 Cuenta de administrador inicial

El registro público **solo crea estudiantes** (el backend fuerza `role = 'student'`). La
cuenta de administrador se crea desde el servidor con un script seguro:

```powershell
cd backend
npm run create:admin -- --email=admin@mi-dominio.com --firstName=Ana --lastName=Perez
```

- Si no se pasa `--password`, se solicita de forma oculta (no queda en el historial).
- Admite las variables `ADMIN_EMAIL`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_PASSWORD`.
- Guarda **únicamente el hash bcrypt**; si el correo ya existe con otro rol, se niega a modificarlo.

> **Alternativa desde la interfaz:** mientras no exista **ninguna** cuenta de administrador,
> la página pública `/configuracion-inicial` (enlace visible desde el acceso) permite crear la
> primera. En cuanto existe un admin, el endpoint responde `409` y la página indica que ya se
> completó la configuración. Esta vía no sustituye al script: ambos respetan la misma política.

---

## 7. Ejecución

> Recuerda: XAMPP debe tener **MySQL en marcha** antes de arrancar el backend.

### 7.1 Levantar todo junto (raíz del repositorio)

```powershell
npm.cmd run dev
```

Arranca el backend en `http://localhost:4000` y el frontend en `http://localhost:5173`.

### 7.2 Ejecutar cada proyecto por separado (recomendado para ver logs)

```powershell
# Terminal 1 - backend
cd backend
npm.cmd run dev      # desarrollo (reinicio automático con nodemon)
npm.cmd start        # producción

# Terminal 2 - frontend
cd frontend
npm.cmd run dev
```

Cada aplicación funciona de forma independiente: el backend responde aunque el frontend
esté apagado, y el frontend avisa si la API no está disponible.

> **Accede siempre por `http://localhost:5173`** (no `127.0.0.1`) para evitar bloqueos de
> CORS por parte del backend.

---

## 8. Referencia de la API

Base URL: `http://localhost:4000/api`. Toda respuesta usa el formato uniforme:

```json
{ "success": true, "error": null, "message": "…", "data": {} }
```

En los errores, `success` es `false`, `error` es un código legible y `details` (cuando
aplica) identifica el campo con problema:

```json
{ "success": false, "error": "VALIDATION_ERROR", "message": "…", "details": [{ "field": "email", "message": "…" }] }
```

### 8.1 Índice y estado

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/` | Público | Información básica de la API. |
| GET | `/api` | Público | Índice de recursos disponibles. |
| GET | `/api/docs` | Público | Especificación de la API (módulos, endpoints y cuerpos). |
| GET | `/api/health` | Público | Estado de la API y de MySQL. |
| GET | `/api/health/db` | Público | Conexión, latencia y tablas (detalle solo en desarrollo). |

### 8.2 Autenticación (`/api/auth`)

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/register` | Público | Registro de **estudiante** (siempre `student`). |
| POST | `/auth/login` | Público | Inicio de sesión; token de acceso + cookie httpOnly. |
| POST | `/auth/refresh` | Cookie | Renueva la sesión (rotación del token de refresco). |
| POST | `/auth/logout` | Público | Cierra la sesión actual (idempotente). |
| POST | `/auth/logout-all` | Autenticado | Cierra todas las sesiones del usuario. |
| GET | `/auth/me` | Autenticado | Datos de la cuenta en sesión. |
| POST | `/auth/forgot-password` | Público | Solicita recuperación (respuesta genérica). |
| POST | `/auth/reset-password` | Público | Restablece con el token del correo. |

### 8.3 Usuarios (`/api/users`)

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/users/me` | Autenticado | Cuenta propia. |
| PUT | `/users/me` | Autenticado | Actualiza nombre/correo propios. |
| DELETE | `/users/me` | Autenticado | Borrado lógico de la propia cuenta. |
| GET | `/users/me/profile` | Autenticado | Perfil académico propio. |
| PUT | `/users/me/profile` | Autenticado | Actualiza el perfil propio. |
| GET | `/users/:uuid/profile` | Dueño o admin | Perfil de un usuario concreto. |
| GET | `/users` | **Admin** | Listado paginado de usuarios. |
| POST | `/users` | **Admin** | Crea un usuario. |
| GET | `/users/:uuid` | **Admin** | Detalle de un usuario. |
| PUT | `/users/:uuid` | **Admin** | Edita un usuario. |
| DELETE | `/users/:uuid` | **Admin** | Elimina un usuario. |
| PATCH | `/users/:uuid/status` | **Admin** | Activa/suspende una cuenta. |

### 8.4 Panel (`/api/dashboard`)

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/dashboard/student` | Autenticado | Resumen del propio estudiante. |
| GET | `/dashboard/admin` | **Admin** | Resumen global del sistema. |

### 8.5 Materias, temas, tareas y ejercicios

| Recurso | Rutas | Notas |
| --- | --- | --- |
| Materias (`/subjects`) | `GET /subjects/options`, `GET|POST /subjects`, `GET|PUT|DELETE /subjects/:id` | CRUD por dueño; anti-IDOR. |
| Temas (`/topics`) | `GET|POST /topics`, `GET|PUT|DELETE /topics/:id` | CRUD por dueño; anti-IDOR. |
| Tareas (`/tasks`) | `GET|POST /tasks`, `GET|PUT|DELETE /tasks/:id`, `PATCH /tasks/:id/status`, `GET /tasks/meta/upcoming`, `GET /tasks/calendar`, `GET /tasks/goals`, `GET /tasks/recommendations/reschedule`, `POST /tasks/recommendations/apply` | CRUD + Smart Planner. |
| Ejercicios (`/exercises`) | `GET|POST /exercises`, `GET|PUT|DELETE /exercises/:id` | CRUD por dueño; anti-IDOR. |
| Recursos (`/resources`) | `GET /resources`, `GET /resources/:id` (autenticado); `POST|PUT|DELETE` (**admin**) | Catálogo global; los no publicados se ocultan a estudiantes. |

### 8.6 Sesiones de estudio (`/api/study-sessions`) — Smart Focus

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/study-sessions/active` | Sesión activa en curso. |
| GET | `/study-sessions/stats` | Métricas y resumen de estudio. |
| GET | `/study-sessions` | Historial de sesiones. |
| POST | `/study-sessions/start` | Inicia una sesión. |
| POST | `/study-sessions/:id/pause` | Pausa la sesión. |
| POST | `/study-sessions/:id/resume` | Reanuda la sesión. |
| POST | `/study-sessions/:id/finish` | Finaliza y registra productividad. |
| DELETE | `/study-sessions/:id` | Descarta una sesión en curso. |

### 8.7 Diario de errores (`/api/errors`) — Error Journal

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/errors/stats` | Métricas del diario. |
| GET | `/errors` | Listado con filtros y búsqueda. |
| POST | `/errors` | Registra un error. |
| GET | `/errors/:id` | Detalle. |
| PUT | `/errors/:id` | Edita el error completo. |
| PATCH | `/errors/:id/status` | Cambia estado (pending / in_review / understood). |
| DELETE | `/errors/:id` | Elimina. |

### 8.8 Tarjetas de memoria (`/api/flashcards`) — Memory Lab

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/flashcards/pending` | Tarjetas pendientes de repaso. |
| GET | `/flashcards/history` | Historial de repasos. |
| GET | `/flashcards/stats` | Métricas. |
| GET | `/flashcards` | Listado con filtros. |
| POST | `/flashcards` | Crea tarjeta. |
| GET | `/flashcards/:id` | Detalle. |
| PUT | `/flashcards/:id` | Edita. |
| POST | `/flashcards/:id/review` | Registra un repaso (SM-2). |
| DELETE | `/flashcards/:id` | Elimina. |

### 8.9 Analítica (`/api/analytics`) y perfil de aprendizaje (`/api/learning-profile`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/analytics/overview?from&to` | Resumen analítico del periodo. |
| GET | `/analytics/weekly-report?date` | Reporte semanal. |
| GET | `/learning-profile` | Perfil de aprendizaje del usuario. |
| PUT | `/learning-profile` | Actualiza preferencias y perfil dinámico. |

### 8.10 Inteligencia artificial (`/api/ai`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/ai/companion` | Consulta al asistente. Limitado a 20 peticiones/min por IP. |

Acciones soportadas por `action`: `explain_concept`, `generate_exercise`, `provide_hint`,
`explain_wrong_answer`, `analyze_frequent_errors`, `recommend_theory`, `personalized_review`.

### 8.11 Configuración inicial (`/api/setup`) y datos de ejemplo (`/api/demo`)

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/setup/status` | Público | Indica si la instalación aún necesita un administrador (`needsFirstAdmin`). |
| POST | `/setup/first-admin` | Público (una sola vez) | Crea la **primera** cuenta de administrador. Solo actúa si aún no existe ningún admin y aplica el límite reforzado de intentos. |
| POST | `/demo/seed` | Autenticado (estudiante) | Carga contenido de ejemplo en una cuenta **vacía** (sin materias): materias, temas, tareas, errores y tarjetas. Si ya hay materias responde `409`, para no alterar contenido real. |

---

## 9. Frontend

### 9.1 Rutas del cliente (`src/App.jsx`)

| Grupo | Plantilla | Rutas |
| --- | --- | --- |
| Públicas exclusivas (sin sesión) | `AuthLayout` | `/iniciar-sesion`, `/registro`, `/recuperar-password` |
| Accesible con o sin sesión | `AuthLayout` | `/restablecer-password`, `/configuracion-inicial` |
| Privadas (cualquier rol) | `AppShell` (menú lateral) | `/panel`, `/cronometro`, `/planificador`, `/diario-errores`, `/estadisticas`, `/memory-lab`, `/ai-companion`, `/perfil-aprendizaje`, `/materias`, `/materias/:id`, `/recursos`, `/perfil` (`/temas` redirige a `/materias`) |
| Solo administrador | `AppShell` (menú lateral) | `/admin/usuarios` |
| Públicas | `Layout` (cabecera y pie) | `/`, `/acceso-denegado`, `*` |

Las pantallas privadas se montan en el armazón con **menú lateral** (`AppShell` + `Sidebar`),
que en pantallas pequeñas se convierte en un panel deslizante. El título de la pestaña y la
meta descripción se actualizan dinámicamente según la ruta (SEO y accesibilidad).

### 9.2 Organización por Atomic Design (`src/components/`)

| Nivel | Componentes |
| --- | --- |
| `atoms/` | `Avatar`, `Badge`, `Button`, `EmptyState`, `Icon` (set SVG en línea), `Portal` (renderiza en `<body>` vía `createPortal`), `ProgressBar`, `Spinner`, `StatCard` |
| `molecules/` | `CalendarPanel`, `ChartCard`, `ConfirmDialog`, `DataTable`, `FormField`, `Modal`, `Pagination`, `RecommendationList`, `SearchInput`, `StatusMessage`, `TaskList`, `WeeklySummary` |
| `organisms/` | `Sidebar` (menú lateral según rol), `Topbar` (cabecera de la sección), `UserMenu` (sesión) — componen el área privada |
| `templates/` | `AppShell` (área privada: menú lateral + cabecera + contenido), `AuthLayout` (acceso y recuperación) |
| `layout/` | `Layout` (páginas públicas: cabecera, contenido y pie con *skip link*) |

`Modal` implementa **focus trap**, cierre con `Escape`, devolución del foco y soporte de
`[data-autofocus]` para posicionar el cursor en el campo principal al abrirse.

**Portales de React (`createPortal`).** El átomo `Portal` monta sus hijos directamente en
`<body>`. Lo usan `Modal` (y por tanto `ConfirmDialog` y todas las páginas que lo reutilizan) y
los overlays propios de `SmartFocus`, `SmartPlanner` y `ErrorJournal`. Así un ancestro con
`overflow: hidden`, `transform` o `filter` no recorta el overlay ni lo deja atrapado en un
contexto de apilamiento inferior.

### 9.3 Servicios del cliente (`src/services/`)

| Servicio | Consume |
| --- | --- |
| `api.js` | Núcleo axios: token de acceso **solo en memoria**, interceptor de refresco (401 → refresh único), clase `ApiError`, `getApiHealth`. |
| `auth.js` | `/auth/*`, `/users/*` (cuenta, perfil y administración) y `/setup/*` (configuración inicial). |
| `academic.js` | Factoría CRUD: `subjects`, `topics`, `tasks`, `exercises`, `resources`. |
| `demo.js` | `POST /demo/seed` (carga datos de ejemplo en una cuenta vacía). |
| `subject.js` | `GET /subjects`, `GET /topics` (para selectores). |
| `dashboard.js` | `GET /dashboard/student`, `GET /dashboard/admin`. |
| `studySession.js` | `/study-sessions/*` (Smart Focus). |
| `planner.js` | `/tasks/*` (Smart Planner). |
| `errorJournal.js` | `/errors/*`. |
| `flashcards.js` | `/flashcards/*` (Memory Lab). |
| `analytics.js` | `/analytics/*`. |
| `learningProfile.js` | `/learning-profile`. |
| `ai.js` | `POST /ai/companion`. |

### 9.4 Sesión y roles

- El **token de acceso** vive únicamente en memoria (nunca en `localStorage`/`sessionStorage`).
- El **token de refresco** viaja en cookie `httpOnly`; al recargar, `AuthContext` restaura la
  sesión con `refreshAccessToken()` y confirma con `/auth/me`.
- Las guardas (`ProtectedRoute`, `RoleRoute`, `PublicOnlyRoute`) solo deciden **qué se
  muestra**; la autorización real la aplica el backend en cada petición.

### 9.5 Estilos (`src/styles/index.css`)

Sistema de diseño por capas (tokens → base → átomos → moléculas → plantilla) con paleta
**lavanda** (primaria), blanco, **gris cálido** (fondo), **azul grisáceo** (texto/neutros)
y **verde suave** (positivo), con tokens semánticos (éxito, aviso, error, info). Diseño
responsive y contrastes que cumplen **WCAG AA**.

---

## 10. Módulo AI Companion

Implementado en `backend/src/services/ai.service.js`. El backend actúa como **pasarela**:
las claves viven **solo** en variables de entorno y **nunca** se exponen al cliente.

1. Se obtiene el contexto académico real del estudiante (materias, errores recientes y perfil cognitivo).
2. Si hay `GEMINI_API_KEY`, se consulta Google Gemini; si falla por **saturación (5xx)** reintenta
   una vez y, si falla por **cuota (429/403)** o modelo inexistente (404), prueba los modelos de
   respaldo `gemini-3.5-flash-lite` y `gemini-3.1-flash-lite`.
3. Si hay `OPENAI_API_KEY`, se usa un proveedor compatible con la API de OpenAI.
4. Si no hay credenciales o el proveedor falla, responde el **motor pedagógico local determinista**
   de STUDIA, informándolo de forma transparente (sin simular una IA real).

La respuesta incluye `source`, `provider`, `model`, `disclaimer` y `dataProvenance`
(registros reales usados vs. contenido generado por IA), para distinguir siempre el origen
de la información. Todas las llamadas externas tienen un **timeout** (`AI_TIMEOUT_MS`,
por defecto 20000 ms).

---

## 11. Módulo `php-practice`

Directorio independiente que demuestra PHP básico, formularios **GET/POST**, superglobales
(`$_GET`, `$_POST`, `$_SERVER`), validación, conexión **PDO** y **CRUD** con consultas
preparadas. Usa su **propia base de datos** (`php_practice`) y no toca `studia_db`.
Incluye CSRF, escape de salida y patrón PRG (Post-Redirect-Get).

Consulta `php-practice/README.md` para requisitos, importación del SQL y publicación en Apache.

---

## 12. Seguridad implementada

### 12.1 Contraseñas
- **bcrypt** (coste 12, configurable con `BCRYPT_SALT_ROUNDS`); nunca texto plano.
- Política mínima (longitud `MIN_PASSWORD_LENGTH` + letra y número), validada en el backend.
- Hash manual: `npm run hash:password -- "MiContraseña"`.

### 12.2 Autenticación (JWT) y sesiones
- Token de acceso corto (`JWT_EXPIRES_IN`, por defecto `15m`) con `issuer`/`audience` verificados.
- Token de refresco en **cookie httpOnly** (`SameSite=Lax`, `Secure` en producción) con **rotación**.
- Los tokens de refresco y de recuperación se guardan **solo como hash HMAC-SHA256** (`JWT_REFRESH_SECRET`).
- Cada sesión registra IP y *user-agent*; revocable individualmente o en bloque (`/logout-all`).
- Al restablecer la contraseña se revocan **todas** las sesiones.

### 12.3 Autorización y roles
- Roles `student` y `admin`; el middleware `authenticate` recarga el usuario desde la base
  (una cuenta suspendida/eliminada pierde acceso al instante) y **no confía en el rol del token**.
- `requireAdmin` protege las rutas administrativas (responden `403` aunque se conozca la URL).
- El registro público solo crea estudiantes; el admin se crea con `npm run create:admin`.

### 12.4 Anti-IDOR
- Rutas "self" sin identificador (`/users/me`) operan sobre el `id` de la sesión.
- Cuando hay identificador, el controlador ejecuta `assertOwnership`: si quien pide no es el
  dueño ni admin, responde `403`. **Toda consulta filtra por el `user_id` de la sesión.**

### 12.5 Base de datos
- **Sentencias preparadas** con `pool.execute()` y marcadores `?`; nunca se concatenan valores.
- **Listas blancas de columnas** en los `UPDATE`; **transacciones** (`withTransaction`) en
  operaciones compuestas; cierre ordenado del pool en el apagado.

### 12.6 Otras medidas
- Validación/saneamiento con `express-validator` (errores por campo en `details`).
- **Rate limiting** por IP: global (API), reforzado en `/auth/*` y en `/ai/companion`
  (20/min). Valores configurables en `.env`.
- **Anti-enumeración** en login y recuperación (mensajes genéricos).
- CORS restringido a `CORS_ORIGIN`; cabeceras de seguridad con `helmet`; sin `x-powered-by`.
- Manejo centralizado de errores sin filtrar trazas ni detalles internos en producción.
- Los health checks ocultan host/tablas en producción.
- Las operaciones `DELETE` del módulo PHP van por `POST` con token CSRF.

---

## 13. Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| **La página no carga aunque XAMPP esté activo** | Backend (4000) y/o frontend (5173) apagados | Arranca `npm.cmd run dev` en `backend` y en `frontend` (§7). XAMPP solo aporta Apache y MySQL. |
| `No se puede cargar el archivo npm.ps1…` | Política de ejecución de PowerShell | Usa `npm.cmd` o `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `database: "down"` en `/api/health` | MySQL detenido o `.env` incorrecto | Inicia MySQL en XAMPP y revisa `DB_*` en `backend/.env`. |
| `tablesCount` por debajo de 18 | El script SQL no se importó (o está incompleto) | Reimporta `studia_database.sql` (§6.1) o deja que las migraciones actúen al arrancar. |
| El frontend muestra "Sin conexión con la API" | El backend no está en ejecución | Ejecuta `npm.cmd run dev` en `backend`. |
| `EADDRINUSE` en 4000 o 5173 | Puerto ocupado | Cambia `PORT` en `backend/.env` o `server.port` en `frontend/vite.config.js`; o cierra el proceso zombi. |
| Error de CORS en el navegador | Origen no permitido | Añade el origen en `CORS_ORIGIN` de `backend/.env` y accede por `localhost:5173`. |
| La sesión se pierde al recargar | La cookie de refresco no llega | Verifica que `CORS_ORIGIN` coincida con el frontend y que axios use `withCredentials`. |
| `401` en todas las peticiones privadas | Token caducado o `JWT_SECRET` cambiado | Vuelve a iniciar sesión; si persiste, revisa `JWT_SECRET`. |
| AI Companion responde siempre en modo local | Sin credenciales o cuota agotada | Define `GEMINI_API_KEY` (o `OPENAI_API_KEY`) en `backend/.env` y reinicia el backend. |

Verificación rápida de puertos (PowerShell):

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -in 80,3306,4000,5173 } |
  Select-Object LocalPort, OwningProcess | Sort-Object LocalPort
```

---

## 14. Notas de mantenimiento y pendientes conocidos

- **Navegación unificada (resuelto):** las pantallas privadas usan el menú lateral
  (`AppShell` + `Sidebar`), corregido para apuntar solo a rutas existentes; las públicas usan
  `Layout` y las de acceso `AuthLayout`. Al añadir una ruta privada nueva, recuérdala también
  en `Sidebar.jsx` (enlaces) y en el mapa `TITLES` de `AppShell.jsx` (título de la cabecera).
- **Módulo de recursos (resuelto):** el catálogo global ya tiene página propia en `/recursos`
  (enlazada desde el menú lateral de estudiante y de administrador). Los estudiantes solo ven
  los recursos publicados; el administrador los gestiona. El backend y el servicio
  `academic.js` (`resources`) siguen siendo la fuente de datos.
- **Analítica y salud en producción:** los detalles de infraestructura solo se exponen fuera
  de producción; mantenlo así al desplegar.
- **Compatibilidad MariaDB (XAMPP):** evitar `CAST(... AS JSON)` en versiones antiguas.
- **Módulos eliminados:** la ruta `/temas` y el componente `Topics.jsx` se retiraron; toda la
  gestión de temas reside en el panel de detalle de la materia (`SubjectDetail.jsx`).
