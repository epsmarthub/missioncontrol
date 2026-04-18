---
name: missioncontrol-openclaw
description: Use when implementing or extending MissionControl with a real PostgreSQL database, Prisma persistence, a protected API for OpenClaw agents, and a local-first architecture where Supabase is optional rather than required.
---

# MissionControl + OpenClaw

## Usar esta skill cuando

- vayas a conectar MissionControl a base de datos real;
- necesites reemplazar el estado demo por Prisma/PostgreSQL;
- quieras exponer una API para agentes de OpenClaw;
- tengas que documentar o mantener la frontera entre UI, backend y agentes.

## Estado actual del repo

MissionControl ya tiene una UI avanzada y un dominio bastante definido, pero el backend sigue en modo demo.

- Stack real ya instalado: `Next.js 16`, `React 19`, `Prisma`, `PostgreSQL`, `Supabase` opcional y `OpenAI`.
- Esquema base ya definido en `prisma/schema.prisma`.
- Auth Google ya preparado en `app/auth/login/route.ts` y `app/auth/callback/route.ts`.
- Cliente Prisma ya existe en `lib/prisma.ts`.
- Variables de entorno ya centralizadas en `lib/env.ts`.
- API actual ya tiene rutas base en `app/api/**`.
- El estado funcional de la app aun depende de `lib/demo-data.ts`, `lib/mission-control.ts` y `components/mission-control-provider.tsx`.

Hoy el sistema sirve para demo UX, no como backend autoritativo.

## Objetivo de arquitectura

MissionControl debe operar con esta separacion local-first:

1. `PostgreSQL + Prisma` como fuente de verdad.
2. `Next.js API routes` como BFF para la UI web.
3. `API protegida /api/openclaw/*` para agentes OpenClaw.
4. `OpenAI` solo para razonamiento, coordinacion y voz; nunca como fuente de verdad de negocio.
5. `ZeroTier` como perimetro de acceso remoto privado.
6. `Supabase` solo como opcion futura para auth o realtime si alguna vez hace falta.

## Principios operativos

- La UI no debe decidir XP, aprobaciones ni estados finales por si sola.
- Las transiciones de tarea deben persistirse y auditarse en servidor.
- El calculo de XP y level-up debe ocurrir dentro de una transaccion.
- Los agentes OpenClaw no deben tocar la base directamente; solo a traves de API autenticada.
- Toda accion hecha por agente debe dejar rastro auditable.
- Los comandos de voz, menciones y coordinaciones deben degradar con elegancia si OpenAI no esta disponible.

## Archivos del repo que gobiernan esta integracion

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `lib/prisma.ts`
- `lib/env.ts`
- `lib/mission-control.ts`
- `lib/demo-data.ts`
- `lib/types.ts`
- `lib/xp.ts`
- `components/mission-control-provider.tsx`
- `app/api/chat/mention/route.ts`
- `app/api/agents/coordinate/route.ts`
- `app/api/standup/route.ts`
- `app/api/tasks/[taskId]/transition/route.ts`
- `app/api/tasks/[taskId]/approve/route.ts`
- `app/api/voice/session/route.ts`
- `app/api/voice/tts/route.ts`

## Modelo de implementacion recomendado

### Fase 1. Infraestructura y entorno

Configura estas variables:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_TEXT_MODEL`
- `OPENAI_REALTIME_MODEL`
- `OPENAI_TTS_MODEL`
- `OPENCLAW_API_KEY`

Variables opcionales:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Comandos base:

```bash
npm install
npm run prisma:generate
npm run db:push
npm run db:seed
```

Para produccion, reemplaza `db:push` por migraciones versionadas.

Para despliegue local en red privada:

- ejecuta MissionControl en la maquina host;
- ejecuta PostgreSQL en la misma maquina o en otra dentro de tu LAN;
- entra a la app por la IP ZeroTier del host.

### Fase 2. Hacer que la base de datos sea autoritativa

Reemplaza el flujo actual:

- `createDemoSnapshot()`
- estado React persistido en `localStorage`
- respuestas API derivadas de snapshot en memoria

por un flujo server-first:

1. leer datos desde Prisma;
2. construir un snapshot de vista para la UI;
3. mutar datos solo desde rutas API o server actions;
4. refrescar UI desde respuestas reales o realtime.

### Fase 3. Crear una capa server dedicada

Antes de tocar mas rutas, extrae logica de acceso y dominio a modulos dedicados:

- `lib/server/snapshot.ts`
- `lib/server/tasks.ts`
- `lib/server/agents.ts`
- `lib/server/chat.ts`
- `lib/server/summaries.ts`
- `lib/server/voice.ts`
- `lib/server/openclaw-auth.ts`
- `lib/server/audit.ts`

Responsabilidades:

- `snapshot.ts`: construir el objeto que hoy consume la UI.
- `tasks.ts`: transiciones, aprobaciones, asignaciones, XP.
- `agents.ts`: consulta de perfiles, contextos y recomendaciones.
- `chat.ts`: canales, mensajes, menciones y coordinacion.
- `summaries.ts`: markdown y publicacion de minutas.
- `voice.ts`: sesiones de voz, gating y emision de token.
- `openclaw-auth.ts`: autenticacion M2M para OpenClaw.
- `audit.ts`: registro de acciones humanas y de agentes.

Si luego quieres modo totalmente local sin Supabase:

- auth humana simple o acceso por ZeroTier;
- presencia por polling o WebSocket propio;
- Prisma como unica capa de persistencia.

### Fase 4. Migrar la UI actual

El `MissionControlProvider` debe dejar de ser el dueno del dominio y pasar a ser un cliente fino.

Meta de esa migracion:

- `snapshot` inicial viene del servidor;
- mover tarea llama a API real;
- aprobar tarea llama a API real;
- enviar mensaje publica mensaje real;
- coordinacion entre agentes crea thread real;
- exportar resumen usa `MeetingSummary.markdown` persistido;
- voz consulta `VoiceSession` real;
- `localStorage` queda solo para preferencias de UI, nunca para negocio.

## Esquema actual y cambios sugeridos

El esquema actual ya cubre bastante bien:

- `User`
- `AgentProfile`
- `Task`
- `TaskAssignment`
- `TaskStatusHistory`
- `XpEvent`
- `ChatChannel`
- `ChatMessage`
- `DirectThread`
- `MeetingSummary`
- `VoiceSession`
- `PresenceState`

Para OpenClaw y operacion real, agrega al menos:

### `IntegrationKey`

Para autenticar sistemas externos como OpenClaw.

Campos recomendados:

- `id`
- `name`
- `keyHash`
- `scope[]`
- `active`
- `createdAt`
- `lastUsedAt`

### `AgentActionLog`

Para auditar todo lo que haga un agente.

Campos recomendados:

- `id`
- `agentId`
- `actionType`
- `resourceType`
- `resourceId`
- `requestId`
- `payload`
- `createdAt`

### `IdempotencyRecord`

Para evitar doble ejecucion de eventos remotos.

Campos recomendados:

- `id`
- `key`
- `route`
- `actorType`
- `actorId`
- `responseCode`
- `responseBody`
- `createdAt`

## Rutas actuales y como evolucionarlas

### Rutas UI existentes

Manten estas rutas como frontera de la app web:

- `POST /api/chat/mention`
- `POST /api/agents/coordinate`
- `GET /api/standup`
- `POST /api/tasks/:taskId/transition`
- `POST /api/tasks/:taskId/approve`
- `POST /api/voice/session`
- `POST /api/voice/tts`

Pero ya no deben usar:

- `getInitialSnapshot()`
- `createDemoSnapshot()`
- respuestas `"ok: true"` fake

En su lugar deben delegar a servicios server con Prisma.

### Nueva API para OpenClaw

Crear namespace exclusivo:

- `GET /api/openclaw/health`
- `GET /api/openclaw/agents`
- `GET /api/openclaw/agents/:agentId/context`
- `GET /api/openclaw/tasks`
- `POST /api/openclaw/tasks/:taskId/claim`
- `POST /api/openclaw/tasks/:taskId/transition`
- `POST /api/openclaw/tasks/:taskId/approve`
- `POST /api/openclaw/chat/post`
- `POST /api/openclaw/coordinate`
- `POST /api/openclaw/summaries`
- `GET /api/openclaw/channels`
- `GET /api/openclaw/standup`

## Autenticacion de OpenClaw

Usa autenticacion M2M separada de la sesion web.

Headers minimos:

- `Authorization: Bearer <OPENCLAW_API_KEY>`
- `X-OpenClaw-Agent-Id: <agentId>`
- `Idempotency-Key: <uuid>`

Reglas:

- validar la key contra `IntegrationKey`;
- verificar que el `agentId` exista y este activo;
- registrar cada request en `AgentActionLog`;
- rechazar escrituras sin `Idempotency-Key`;
- responder `401`, `403` o `409` cuando corresponda.

## Contratos recomendados para OpenClaw

### `GET /api/openclaw/agents/:agentId/context`

Devuelve contexto operativo para que el agente razone sin leer toda la base.

```json
{
  "agent": {
    "id": "jarvis",
    "name": "Jarvis",
    "classId": "mage",
    "level": 7,
    "voice": "alloy"
  },
  "assignedTasks": [
    {
      "id": "task-1",
      "title": "Disenar mapa HQ estilo SNES",
      "status": "in_progress",
      "priority": "high",
      "blockedReason": null
    }
  ],
  "recentMessages": [],
  "activeChannels": [],
  "policy": {
    "canApprove": false,
    "canPublishSummary": true
  }
}
```

### `POST /api/openclaw/tasks/:taskId/transition`

```json
{
  "nextStatus": "review",
  "reason": "Implementacion terminada y lista para validacion",
  "note": "Queda pendiente aprobacion de supervisor"
}
```

Respuesta:

```json
{
  "ok": true,
  "taskId": "task-1",
  "fromStatus": "in_progress",
  "toStatus": "review"
}
```

### `POST /api/openclaw/chat/post`

```json
{
  "channelId": "hq-command",
  "content": "Jarvis reporta que la tarea paso a review.",
  "mentions": ["serapha"]
}
```

### `POST /api/openclaw/coordinate`

```json
{
  "sourceChannelId": "hq-command",
  "initiatorId": "jarvis",
  "targetId": "alaria",
  "topic": "Revisar pendientes para el cierre de la entrega"
}
```

Debe:

1. crear thread;
2. guardar transcript;
3. generar resumen markdown;
4. publicarlo en canal de summaries;
5. registrar auditoria.

## Reglas de negocio que no deben romperse

### XP y level-up

- solo se entrega XP cuando una tarea llega a `done` real;
- si `requiresApproval = true`, pasar a `done` desde la UI o desde OpenClaw debe redirigir a `review`;
- la aprobacion final crea `XpEvent`;
- si hay varios agentes asignados, el XP se reparte;
- el level-up debe recalcular stats en servidor.

### Chat y coordinacion

- una mencion debe guardar el mensaje primero y responder despues;
- la respuesta del agente debe incluir contexto real de tareas y canal;
- la coordinacion entre agentes debe persistir thread, transcript y summary;
- el `.md` visible en UI debe salir de `MeetingSummary.markdown`.

### Voz

- si la voz no esta habilitada para sala y usuario, no abras sesion;
- `VoiceSession` debe tener expiracion;
- el cliente nunca recibe la API key real de OpenAI.

## Snapshot de servidor recomendado

Crea una funcion tipo:

```ts
getMissionControlSnapshotForUser(userId: string, channelId?: string)
```

Debe devolver el shape que la UI ya espera, pero construido desde Prisma:

- usuario actual;
- agentes;
- tareas;
- historial;
- XP;
- canales;
- mensajes recientes;
- threads;
- summaries;
- presence;
- estado de voz.

Haz que esta funcion viva en servidor y reutilizala tanto en paginas SSR como en rutas API.

## Orden exacto de migracion sugerido

1. dejar Prisma y seed funcionando;
2. crear `snapshot.ts` con lectura real desde BD;
3. conectar `GET /api/standup` a BD real;
4. implementar `transition` y `approve` con transacciones;
5. migrar chat, mensajes y summaries;
6. migrar mencion IA;
7. migrar coordinacion entre agentes;
8. anadir namespace `/api/openclaw/*`;
9. anadir `IntegrationKey`, `AgentActionLog` e `IdempotencyRecord`;
10. conectar realtime/presencia;
11. conectar voz real.

## Transacciones minimas

Usa `prisma.$transaction()` para:

- transicion a `review` o `done`;
- aprobacion con creacion de `XpEvent`;
- asignacion de tarea + historial;
- coordinacion con thread + messages + summary;
- publicacion de mensaje con menciones procesadas.

## Validacion minima antes de dar por terminada la integracion

- login Google crea o resuelve `User`;
- `GET /api/standup` ya no usa demo data;
- mover tarea actualiza `Task` y `TaskStatusHistory`;
- aprobar tarea crea `XpEvent` y sube nivel cuando corresponde;
- chat persiste `ChatMessage`;
- coordinacion crea `DirectThread` y `MeetingSummary`;
- OpenClaw puede autenticarse y consultar contexto;
- OpenClaw puede mover tarea con `Idempotency-Key`;
- voice session nunca expone secretos del servidor;
- la UI sigue operativa aunque OpenAI falle.

## Implementacion minima aceptable

Si el tiempo es corto, completa primero esto:

1. Prisma real para tareas, agentes, mensajes y summaries.
2. `transition` y `approve` transaccionales.
3. `GET /api/openclaw/agents/:agentId/context`.
4. `POST /api/openclaw/tasks/:taskId/transition`.
5. `POST /api/openclaw/chat/post`.

Con eso ya tienes una base util para que OpenClaw interactue con MissionControl sin depender del snapshot demo.

## Que no hacer

- no leas negocio desde `localStorage`;
- no uses la base demo como fallback silencioso en produccion;
- no permitas a OpenClaw escribir directo por Prisma sin API;
- no calcules XP en cliente;
- no generes summaries solo en frontend;
- no mezcles auth de usuario humano con auth M2M de agentes.
- no trates Supabase como requisito si el despliegue es completamente local.

## Resultado esperado

Cuando esta skill se aplique bien, MissionControl queda con:

- UI retro ya construida;
- backend persistente y auditable;
- contratos claros para OpenClaw;
- separacion limpia entre usuario, supervisor y agente;
- base lista para evolucionar a realtime y voz real sin rehacer el dominio.
