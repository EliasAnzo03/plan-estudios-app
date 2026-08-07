# Reglas del Proyecto: Sistema de Gestión de Plan de Estudios

## Arquitectura General

- El proyecto está dividido en un **Backend** (API REST) y un **Frontend** (SPA).
- **Backend**: Se ejecuta en el puerto **3000**.
- **Frontend**: Se encuentra en la carpeta `/frontend` y se ejecuta con **Vite** en el puerto **5173** (con proxy configurado hacia el backend).

## Stack del Backend

- **Node.js** con **Express**.
- **Base de datos**: **PostgreSQL** (en la nube con **Neon**).
- Se usa la librería **`pg`** con un pool centralizado en `db.js` (módulo que ya define el esquema multitenant: "carreras", "usuarios", "materias", "usuario_materia", "correlativas", "parciales").
- **REGLA CRÍTICA**: toda consulta a la BD se hace a través del pool (`pool.query`), nunca creando conexiones nuevas sueltas. Las migraciones/schemas van en `db.js` a través de `initSchema()`.

## Stack del Frontend

- **React** (creado con **Vite**).
- **Estilos**: **Tailwind CSS**.
- Utilizar siempre **Componentes Funcionales** (Functional Components) y **React Hooks**.
- Mantener los componentes **modulares** y separados por responsabilidad (UI, lógica de negocio).

## Estilo de Código y Respuestas

- Responder siempre con código **limpio, modular y comentado** donde haya lógica compleja.
- **No romper funcionalidades existentes** al sugerir refactorizaciones.
- Las respuestas de la IA deben ser en **español**.
- **Formato de respuestas (ahorro de tokens)**:
  - Respuestas **concisas y al punto**.
  - **No repetir** el código completo del archivo: solo mostrar los fragmentos modificados.
  - En bloques de código indicar idioma y ruta del archivo (ej. `javascript frontend/src/Login.jsx`).
  - Priorizar **solución/diagnóstico directo** antes que explicaciones extensas.
  - Listar pasos de verificación solo si aportan valor para confirmar el fix.

## Patrones de Edición (evitar reescritura innecesaria)

- **Editar, no reescribir**: realizar ediciones quirúrgicas (`single_find_and_replace` / `edit_existing_file`) sobre el archivo existente. **Nunca regenerar el archivo completo** desde cero.
- **Reusar componentes y lógica**: si una funcionalidad ya existe (ej. el fetch de `GET /api/carreras` en `Login.jsx`), refactorizar **in-place** antes que duplicar código.
- **No hardcodear datos provenientes del backend**: listas como carreras/materias DEBEN provenir de un endpoint, nunca escritas a mano en el frontend.
- **Cambios mínimos**: tocar solo las líneas necesarias y preservar el resto intacto (usar placeholders `// ... existing code ...` en demostraciones).

## Uso Correcto de las Herramientas de Edición

- **Leer antes de editar**: siempre usar `read_file` justo antes de modificar, para conocer el contenido actual (el archivo puede cambiar mientras se trabaja).
- **Una llamada de edición a la vez**: `single_find_and_replace` y `edit_existing_file` **NO se deben invocar en paralelo** con otras herramientas. Hacer cada edición de forma secuencial para evitar errores de argumentos.
- **Sintaxis correcta de parámetros**: pasar cada parámetro (`filepath`, `old_string`, `new_string`) con su clave correctamente. Llamadas con argumentos inválidos o faltantes fallan o "trabajan" al asistente.
- **Parámetros como argumentos directos**: en `single_find_and_replace` / `edit_existing_file` los parámetros se pasan como claves de primer nivel de la llamada (ej. `filepath: <ruta>`), NUNCA anidados dentro de un objeto tipo `{"arguments": {...}}`. Anidarlos o duplicar las claves provoca el error "string old_string is required" y puede cancelar llamadas del usuario. Si una llamada falla por esto, releer y reintentar la edición con los parámetros desplegados correctamente.
- **`old_string` exacto y único**: usar el texto exacto incluyendo indentación/espacios. Si el texto no es único en el archivo, ampliar el contexto circundante, usar `replace_all` con cautela, o **releer el archivo completo numerado** (con `read_file` o terminal) para verificar duplicados reales.
- **Si una edición falla**: releer el archivo (o listar su contenido numerado) para ver el estado real antes de reintentar. No encadenar reintentos ciegos.
- **Verificar el resultado**: tras editar, releer el fragmento para confirmar que la modificación quedó como se esperaba.

## Auto-mejora: actualizar las convenciones

- **Si algo sale mal durante una tarea** (errores de herramientas, malentendidos de stack, malas prácticas, decisiones que hubo que corregir), el asistente **DEBE actualizar él mismo este archivo** con la lección aprendida.
- La actualización se hace **al final de la tarea**, antes de cerrar, como parte del cierre normal del trabajo.
- **No esperar a que el usuario lo pida**: es responsabilidad del asistente registrar el aprendizaje para no repetir el mismo error en el futuro.
- Añadir una regla corta y directa (nueva línea o bullet) en la sección correspondiente, o una nueva sección si lo amerita.

## Despliegue / Scripts en Render

- **Backend en Render** (puerto 3000): configurar `DATABASE_URL` (PostgreSQL/Neon), `JWT_SECRET` y `FRONTEND_URL` como variables de entorno en Render.
- **Script de arranque**: el `start` corre `node seeder.js && node index.js`. El seeder es **idempotente**, por lo que es seguro en cada deploy; para arranques rápidos usar solo `node index.js`.
- **Seed manual**: si no aparecen datos nuevos tras agregar una carrera/materia al seeder, **ejecutar `node seeder.js` por consola** para forzar la inserción en la BD remota (resuelve el caso del dropdown que no se actualiza).
- **Caché entre front/back**: el backend envía headers anti-caché en `GET /api/carreras` y el frontend usa `cache: 'no-store'` para que los datos nuevos aparezcan sin conflicto de caché del navegador.
