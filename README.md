# No Entiendo Ni Papa 🥔

PWA para aprender inglés desde cero (A1). Next.js 16 (export estático) + TypeScript estricto + Tailwind 4 + Dexie (IndexedDB) + Service Worker propio. Sin backend, sin cuentas, sin variables de entorno.

> *Hoy no entiendes nada. Mañana, un poquito menos.*

## Ejecutar en local

```bash
npm install
npm run dev            # desarrollo (el Service Worker NO se registra en dev)
npm run build          # next build + genera out/sw.js con la precaché
npm start              # sirve out/ en http://localhost:3000 (PORT=4173 para otro puerto)
npm run typecheck
npm test               # pruebas unitarias (vitest)
npx playwright test    # E2E en Edge/Chrome del sistema; requiere `npm run build` previo (PW_CHANNEL=chrome para Chrome)
```

> Si el proyecto está dentro de OneDrive, el observador de archivos a veces falla (Playwright no encontró tests hasta recrear el archivo). Mejor trabajar fuera de OneDrive.

## Estructura

```
src/app/            rutas (/, /welcome, /path, /lesson/[id], /review, /stats, /settings, /install)
src/components/     UI (Client Components solo donde hay interacción)
src/content/        12 unidades × 2 lecciones (24); costa.ts (expresiones) y conversations.ts
src/lib/engine.ts   generación y corrección de ejercicios (pura)
src/lib/srs.ts      repaso espaciado (reglas locales, configurable)
src/lib/streak.ts   racha con fechas locales
src/lib/db.ts       esquema Dexie + validación de ajustes
src/lib/progress.ts escritura de progreso y estadísticas
src/lib/audio.ts    archivos descargables, voz del dispositivo, reconocimiento de voz
src/lib/pwa.ts      registro del SW, actualizaciones, almacenamiento
src/sw/             plantilla del Service Worker (scripts/gen-sw.mjs la completa tras el build)
tests/ e2e/         vitest y Playwright
```

## De la Costa pa'l mundo (módulo de expresiones y conversaciones)
Ruta `/costa/`. Aprende **qué decir según la intención, el contexto y el registro** (no traducción literal).
- **8 categorías · 24 expresiones** (saludos, amigos, comida, compras, trabajo y tecnología, viajes, colombianas, formal vs informal). Cada una trae significado contextual, situación, registro (informal/neutral/formal), 3 equivalencias con su matiz, ejemplos, audio (voz del dispositivo o archivo) y errores frecuentes de hispanohablantes.
- **Actividades** (en el mismo `ExerciseRunner`): respuesta natural en una situación, intención de una frase (escuchada o leída), completar conversación, ordenar, corregir error frecuente, formal vs informal, producir, explicar en inglés sencillo y recordar sin ver la traducción (repaso). Pista opcional, retroalimentación específica por opción y «Intentar de nuevo» (solo el primer intento puntúa).
- **5 conversaciones ramificadas** (Cartagena, restaurante, tienda, amigo, hotel): el personaje responde según tu elección, se explica por qué funciona, la forma más natural y cómo seguir. Reglas locales: funcionan sin internet. Pedir que repitan no penaliza.
- **Ampliar sin tocar el motor:** añade objetos a `src/content/costa.ts` (expresiones) o `src/content/conversations.ts` (diálogos). Los tests validan la integridad de los datos.
- **Progreso:** reutiliza Dexie sin cambiar el esquema (`lessons`: `costa-<categoría>`, `talk-<conversación>`; `items`: `x:<expresión>`). Las expresiones fallidas entran al Repaso.

## Mascota «Papito» (papa costeña con sombrero vueltiao)
`src/components/Mascot.tsx` (SVG propio, sin imágenes externas; 9 estados: wave, happy, cheer, think, hint, oops, cool, sleepy, party). `src/lib/mascot.ts` define los mensajes por contexto (saludar, explicar, acierto, error, pista, misión, racha, repasar, offline, despedida, vacío, error) y evita repetir el último mensaje; ampliar = añadir frases al banco. Los iconos de la app (`public/icons`) se regeneran con `node scripts/gen-icons.mjs`.

## Repaso espaciado (no es IA)
Nivel de dominio 0–5. Acierto: +1 nivel (como mucho una vez por día: varios ejercicios del mismo elemento en una sesión no inflan el intervalo), próximo repaso en `[0,1,2,4,8,16]` días. Error: −2 niveles y vuelve hoy. Prioridad = días de retraso + 5 × tasa de error + bonus por nivel bajo. Todo en `DEFAULT_SRS` (`src/lib/srs.ts`).

## Offline: qué se guarda y cómo
- **App** (HTML, JS, CSS, iconos, payloads de Next): precaché versionada, cache-first. Una versión nueva espera y se aplica con el botón «Actualizar».
- **Progreso**: IndexedDB. Esquema versionado; los ajustes se validan al leer.
- **Audios**: caché aparte (`nenp-audio-v1`), solo lo que el usuario descarga; no se borra al actualizar la app.
- Nada más se cachea (ni peticiones externas ni POST).

## Audio
**Esta versión no incluye grabaciones.** Las frases suenan con la voz del dispositivo (Web Speech API); si no hay voz ni archivos se muestra el aviso y los ejercicios de escucha no se generan. Para añadir audios reales con licencia compatible:
1. Pon archivos en `public/audio/`, nombrados con el id (`u1l1p1.mp3` = frase 1 de la lección 1; `u1l1v1` = palabra; `u1l1d1` = línea 1 del diálogo).
2. `npm run audio:manifest` y vuelve a desplegar.
3. En la app: Ajustes → Descargar audios.

## Publicar en Vercel
1. Sube el proyecto a GitHub. 2. En vercel.com → *Add New Project* → importa el repo (preset Next.js; `vercel.json` ya fija `out/` y las cabeceras del SW). 3. Deploy. No hay variables de entorno.

## Instalar en el iPhone 15
Safari → abrir la URL de Vercel → Compartir → *Añadir a pantalla de inicio* → Añadir. Ábrela desde el icono con conexión unos segundos; luego prueba en modo avión. La app también trae esta guía en `/install`.

## Pruebas manuales pendientes en un iPhone real (no ejecutadas)
- Instalación y apertura en standalone; áreas seguras (notch/home bar).
- Modo avión tras la primera carga: abrir, completar lección, cerrar la app desde el selector, reabrir.
- Voz sintética en inglés con/sin conexión; interruptor de silencio.
- Reconocimiento de voz (en iOS suele no funcionar con la app instalada, y requiere red).
- Descarga de audios (cuando existan) y reproducción en avión.
- Persistencia tras días sin abrir la app (iOS puede purgar datos de webs no instaladas).

## Limitaciones conocidas
- Solo contenido A1 (24 lecciones); sin A2/B1 todavía.
- Sin audios grabados incluidos.
- La producción escrita solo verifica palabras clave, no gramática; la práctica oral compara palabras reconocidas, no acento.
- Las pruebas E2E corren en Chromium, no en WebKit/Safari.
- iOS: la primera carga requiere internet; cuota y purga de almacenamiento controladas por Apple.
- Interfaz solo en español, sin modo oscuro.
