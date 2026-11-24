# php-practice · Módulo complementario PHP + MySQL

Módulo independiente de **STUDIA** que demuestra los contenidos del curso de PHP:
PHP básico, formularios **GET** y **POST**, superglobales (`$_GET`, `$_POST`,
`$_SERVER`), validación de datos, conexión a MySQL con **PDO**, operaciones
**CRUD** con consultas preparadas y manejo de errores.

> No interfiere con la aplicación principal: usa su **propia base de datos**
> (`php_practice`) y su **propia tabla de demostración**
> (`php_demo_estudiantes`). No toca `studia_db` en ningún momento.

---

## 1. Requisitos

- **XAMPP** con Apache y MySQL en marcha (PHP 7.4 o superior; probado con PHP 8.x).
- Un navegador web.

---

## 2. Crear la base de datos

1. Arranca **Apache** y **MySQL** desde el Panel de Control de XAMPP.
2. Abre <http://localhost/phpmyadmin>.
3. Pestaña **Importar** → **Seleccionar archivo** → elige
   `php-practice/sql/php_practice.sql` → **Importar**.

El script crea la base `php_practice`, la tabla `php_demo_estudiantes` y tres
registros de ejemplo.

> Alternativa por línea de comandos:
> ```bat
> C:\xampp\mysql\bin\mysql -u root -p < php-practice\sql\php_practice.sql
> ```

---

## 3. Publicar el módulo en Apache

Elige **una** de las dos opciones.

### Opción A · Copiar la carpeta a `htdocs` (la más simple)

```powershell
Copy-Item -Recurse -Force "php-practice" "C:\xampp\htdocs\php-practice"
```

Abre: <http://localhost/php-practice/>

### Opción B · Alias de Apache (sin copiar archivos)

Edita `C:\xampp\apache\conf\extra\httpd-xampp.conf` (o el archivo de hosts
virtuales) y añade al final:

```apache
Alias /php-practice "C:/Users/MIA/Documents/trae_projects/My Real STUDIA/php-practice"

<Directory "C:/Users/MIA/Documents/trae_projects/My Real STUDIA/php-practice">
    AllowOverride All
    Require local
</Directory>
```

Reinicia Apache desde el Panel de Control de XAMPP y abre
<http://localhost/php-practice/>.

Con cualquiera de las dos opciones el módulo se enruta solo: la URL base se
calcula en `includes/bootstrap.php`, así que funciona igual servido desde
`/php-practice` o desde una subcarpeta.

---

## 4. Recorrido sugerido de la demostración

| Orden | Página | Contenido demostrado |
|------|--------|----------------------|
| 1 | `index.php` | Portada y comprobación en vivo de la conexión PDO |
| 2 | `formulario.php` | Formulario HTML con envío **GET** y **POST** |
| 3 | `get.php` | Uso de `$_GET`, validación y búsqueda con consulta preparada |
| 4 | `post.php` | Uso de `$_POST`, validación, alta con sentencia preparada y manejo de duplicados |
| 5 | `servidor.php` | Uso de `$_SERVER` (método, ruta, IP, agente de usuario…) |
| 6 | `crud/index.php` | **Read**: listado, búsqueda por GET y paginación |
| 7 | `crud/crear.php` | **Create**: alta con validación |
| 8 | `crud/editar.php` | **Update**: edición de un registro |
| 9 | `crud/eliminar.php` | **Delete**: confirmación y borrado por POST |

---

## 5. Estructura de archivos

```
php-practice/
├── index.php              Portada y estado de la conexión
├── formulario.php         Formulario HTML (GET y POST)
├── get.php                Procesamiento con $_GET
├── post.php               Procesamiento con $_POST
├── servidor.php           Demostración de $_SERVER
├── config/
│   ├── config.php         Credenciales (desde variables de entorno)
│   └── database.php       Conexión PDO (función db())
├── includes/
│   ├── bootstrap.php      Sesión, errores, URL base y conexión
│   ├── functions.php      Escape, entrada segura, CSRF y validación
│   ├── header.php         <head> y navegación
│   ├── footer.php         Pie de página
│   └── error.php          Página de error amable
├── crud/
│   ├── index.php          Listado + búsqueda + paginación
│   ├── crear.php          Alta
│   ├── editar.php         Edición
│   ├── eliminar.php       Borrado con confirmación
│   └── _formulario.php    Formulario reutilizable
├── sql/
│   └── php_practice.sql   Base de datos y tabla de demostración
└── assets/
    └── style.css          Estilos del módulo
```

---

## 6. Buenas prácticas aplicadas

| Requisito del curso | Dónde se demuestra |
|---------------------|--------------------|
| Formulario HTML | `formulario.php` |
| Procesamiento GET | `get.php` |
| Procesamiento POST | `post.php` |
| `$_GET` | `get.php`, `crud/index.php` (búsqueda y paginación) |
| `$_POST` | `post.php`, `crud/crear.php`, `crud/editar.php`, `crud/eliminar.php` |
| `$_SERVER` | `servidor.php`, `includes/bootstrap.php` |
| Validación de datos | `includes/functions.php` → `validar_estudiante()` |
| Conexión PDO | `config/database.php` |
| Consultas preparadas | Todas las consultas del módulo |
| Manejo de errores | `includes/bootstrap.php`, `includes/error.php`, `mensaje_error_pdo()` |
| Seguridad adicional | Escape de salida (`e()`), token CSRF, borrado por POST |

---

## 7. Solución de problemas

**«No se pudo conectar con MySQL»**
Comprueba que el servicio **MySQL** esté iniciado en XAMPP y que hayas importado
`sql/php_practice.sql`.

**«Base de datos desconocida: php_practice»**
Vuelve a importar el script SQL o créala a mano en phpMyAdmin.

**Página en blanco o error 500**
Revisa `C:\xampp\apache\logs\error.log`. El módulo guarda ahí el detalle técnico
(la página de error sólo muestra un mensaje amable).

**Tengo contraseña en MySQL (o un usuario distinto de `root`)**
El módulo lee las credenciales de variables de entorno y, si no existen, usa los
valores por defecto de XAMPP (`root`, sin contraseña). Puedes definir:

```powershell
setx PHP_PRACTICE_DB_USER "tu_usuario"
setx PHP_PRACTICE_DB_PASSWORD "tu_contraseña"
```

Vuelve a abrir la consola (o reinicia Apache) para que tome los nuevos valores.

**Quiero partir de cero**
Borra la base `php_practice` en phpMyAdmin y vuelve a importar el script SQL.
