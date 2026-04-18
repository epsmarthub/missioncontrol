---
name: missioncontrol-openclaw-api
description: Use when an OpenClaw agent needs to call the current MissionControl API for adventurers, missions, summaries, presence, voice, dashboard, and snapshot. This version no longer includes chat, channels, coordination, or webhook flows.
---

# MissionControl OpenClaw API

Nota de vocabulario:

- en la UI de MissionControl, `agentes` ahora se muestran como `aventureros`;
- en la UI de MissionControl, `tareas` ahora se muestran como `misiones`;
- los nombres tecnicos de la API no cambian: los endpoints siguen usando `agents` y `tasks`.

## Usar esta skill cuando

- un agente OpenClaw necesite leer o escribir en MissionControl;
- quieras saber que hace cada endpoint vigente del namespace `/api/openclaw/*`;
- necesites ejemplos listos de request por cada llamada.

## Importante: cambios de esta version

MissionControl ya no incluye:

- chat interno;
- canales y mensajes para aventureros;
- coordinacion entre aventureros via MissionControl;
- webhook de menciones.

Por tanto, esta skill ya no usa ni documenta:

- `GET /api/openclaw/channels`
- `GET /api/openclaw/channels/:channelId/messages`
- `POST /api/openclaw/chat/post`
- `POST /api/openclaw/chat/mention`
- `POST /api/openclaw/coordinate`

## Base URL

Asume:

`http://127.0.0.1:3000`

## Headers comunes

Todos los endpoints de OpenClaw requieren:

`Authorization: Bearer <OPENCLAW_API_KEY>`

Para llamadas hechas por un agente en particular, envia tambien:

`X-OpenClaw-Agent-Id: <agentId>`

Para cualquier escritura, envia tambien:

`Idempotency-Key: <uuid-unico>`

Ejemplo base:

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  http://127.0.0.1:3000/api/openclaw/health
```

## Aventureros disponibles por defecto

En seed `base`:

- `jarvis`

En seed `demo`:

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

Sirve para validar que la API esta arriba y que MissionControl responde.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/health
```

### `GET /api/openclaw/snapshot`

Devuelve el snapshot completo de MissionControl: usuario, aventureros, misiones, summaries, voz y presencia.

Usalo cuando el agente necesite una foto global del sistema.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/snapshot
```

### `GET /api/openclaw/dashboard`

Devuelve el resumen de panel: stats, radar de bloqueos, sugerencias tacticas y stand-up.

Usalo para decidir prioridades sin bajar todo el snapshot.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/dashboard
```

## 2. Aventureros

### `GET /api/openclaw/agents`

Lista todos los aventureros con clase, nivel, voz y stats.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/agents
```

### `GET /api/openclaw/agents/:agentId`

Devuelve el perfil de un aventurero concreto.

Ejemplo con `jarvis`:

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/agents/jarvis
```

### `GET /api/openclaw/agents/:agentId/context`

Devuelve el contexto operativo de un aventurero:

- perfil;
- misiones asignadas;
- presencia;
- summaries relacionados;
- policy flags.

Es la llamada principal para que un aventurero OpenClaw sepa que tiene pendiente.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  http://127.0.0.1:3000/api/openclaw/agents/jarvis/context
```

### `POST /api/openclaw/agents`

Crea un nuevo aventurero.

Campos recomendados:

- `name`
- `handle`
- `classId`

Campos opcionales:

- `title`
- `level`
- `specialty`
- `voice`
- `quote`
- `avatarSeed`
- `stats`

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "Idempotency-Key: create-agent-alaric-001" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Alaric",
    "handle":"@alaric",
    "classId":"paladin",
    "title":"Paladin de Guardia",
    "specialty":"Aprobaciones y calidad",
    "voice":"alloy"
  }' \
  http://127.0.0.1:3000/api/openclaw/agents
```

### `PATCH /api/openclaw/agents/:agentId`

Actualiza un aventurero existente.

```bash
curl -X PATCH \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "Idempotency-Key: update-agent-jarvis-001" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Arquitecto de Automatizaciones",
    "specialty":"Planeacion, tooling y supervisión de tareas"
  }' \
  http://127.0.0.1:3000/api/openclaw/agents/jarvis
```

### `DELETE /api/openclaw/agents/:agentId`

Elimina un aventurero. MissionControl protege el ultimo aventurero operativo.

```bash
curl -X DELETE \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "Idempotency-Key: delete-agent-alaric-001" \
  http://127.0.0.1:3000/api/openclaw/agents/alaric
```

## 3. Misiones

### `GET /api/openclaw/tasks`

Lista todas las misiones del tablero.

Por defecto no devuelve misiones `closed`.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/tasks
```

Consultar misiones cerradas:

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  "http://127.0.0.1:3000/api/openclaw/tasks?status=closed"
```

Consultar todas incluyendo cerradas:

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  "http://127.0.0.1:3000/api/openclaw/tasks?includeClosed=true"
```

### `POST /api/openclaw/tasks`

Crea una mision nueva.

Campos requeridos:

- `title`
- `description`

Campos opcionales:

- `priority`
- `difficulty`
- `requiresApproval`
- `assignedAgentIds`
- `tags`
- `dueAt`
- `blockedReason`

Si no envias `difficulty`, MissionControl usa `priority` como dificultad.

XP por dificultad:

- `low` = `40`
- `medium` = `80`
- `high` = `140`
- `critical` = `220`

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: create-task-001" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Preparar tablero semanal",
    "description":"Crear el lote inicial de misiones operativas de la semana.",
    "priority":"high",
    "difficulty":"critical",
    "requiresApproval":true,
    "assignedAgentIds":["jarvis"],
    "tags":["ops","weekly"]
  }' \
  http://127.0.0.1:3000/api/openclaw/tasks
```

### `GET /api/openclaw/tasks/:taskId`

Devuelve el contexto completo de una mision:

- mision;
- aventureros asignados;
- historial;
- XP relacionado.

Ejemplo:

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/tasks/task-voice-optin
```

### `POST /api/openclaw/tasks/:taskId/claim`

Asigna un aventurero adicional a la mision.

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: claim-task-voice-optin-001" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"jarvis"}' \
  http://127.0.0.1:3000/api/openclaw/tasks/task-voice-optin/claim
```

### `POST /api/openclaw/tasks/:taskId/transition`

Cambia el estado de una mision.

Valores permitidos para `nextStatus`:

- `backlog`
- `in_progress`
- `review`
- `done`
- `closed`

Si la mision requiere aprobacion y la mandas a `done`, MissionControl la deja en `review`.
Una mision solo puede pasar a `closed` si ya esta en `done`.

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: transition-task-ops-map-001" \
  -H "Content-Type: application/json" \
  -d '{"nextStatus":"review"}' \
  http://127.0.0.1:3000/api/openclaw/tasks/task-ops-map/transition
```

### `POST /api/openclaw/tasks/:taskId/approve`

Aprueba el cierre final de una mision y dispara:

- cambio a `done`;
- creacion de eventos XP;
- posible subida de nivel.

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: approve-task-supervisor-guard-001" \
  http://127.0.0.1:3000/api/openclaw/tasks/task-supervisor-guard/approve
```

## 4. Resumenes

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
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: summary-ops-001" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Cierre tactico de voz",
    "sourceChannelId":"meeting-summaries",
    "participants":["Jarvis","Comandante Vega"],
    "highlights":[
      "La tarea queda en review",
      "Falta aprobacion final"
    ],
    "markdown":"## Tema\nCierre tactico de voz\n\n## Acuerdos\n- Pasar a review\n- Esperar aprobacion"
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

Devuelve solo el markdown del resumen, ideal para exportar o mandarlo a otro canal externo.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/summaries/sum-1/markdown
```

## 5. Stand-up y supervision

### `GET /api/openclaw/standup`

Genera el stand-up automatico actual en markdown.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/standup
```

## 6. Presencia

### `GET /api/openclaw/presence`

Devuelve el estado de presencia de usuarios y aventureros.

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  http://127.0.0.1:3000/api/openclaw/presence
```

### `POST /api/openclaw/presence`

Actualiza presencia de una entidad.

Valores de `mode`:

- `online`
- `focus`
- `away`
- `in_voice`

```bash
curl -X POST \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: presence-jarvis-001" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId":"jarvis",
    "mode":"focus",
    "typing":false,
    "channelId":"hq-command"
  }' \
  http://127.0.0.1:3000/api/openclaw/presence
```

## 7. Voz

### `POST /api/openclaw/voice/session`

Abre o cierra una sesion de voz.

Campos:

- `agentId`: opcional, voz del agente activo;
- `channelId`: opcional;
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

### Flujo: aventurero toma contexto y avanza mision

1. `GET /api/openclaw/agents/:agentId/context`
2. `GET /api/openclaw/tasks/:taskId`
3. `POST /api/openclaw/tasks/:taskId/transition`

### Flujo: crear y cerrar misiones

1. `POST /api/openclaw/tasks`
2. `POST /api/openclaw/tasks/:taskId/transition`
3. `POST /api/openclaw/tasks/:taskId/approve` si requiere aprobacion
4. `POST /api/openclaw/tasks/:taskId/transition` con `closed`

### Flujo: supervisor o agente publica resumen

1. `GET /api/openclaw/standup`
2. `POST /api/openclaw/summaries`

### Flujo: gestionar roster de aventureros

1. `GET /api/openclaw/agents`
2. `POST /api/openclaw/agents`
3. `PATCH /api/openclaw/agents/:agentId`
4. `DELETE /api/openclaw/agents/:agentId`

## Notas de operacion

- si falta `Authorization`, la API responde error;
- si falta `Idempotency-Key` en escritura, la API rechaza la llamada;
- la API ya no ofrece chat ni coordinacion interna;
- las misiones `closed` no salen en el tablero ni en el snapshot normal;
- para ver misiones cerradas usa `GET /api/openclaw/tasks?status=closed`;
- para conversaciones con aventureros usa tu canal externo, por ejemplo Telegram;
- MissionControl queda como centro de control operativo: misiones, aventureros, resumenes, presencia y voz.
