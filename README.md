# STUDIA

Plataforma de organización, seguimiento y mejora del estudio, basada en el análisis de errores, el repaso espaciado y las recomendaciones personalizadas.

El proyecto está dividido en dos aplicaciones independientes que se comunican por HTTP:

| Capa | Tecnología | Puerto por defecto |
| --- | --- | --- |
| Frontend | React 18 + Vite | `5173` |
| Backend | Node.js + Express | `4000` |
| Base de datos | MySQL / MariaDB (XAMPP) | `3306` |

---

## 1. Requisitos previos

| Herramienta | Versión mínima | Notas |
| --- | --- | --- |
| Node.js | 20 LTS o superior | Incluye `npm`. Verifica con `node -v` y `npm -v`. |
| npm | 10 o superior | Se instala junto con Node.js. |
| XAMPP | Cualquier versión reciente | Aporta Apache, MySQL/MariaDB y phpMyAdmin. |
| Git | 2.x | Para el control de versiones. |

> **Windows / PowerShell:** si al ejecutar `npm` aparece el error *"No se puede cargar el archivo npm.ps1 porque la ejecución de scripts está deshabilitada"*, usa `npm.cmd` en lugar de `npm`, o habilita los scripts con:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

---

## 2. Estructura del proyecto

```
My Real STUDIA/
├── backend/                      # API REST (Node.js + Express + MySQL)
│   ├── database/
│   │   └── studia_database.sql   # Script SQL completo (15 tablas + datos demo)
│   ├── scripts/
│   │   └── hashPassword.js       # Genera hashes bcrypt para las contraseñas
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js       # Pool de conexiones mysql2
│   │   │   └── env.js            # Lectura y validación de variables de entorno
│   │   ├── controllers/          # Lógica de cada recurso
│   │   ├── middlewares/          # 404 y manejo centralizado de errores
│   │   ├── routes/               # Definición de rutas (index, health, auth)
│   │   ├── app.js                # Configuración de Express
│   │   └── server.js             # Punto de entrada
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
├── frontend/                     # Cliente web (React + Vite)
│   ├── src/
│   │   ├── components/layout/    # Plantilla general (cabecera, contenido, pie)
│   │   ├── pages/                # Vistas (Home, NotFound)
│   │   ├── services/api.js       # Cliente HTTP (axios) hacia el backend
│   │   ├── styles/index.css      # Estilos base
│   │   ├── App.jsx               # Definición de rutas
│   │   └── main.jsx              # Punto de entrada
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore                    # Reglas comunes del repositorio
├── package.json                  # Scripts de orquestación del repositorio
└── README.md
```

---

## 3. Dependencias y para qué sirve cada una

### Backend

| Paquete | Uso |
| --- | --- |
| `express` | Framework HTTP: enrutado y middlewares de la API. |
| `cors` | Permite que el frontend (`localhost:5173`) consuma la API (`localhost:4000`). |
| `dotenv` | Carga las variables de entorno desde `.env` (sin exponerlas en el código). |
| `mysql2` | Driver de MySQL/MariaDB con pool de conexiones y sentencias preparadas (evita inyección SQL). |
| `bcryptjs` | Hashea las contraseñas antes de guardarlas. Es JavaScript puro, sin compilación nativa en Windows. |
| `jsonwebtoken` | Genera y valida los tokens JWT de las sesiones autenticadas. |
| `helmet` | Añade cabeceras HTTP de seguridad. |
| `morgan` | Registra las peticiones HTTP en consola (útil en desarrollo). |
| `express-rate-limit` | Limita peticiones por IP para frenar fuerza bruta y abuso. |
| `express-validator` | Valida y sanea los datos que llegan en las peticiones. |
| `nodemon` | *(dev)* Reinicia el servidor automáticamente al guardar cambios. |

### Frontend

| Paquete | Uso |
| --- | --- |
| `react`, `react-dom` | Construcción de la interfaz de usuario por componentes. |
| `react-router-dom` | Enrutado del lado del cliente (SPA). |
| `axios` | Cliente HTTP centralizado para comunicarse con la API. |
| `vite` | *(dev)* Servidor de desarrollo rápido y empaquetador de producción. |
| `@vitejs/plugin-react` | *(dev)* Soporte de JSX y Fast Refresh en Vite. |

### Raíz

| Paquete | Uso |
| --- | --- |
| `concurrently` | *(dev)* Ejecuta backend y frontend a la vez con un solo comando. |

---

## 4. Instalación

### 4.1 Clonar el repositorio

```powershell
git clone https://github.com/TU_USUARIO/studia.git
cd studia
```

### 4.2 Instalar dependencias

```powershell
# Opción A: todo de una vez desde la raíz
npm install
npm run install:all

# Opción B: proyecto por proyecto
cd backend ; npm install
cd ..\frontend ; npm install
```

### 4.3 Crear los archivos de entorno

```powershell
Copy-Item backend\.env.example  backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Ajusta `backend/.env` si tu MySQL tiene contraseña. Para generar secretos JWT seguros:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> Los archivos `.env` están excluidos en `.gitignore`: **nunca** se suben al repositorio.

---

## 5. Base de datos

### 5.1 Importar `studia_database.sql` en phpMyAdmin (XAMPP)

1. Abre **XAMPP Control Panel** y pulsa **Start** en `Apache` y en `MySQL`.
   (Comprueba que ambos módulos aparecen en verde.)
2. Abre el navegador en **http://localhost/phpmyadmin**
3. En la barra superior, entra en la pestaña **Importar**.
   *(No es necesario crear la base de datos antes: el script la crea.)*
4. Pulsa **Seleccionar archivo** y elige `backend/database/studia_database.sql`.
5. Verifica que:
   - **Conjunto de caracteres del archivo:** `utf-8`
   - **Formato:** `SQL`
6. Pulsa **Continuar** (abajo a la derecha).
7. Al finalizar verás el mensaje *"La importación se ha ejecutado correctamente"* y, en el panel izquierdo, la base de datos **`studia_db`** con **15 tablas**.
8. En la parte inferior de la importación aparecen las **consultas de verificación** del script (número de tablas, claves foráneas, índices, uniones entre tablas y volumen de datos demo). Si todas devuelven filas, las relaciones son válidas.

**Alternativa por línea de comandos (Windows):**

```powershell
cd "C:\xampp\mysql\bin"
.\mysql.exe -u root --default-character-set=utf8mb4 -e "source C:/ruta/completa/backend/database/studia_database.sql"
```

> Usa barras `/` en la ruta del comando `source`.

### 5.2 Modelo de datos

15 tablas relacionadas. Todas las tablas de datos del estudiante incluyen `user_id`, de modo que la información siempre queda asociada a su usuario.

| Tabla | Propósito | Relación principal |
| --- | --- | --- |
| `users` | Cuentas de acceso (estudiante, tutor, admin). | — |
| `student_profiles` | Datos académicos del estudiante. | `user_id` → `users` (1:1) |
| `subjects` | Materias o asignaturas. | `user_id` → `users` |
| `topics` | Temas dentro de cada materia. | `subject_id` → `subjects`, `user_id` → `users` |
| `study_sessions` | Sesiones de estudio registradas. | `user_id`, `subject_id`, `topic_id` |
| `tasks` | Tareas y pendientes académicos. | `user_id`, `subject_id`, `topic_id` |
| `exercises` | Ejercicios de práctica. | `user_id`, `subject_id`, `topic_id` |
| `exercise_attempts` | Intentos de resolución de ejercicios. | `exercise_id`, `user_id` |
| `errors` | Registro y análisis de errores de aprendizaje. | `user_id`, `topic_id`, `exercise_id`, `attempt_id` |
| `learning_preferences` | Preferencias y hábitos de estudio. | `user_id` → `users` (1:1) |
| `study_plans` | Planes de estudio con objetivo y periodo. | `user_id`, `subject_id` |
| `recommendations` | Recomendaciones personalizadas. | `user_id`, `study_plan_id`, `subject_id`, `topic_id` |
| `weekly_reports` | Reporte semanal de progreso (uno por semana). | `user_id` (único por semana) |
| `flashcards` | Tarjetas de repaso espaciado (SM-2). | `user_id`, `topic_id`, `error_id` |
| `achievements` | Logros desbloqueados. | `user_id` (único por código) |

**Detalles de integridad y buen diseño**

- Claves primarias `BIGINT UNSIGNED AUTO_INCREMENT` y claves foráneas con nombre explícito (`fk_*`).
- Restricciones de unicidad que evitan duplicados: `uq_users_email`, `uq_subjects_user_name`, `uq_topics_subject_name`, `uq_weekly_reports_user_week`, `uq_achievements_user_code`, `uq_attempts_exercise_user_number`, y relaciones 1:1 en `student_profiles` y `learning_preferences`.
- Índices en todos los filtros habituales (fechas, estados, prioridades) y claves foráneas.
- Restricciones `CHECK` para rangos coherentes (progreso 0-100, `focus_score` 1-5, fechas ordenadas, `accuracy_percentage` 0-100, etc.).
- `created_at` y `updated_at` en todas las tablas; `updated_at` se actualiza automáticamente.
- `JSON` para las opciones de ejercicios de opción múltiple, evitando columnas duplicadas.

### 5.3 Estrategia de eliminación de registros relacionados

| Situación | Estrategia | Motivo |
| --- | --- | --- |
| Cuenta de usuario | **Borrado lógico**: `status = 'deleted'` + `deleted_at` | Conserva el histórico de aprendizaje. |
| Eliminación física de un usuario | `ON DELETE CASCADE` en todas sus tablas dependientes | No quedan datos huérfanos. |
| Borrado de una materia o tema | `ON DELETE SET NULL` en sesiones, tareas, errores, tarjetas, planes y recomendaciones | El estudiante no pierde su historial de estudio. |
| Borrado de un ejercicio | `ON DELETE CASCADE` en sus intentos; `SET NULL` en los errores asociados | Desaparece la práctica, se conserva el aprendizaje derivado. |

Comprobado mediante una transacción de prueba (`DELETE` + `ROLLBACK`): al borrar un usuario se eliminan en cascada sus materias, temas, sesiones, tareas y tarjetas; al borrar una materia, sus temas se eliminan y las sesiones conservan su registro con `subject_id = NULL`.

### 5.4 Datos de demostración

Todos los datos de prueba son identificables:

- Correos con el dominio reservado **`@studia.demo`**
- Contraseña común de la demo: **`StudiaDemo123!`** (guardada en la base **solo** como hash bcrypt de coste 12)
- Usuarios: `admin@studia.demo` (admin), `ana@studia.demo` (estudiante), `luis@studia.demo` (estudiante)
- 5 materias, 9 temas, 6 sesiones, 6 tareas, 5 ejercicios, 5 intentos, 3 errores, 3 planes, 4 recomendaciones, 2 reportes semanales, 4 tarjetas y 6 logros.

Para eliminar toda la demo:

```sql
DELETE FROM users WHERE email LIKE '%@studia.demo';
```

---

## 6. Ejecución

### 6.1 Levantar todo junto (raíz del repositorio)

```powershell
npm run dev
```

Arranca el backend en `http://localhost:4000` y el frontend en `http://localhost:5173`.

### 6.2 Ejecutar cada proyecto por separado

```powershell
# Terminal 1 - backend
cd backend
npm run dev      # desarrollo (reinicio automático con nodemon)
npm start        # producción

# Terminal 2 - frontend
cd frontend
npm run dev
```

Cada aplicación funciona de forma independiente: el backend responde aunque el frontend esté apagado, y el frontend muestra un aviso claro si la API no está disponible.

---

## 7. Verificación de la comunicación

Con ambos servidores en ejecución, la página de inicio (`http://localhost:5173`) consulta la API y muestra el estado del sistema. Equivalencias por terminal:

```powershell
# Estado de la API y de la conexión a MySQL
Invoke-RestMethod http://localhost:4000/api/health

# Tablas creadas en la base de datos (deben ser 15)
Invoke-RestMethod http://localhost:4000/api/health/db

# Índice de la API
Invoke-RestMethod http://localhost:4000/api
```

### Rutas iniciales disponibles

| Método | Ruta | Estado |
| --- | --- | --- |
| GET | `/` | Información básica de la API |
| GET | `/api` | Índice de recursos disponibles |
| GET | `/api/health` | Estado de la API y de la base de datos |
| GET | `/api/health/db` | Conexión y tablas del esquema |
| POST | `/api/auth/register` | Preparado, responde `501 Not Implemented` |
| POST | `/api/auth/login` | Preparado, responde `501 Not Implemented` |
| POST | `/api/auth/refresh` | Preparado, responde `501 Not Implemented` |
| POST | `/api/auth/logout` | Preparado, responde `501 Not Implemented` |
| GET | `/api/auth/me` | Preparado, responde `501 Not Implemented` |

Formato uniforme de todas las respuestas:

```json
{ "success": true, "error": null, "message": "…", "data": {} }
```

---

## 8. Seguridad implementada

- **Contraseñas hasheadas con bcrypt** (coste 12). La base de datos no almacena texto plano. Genera un hash nuevo con:
  `npm run hash:password -- "MiContraseña"` (o `cd backend ; npm run hash:password -- "MiContraseña"`).
- **Sentencias preparadas** con `pool.execute()` y marcadores de posición: única vía permitida para incluir datos de usuario en SQL.
- **Variables sensibles en `.env`**, excluidas de Git.
- **CORS restringido** al origen del frontend (`CORS_ORIGIN`).
- **Cabeceras de seguridad** con `helmet`, sin exponer `x-powered-by`.
- **Límite de peticiones** por IP y manejo centralizado de errores que no filtra trazas en producción.

---

## 9. Git y GitHub

```powershell
git init
git add .
git commit -m "Estructura inicial de STUDIA: frontend React, backend Express y base de datos MySQL"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/studia.git
git push -u origin main
```

Antes del primer commit, comprueba que `.env` no aparece en la lista:

```powershell
git status
```

---

## 10. Próximos pasos (módulos aún no desarrollados)

1. Autenticación real: registro, inicio de sesión, JWT y recuperación de contraseña.
2. Modelos y controladores por recurso (materias, temas, sesiones, tareas, errores, ejercicios, tarjetas, logros).
3. Importación de los datos demo en la interfaz y panel de progreso.
4. Motor de recomendaciones y generación de reportes semanales.
5. Pruebas automatizadas y despliegue.

---

## 11. Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `No se puede cargar el archivo npm.ps1…` | Política de ejecución de PowerShell | Usa `npm.cmd` o ejecuta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `database: "down"` en `/api/health` | MySQL detenido o `.env` incorrecto | Inicia MySQL en XAMPP y revisa `DB_*` en `backend/.env` |
| `tablesCount: 0` | El script SQL no se importó | Repite la sección 5.1 |
| El frontend muestra "Sin conexión con la API" | El backend no está en ejecución | Ejecuta `npm run dev` en `backend` |
| `EADDRINUSE` en el puerto 4000 o 5173 | Puerto ocupado | Cambia `PORT` en `backend/.env` o `server.port` en `frontend/vite.config.js` |
| Error de CORS en el navegador | Origen no permitido | Añade el origen en `CORS_ORIGIN` de `backend/.env` |
