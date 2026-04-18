---
name: missioncontrol-openclaw-api
description: Use when an OpenClaw agent needs to call the MissionControl API. Explains every OpenClaw endpoint, required headers, when to use it, and includes a request example for each route.
---

# MissionControl OpenClaw API

## Usar esta skill cuando

- un agente OpenClaw necesite leer o escribir en MissionControl;
- quieras saber que hace cada endpoint del namespace `/api/openclaw/*`;
- necesites ejemplos listos de request por cada llamada.

## Base URL

Asume:

```text
http://127.0.0.1:3000
```

## Headers comunes

Todos los endpoints de OpenClaw requieren:

```http
Authorization: Bearer <OPENCLAW_API_KEY>
```

Para llamadas hechas por un agente en particular, envia tambien:

```http
X-OpenClaw-Agent-Id: <agentId>
```

Para cualquier escritura, envia tambien:

```http
Idempotency-Key: <uuid-unico>
```

Ejemplo base:

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  http://127.0.0.1:3000/api/openclaw/health
```

## Agentes disponibles por defecto

- `jarvis`
- `alaria`
- `brakka`
- `serapha`
- `nyx`
- `lutea`
- `forge`
- `omen`

## 1. Estado general

### `GET /api/openclaw/health`

Sirve para validar que la API esta arriba y que el store compartido de MissionControl responde.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/health
```

### `GET /api/openclaw/snapshot`

Devuelve el snapshot completo de MissionControl: usuario, agentes, tareas, canales, mensajes, resumentes, voz y presencia.

Usalo cuando el agente necesite una foto global del sistema.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/snapshot
```

### `GET /api/openclaw/dashboard`

Devuelve el resumen de panel: stats, radar de bloqueos, sugerencias tacticas, stand-up y tareas agrupadas por carril.

Usalo para decidir prioridades sin bajar todo el snapshot.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/dashboard
```

## 2. Agentes

### `GET /api/openclaw/agents`

Lista todos los agentes con clase, nivel, voz y stats.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/agents
```

### `GET /api/openclaw/agents/:agentId`

Devuelve el perfil de un agente concreto.

Ejemplo con `jarvis`:

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/agents/jarvis
```

### `GET /api/openclaw/agents/:agentId/context`

Devuelve el contexto operativo de un agente:

- perfil;
- tareas asignadas;
- canales activos;
- mensajes recientes relacionados;
- presencia;
- summaries relacionados;
- policy flags.

Es la llamada principal para que un agente OpenClaw sepa que tiene pendiente.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  http://127.0.0.1:3000/api/openclaw/agents/jarvis/context
```

## 3. Tareas

### `GET /api/openclaw/tasks`

Lista todas las tareas del tablero.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/tasks
```

### `GET /api/openclaw/tasks/:taskId`

Devuelve el contexto completo de una tarea:

- tarea;
- agentes asignados;
- historial;
- XP relacionado.

Ejemplo:

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/tasks/task-voice-optin
```

### `POST /api/openclaw/tasks/:taskId/claim`

Asigna un agente adicional a la tarea.

Usalo cuando un agente quiera sumarse formalmente a un frente.

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: omen" \
  -H "Idempotency-Key: claim-task-voice-optin-001" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"omen"}' \
  http://127.0.0.1:3000/api/openclaw/tasks/task-voice-optin/claim
```

### `POST /api/openclaw/tasks/:taskId/transition`

Cambia el estado de una tarea.

Valores permitidos para `nextStatus`:

- `backlog`
- `in_progress`
- `review`
- `done`

Si la tarea requiere aprobacion y la mandas a `done`, MissionControl la deja en `review`.

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: forge" \
  -H "Idempotency-Key: transition-task-ops-map-001" \
  -H "Content-Type: application/json" \
  -d '{"nextStatus":"review"}' \
  http://127.0.0.1:3000/api/openclaw/tasks/task-ops-map/transition
```

### `POST /api/openclaw/tasks/:taskId/approve`

Aprueba el cierre final de una tarea y dispara:

- cambio a `done`;
- creacion de eventos XP;
- posible subida de nivel.

Usalo para tareas en review o para aprobacion final de supervisor.

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: serapha" \
  -H "Idempotency-Key: approve-task-supervisor-guard-001" \
  http://127.0.0.1:3000/api/openclaw/tasks/task-supervisor-guard/approve
```

## 4. Canales y mensajes

### `GET /api/openclaw/channels`

Lista todos los canales y cuantos mensajes tiene cada uno.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/channels
```

### `GET /api/openclaw/channels/:channelId/messages`

Devuelve los mensajes de un canal.

Puedes usar `?limit=20`.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  "http://127.0.0.1:3000/api/openclaw/channels/hq-command/messages?limit=20"
```

### `POST /api/openclaw/chat/post`

Publica un mensaje normal en un canal.

Campo opcional:

- `mentions`: lista de agentes mencionados.

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: post-hq-command-001" \
  -H "Content-Type: application/json" \
  -d '{
    "channelId":"hq-command",
    "content":"Jarvis reporta que la tarea paso a review.",
    "mentions":["serapha"]
  }' \
  http://127.0.0.1:3000/api/openclaw/chat/post
```

### `POST /api/openclaw/chat/mention`

Publica un mensaje dirigido a un agente y hace que MissionControl genere una respuesta del agente mencionado.

Usalo para cosas tipo:

- "Jarvis, como vamos?"
- "Alaria revisa riesgos"

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: mention-alaria-001" \
  -H "Content-Type: application/json" \
  -d '{
    "channelId":"hq-command",
    "content":"Alaria, revisa riesgos y dependencias del frente de voz.",
    "agentId":"alaria"
  }' \
  http://127.0.0.1:3000/api/openclaw/chat/mention
```

## 5. Coordinacion entre agentes

### `POST /api/openclaw/coordinate`

Inicia una coordinacion entre dos agentes y produce:

- thread;
- transcript;
- summary;
- mensaje de sistema en `meeting-summaries`.

Es la llamada para automatizar cosas como:

- "Jarvis habla con Alaria sobre lo pendiente"

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: omen" \
  -H "Idempotency-Key: coordinate-jarvis-alaria-001" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceChannelId":"hq-command",
    "initiatorId":"jarvis",
    "targetId":"alaria",
    "topic":"Revisar pendientes para el cierre de la entrega"
  }' \
  http://127.0.0.1:3000/api/openclaw/coordinate
```

## 6. Resumenes

### `GET /api/openclaw/summaries`

Lista todos los resumentes de reuniones.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/summaries
```

### `POST /api/openclaw/summaries`

Crea manualmente un resumen y lo publica en el canal correspondiente.

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: lutea" \
  -H "Idempotency-Key: summary-ops-001" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Cierre tactico de voz",
    "sourceChannelId":"meeting-summaries",
    "participants":["Jarvis","Serapha","Lutea"],
    "highlights":[
      "La tarea queda en review",
      "Falta aprobacion final",
      "La voz sigue bajo guardrails"
    ],
    "markdown":"## Tema\nCierre tactico de voz\n\n## Acuerdos\n- Pasar a review\n- Esperar aprobacion\n- Documentar guardrails"
  }' \
  http://127.0.0.1:3000/api/openclaw/summaries
```

### `GET /api/openclaw/summaries/:summaryId`

Devuelve el JSON completo de un resumen.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/summaries/sum-1
```

### `GET /api/openclaw/summaries/:summaryId/markdown`

Devuelve solo el markdown del resumen, ideal para exportar o mandarlo por DM.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/summaries/sum-1/markdown
```

## 7. Stand-up y supervision

### `GET /api/openclaw/standup`

Genera el stand-up automatico actual en markdown.

Usalo para publicar un resumen diario o para que un agente tome el pulso del sistema.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/standup
```

## 8. Presencia

### `GET /api/openclaw/presence`

Devuelve el estado de presencia de usuarios y agentes.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/presence
```

### `POST /api/openclaw/presence`

Actualiza presencia o typing de una entidad.

Valores de `mode`:

- `online`
- `focus`
- `away`
- `in_voice`

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: nyx" \
  -H "Idempotency-Key: presence-nyx-001" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId":"nyx",
    "mode":"focus",
    "typing":true,
    "channelId":"ops-war-room"
  }' \
  http://127.0.0.1:3000/api/openclaw/presence
```

## 9. Voz

### `POST /api/openclaw/voice/session`

Abre o cierra una sesion de voz.

Campos:

- `agentId`: opcional, voz del agente activo;
- `enabled`: opcional, si es `false` desactiva voz.

Abrir sesion:

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: voice-session-jarvis-001" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"jarvis","enabled":true}' \
  http://127.0.0.1:3000/api/openclaw/voice/session
```

Cerrar sesion:

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: voice-session-jarvis-off-001" \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}' \
  http://127.0.0.1:3000/api/openclaw/voice/session
```

### `POST /api/openclaw/voice/tts`

Convierte texto a audio usando la ruta TTS de MissionControl.

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "text":"MissionControl listo para la siguiente orden.",
    "voice":"alloy"
  }' \
  http://127.0.0.1:3000/api/openclaw/voice/tts --output respuesta.mp3
```

## Secuencias recomendadas

### Flujo: agente toma contexto y avanza tarea

1. `GET /api/openclaw/agents/:agentId/context`
2. `GET /api/openclaw/tasks/:taskId`
3. `POST /api/openclaw/tasks/:taskId/transition`
4. `POST /api/openclaw/chat/post`

### Flujo: coordinacion entre dos agentes

1. `POST /api/openclaw/coordinate`
2. `GET /api/openclaw/summaries`
3. `GET /api/openclaw/summaries/:summaryId/markdown`

### Flujo: supervisor o agente publica resumen

1. `GET /api/openclaw/standup`
2. `POST /api/openclaw/summaries`
3. `POST /api/openclaw/chat/post`

## Notas de operacion

- si falta `Authorization`, la API responde error;
- si falta `Idempotency-Key` en escritura, la API rechaza la llamada;
- los endpoints hoy operan sobre un store compartido en memoria del servidor;
- el contrato ya esta listo para que luego se conecte a Prisma sin cambiar las rutas.
