# Skool Public Calendar

Publica el calendario de una comunidad pública de Skool como un feed iCalendar al que se pueden suscribir Google Calendar, Apple Calendar, Outlook y otros clientes compatibles.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ctala/Sync2SkoolCalendar)

## Qué Hace

- Lee el calendario público de Skool sin credenciales ni cookies.
- Incluye eventos visibles aunque tengan metadatos de un nivel Premium o VIP.
- Usa las ocurrencias que Skool ya expandió para respetar cambios y excepciones de eventos recurrentes.
- Genera un `VEVENT` por ocurrencia con UID estable.
- Sincroniza cada 30 minutos y guarda el último calendario válido en Cloudflare KV.
- Sigue sirviendo ese calendario si Skool falla o cambia temporalmente su respuesta.
- Expone por defecto `/calendario.ics`.

No recupera links de llamada que Skool omite de sus respuestas anónimas. Cada entrada siempre enlaza a la página correspondiente del evento en Skool.

## Arquitectura

```text
Skool público
      |
      v
Cloudflare Worker --cada 30 min--> Calendar KV
      |                                |
      +------ GET /calendario.ics <----+
```

El Worker reconstruye snapshots completos. Solo reemplaza KV cuando todas las páginas solicitadas son válidas; una respuesta parcial nunca elimina el calendario anterior.

## Configuración

Las variables no son secretas y se definen en `wrangler.jsonc`:

| Variable | Valor predeterminado | Uso |
| --- | --- | --- |
| `GROUP_SLUG` | `cagala-aprende-repite` | Slug de la comunidad pública en Skool |
| `CALENDAR_NAME` | `Cágala, Aprende, Repite` | Nombre mostrado por los calendarios |
| `FEED_PATH` | `/calendario.ics` | Ruta pública del feed |
| `PAST_MONTHS` | `1` | Meses pasados incluidos |
| `FUTURE_MONTHS` | `12` | Meses futuros incluidos |
| `CACHE_CONTROL` | `public, max-age=300, stale-while-revalidate=3600` | Caché HTTP del feed |

No se necesita una API key de Skool.

## Desarrollo Local

Requisitos: Node.js 22.22.2 o superior y npm 12.1.0.

```bash
npm install
npm run types
npm test
npm run typecheck
npm run dev
```

`npm run dev` habilita el endpoint local para probar el Cron manualmente:

```text
http://localhost:8787/__scheduled
```

Después del primer sync, el calendario queda disponible en:

```text
http://localhost:8787/calendario.ics
```

## Pruebas

```bash
npm test
npm run test:coverage
npm run types:check
npm run typecheck
npm run deploy:dry
```

Las pruebas usan el runtime real de Workers, KV local aislado y fixtures sanitizados de Skool. `ical.js` actúa como parser independiente para verificar el resultado.

Para validar una URL desplegada:

```bash
npm run smoke -- https://example.workers.dev/calendario.ics
```

## Deploy to Cloudflare

El botón al inicio del README clona el repositorio, despliega el Worker y aprovisiona automáticamente el namespace KV porque el binding `CALENDAR_KV` no contiene un ID fijo. No requiere secretos.

El primer deploy entrega una URL `workers.dev`. Para usar un dominio propio:

1. Abre el Worker en el dashboard de Cloudflare.
2. En **Settings > Domains & Routes**, agrega una ruta para el path deseado.
3. Para CAR, la ruta de producción es `aprenderepite.com/calendario.ics`.
4. Ejecuta el smoke test contra la URL final.

La zona del dominio debe existir en la misma cuenta de Cloudflare. El botón no puede asociar automáticamente el dominio de otra persona.

Este repositorio mantiene la ruta de CAR en un entorno separado para que el deploy genérico siga siendo reutilizable:

```bash
npm run deploy:production:dry
npm run deploy:production
npm run smoke -- https://aprenderepite.com/calendario.ics
```

## Suscripción

La URL HTTPS se puede agregar como calendario por suscripción. Algunas aplicaciones también aceptan la variante `webcal://`:

```text
https://aprenderepite.com/calendario.ics
webcal://aprenderepite.com/calendario.ics
```

La frecuencia con que aparece un cambio depende también del cliente. Aunque el Worker refresca cada 30 minutos, Google Calendar, Apple Calendar y Outlook deciden cuándo vuelven a consultar el feed.

## Limitaciones

- La integración usa endpoints públicos no documentados de Skool.
- Solo se soportan comunidades públicas.
- La ventana no es infinita: por defecto incluye un mes pasado y doce futuros.
- La suma de meses pasados, el mes actual y meses futuros no puede superar 15 para respetar el presupuesto de subrequests de Workers.
- Cada solicitud a Skool tiene un timeout de 10 segundos. Tras un cold-start fallido, el Worker espera 5 minutos antes de volver a intentarlo desde una petición pública.
- Skool no publica tombstones de cancelación; una ocurrencia eliminada desaparece del siguiente snapshot completo.
- Un fallo antes del primer sync devuelve HTTP 503. Después del primer sync siempre se conserva el último calendario válido.

## Rollback

Quita la ruta personalizada del Worker o apúntala nuevamente a su destino anterior. El sitio Astro de `aprenderepite.com` no se modifica y las otras rutas siguen funcionando con normalidad.
