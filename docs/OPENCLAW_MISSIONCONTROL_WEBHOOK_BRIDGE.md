# OpenClaw -> MissionControl Webhook Bridge

## Objetivo

Implementar del lado de OpenClaw un endpoint webhook que reciba eventos emitidos por MissionControl y los convierta en acciones reales de agentes dentro de OpenClaw.

La primera meta es soportar este flujo:

1. Un usuario menciona a un agente en MissionControl.
2. MissionControl envia un webhook a OpenClaw.
3. OpenClaw valida, deduplica y procesa el evento.
4. OpenClaw ejecuta al agente real correspondiente.
5. OpenClaw publica la respuesta de vuelta en MissionControl usando la API `/api/openclaw/*`.

## Estado actual de MissionControl

MissionControl ya tiene:

- API para OpenClaw en `/api/openclaw/*`
- autenticacion Bearer por `OPENCLAW_API_KEY`
- soporte de `Idempotency-Key` en escrituras
- WebSocket para actualizar la UI humana en tiempo real

MissionControl ya puede actuar como emisor del webhook saliente para `agent.mentioned`.
Si OpenClaw responde `200 accepted`, MissionControl deja la respuesta real en manos de OpenClaw.
Si OpenClaw falla o no esta configurado, MissionControl ahora devuelve error y no genera una respuesta simulada.

## Resultado esperado del lado OpenClaw

OpenClaw debe exponer un endpoint HTTP para recibir eventos de MissionControl, por ejemplo:

`POST /webhooks/missioncontrol`

Ese endpoint debe:

- validar autenticacion
- validar schema del payload
- deduplicar por `Idempotency-Key` y `eventId`
- decidir que agente ejecutar
- publicar la respuesta o resultado en MissionControl

## Recomendacion de implementacion

Usar la infraestructura nativa de OpenClaw:

- `openclaw webhooks *`
- `openclaw hooks *`
- `registerHttpRoute(...)`

No usar `registerHttpHandler(...)` porque ya fue removido.

La opcion recomendada es:

1. exponer un endpoint HTTP con `registerHttpRoute(...)`
2. usar hooks internos o agent deliveries para orquestar la ejecucion del agente
3. hacer callback a MissionControl via API REST

## Configuracion recomendada

Variables sugeridas del lado OpenClaw:

```env
MISSIONCONTROL_WEBHOOK_SECRET="super-secret-shared"
MISSIONCONTROL_API_BASE_URL="http://127.0.0.1:3000"
MISSIONCONTROL_API_KEY="missioncontrol-dev-key"
MISSIONCONTROL_WEBHOOK_PATH="/webhooks/missioncontrol"
MISSIONCONTROL_WEBHOOK_TIMEOUT_MS="5000"
```

Si OpenClaw y MissionControl viven en el mismo servidor Linux, usar loopback:

- MissionControl: `http://127.0.0.1:3000`
- Webhook OpenClaw: `http://127.0.0.1:<puerto-openclaw>/webhooks/missioncontrol`

## Contrato inicial del webhook

### Request

Metodo:

`POST /webhooks/missioncontrol`

Headers esperados:

```http
Authorization: Bearer <MISSIONCONTROL_WEBHOOK_SECRET>
Content-Type: application/json
Idempotency-Key: mention-msg-123-jarvis
X-MissionControl-Event: agent.mentioned
```

Payload inicial esperado por el webhook nativo:

```json
{
  "action": "run_task",
  "input": {
    "kind": "missioncontrol.agent_mentioned",
    "eventId": "mention-msg-123-jarvis",
    "timestamp": "2026-04-18T15:00:00.000Z",
    "channelId": "hq-command",
    "messageId": "msg-123",
    "content": "Jarvis, como va la sala de voz?",
    "agent": {
      "id": "jarvis",
      "name": "Jarvis"
    },
    "author": {
      "id": "user-vega",
      "name": "Comandante Vega",
      "type": "user"
    },
    "source": {
      "app": "missioncontrol",
      "event": "agent.mentioned"
    }
  }
}
```

### Response

OpenClaw deberia responder rapido al webhook. Recomendado:

```json
{
  "ok": true,
  "accepted": true,
  "eventId": "mention-msg-123-jarvis"
}
```

No bloquear el webhook esperando toda la ejecucion del agente. Mejor:

1. aceptar el evento
2. encolar o despachar trabajo interno
3. responder `200`
4. luego publicar el resultado a MissionControl

## Eventos iniciales a soportar

Implementar primero solo uno:

- `agent.mentioned`

Despues, cuando el flujo base ya funcione:

- `agents.coordinate.requested`
- `task.approved`
- `summary.created`

## Logica interna sugerida en OpenClaw

### Paso 1: validar autenticacion

Validar:

- header `Authorization`
- `Idempotency-Key`
- `X-MissionControl-Event`

Si falla, devolver `401`, `403` o `400`.

### Paso 2: dedupe

Guardar `eventId` o `Idempotency-Key` en storage local.

Si el mismo evento ya fue procesado:

- devolver `200`
- marcar `accepted: true`
- no volver a ejecutar el agente

### Paso 3: resolver el agente

Mapear `agent.id` de MissionControl a la identidad real del agente en OpenClaw.

Ejemplo:

- `jarvis` -> agente OpenClaw Jarvis
- `alaria` -> agente OpenClaw Alaria

Si no existe el agente:

- opcionalmente publicar mensaje de error en MissionControl
- o registrar el fallo internamente

### Paso 4: construir contexto

Contexto minimo recomendado:

- `event`
- `channelId`
- `messageId`
- `author`
- `content`
- `agent`

Opcionalmente, OpenClaw puede complementar contexto preguntandole a MissionControl:

- `GET /api/openclaw/agents/:agentId/context`
- `GET /api/openclaw/channels/:channelId/messages`

Esto ayuda a que el agente responda con memoria de canal y tareas pendientes.

### Paso 5: ejecutar al agente real

Usar el mecanismo normal de OpenClaw:

- hook interno
- agent delivery
- dispatch al runtime del agente

El objetivo es que la respuesta venga del agente real, no de una plantilla fija.

## Decision tecnica importante

Si el gateway HTTP visible de OpenClaw no expone rutas como:

- `/sessions/spawn`
- `/sessions/send`

entonces no conviene seguir adivinando endpoints internos del gateway.

La recomendacion correcta es esta:

### Opcion recomendada

Ejecutar al agente real desde el bridge usando un mecanismo estable del lado OpenClaw, por ejemplo:

- `openclaw agent`
- `sessions_spawn` o `sessions_send` desde SDK interno si el bridge corre dentro del mismo runtime y tiene acceso directo

### Opcion no recomendada

No seguir intentando descubrir endpoints HTTP privados del gateway para lanzar agentes.

Si el gateway no publica esa ruta, asumir que:

- no es parte del contrato estable
- o no esta disponible en ese despliegue

## Diagnostico del cuello de botella

Si el estado actual es:

- MissionControl -> webhook bridge: OK
- auth/schema/dedupe: OK
- callback a MissionControl: OK o parcialmente OK
- ejecucion real de agente OpenClaw: pendiente

entonces el problema ya no es red ni webhook.

Es un problema de integracion del runtime real del agente.

## Estrategia recomendada para cerrar el runtime

### Ruta A: usar `openclaw agent`

Si OpenClaw ya trae CLI funcional para ejecutar agentes, esta suele ser la opcion mas robusta en un bridge Node separado.

El bridge:

1. recibe el webhook
2. valida auth y dedupe
3. obtiene contexto desde MissionControl
4. ejecuta `openclaw agent <agentId> ...`
5. captura stdout o resultado estructurado
6. publica la respuesta en MissionControl

Ventajas:

- no depende de rutas privadas del gateway
- no depende de endpoints HTTP no documentados
- funciona bien cuando el bridge esta fuera del core runtime pero corre en el mismo host

### Ruta B: usar `sessions_spawn` / `sessions_send` por acceso interno

Solo tomar esta ruta si el bridge:

- corre dentro del runtime/plugin correcto de OpenClaw
- y ya tiene acceso real a la API interna estable del SDK

En ese caso:

- usar la llamada interna real
- no envolverla en un invento HTTP externo

Ventajas:

- integracion mas nativa
- mejor control de sesiones

Desventaja:

- depende de estar en el contexto correcto del runtime

## Recomendacion final para tu agente

Con el estado actual, la mejor decision es:

1. dejar el webhook y el callback a MissionControl como ya estan
2. dejar de depender de rutas HTTP adivinadas como `/sessions/spawn`
3. cerrar la ejecucion del agente real por una de estas dos vias:
   - `openclaw agent` si el bridge es externo
   - `sessions_spawn` o `sessions_send` si el bridge tiene acceso interno real al SDK

Si hay duda, elegir `openclaw agent` primero.

## Secuencia operativa recomendada

1. Webhook entra al bridge
2. Validar auth
3. Validar schema
4. Revisar dedupe
5. Consultar contexto en MissionControl
6. Marcar presence typing=true
7. Ejecutar el agente real con `openclaw agent` o runtime interno
8. Publicar respuesta con `/api/openclaw/chat/post`
9. Marcar presence typing=false

## Señales de que ya esta bien resuelto

- el bridge deja de devolver `webhook-http-404`
- no se usan rutas inventadas del gateway
- el agente responde de forma real en MissionControl
- el bridge funciona igual aunque cambie el puerto del gateway HTTP

### Paso 6: publicar la respuesta en MissionControl

Cuando OpenClaw tenga la respuesta final, debe hacer callback a:

`POST /api/openclaw/chat/post`

Headers:

```http
Authorization: Bearer <MISSIONCONTROL_API_KEY>
X-OpenClaw-Agent-Id: jarvis
Idempotency-Key: reply-msg-123-jarvis
Content-Type: application/json
```

Body recomendado:

```json
{
  "channelId": "hq-command",
  "content": "La sala de voz ya esta operativa y el canal quedo preparado para pruebas.",
  "mentions": []
}
```

## Flujo completo recomendado

### Caso 1: mencion a agente

1. MissionControl guarda el mensaje del usuario.
2. MissionControl envia webhook `agent.mentioned`.
3. OpenClaw valida y deduplica.
4. OpenClaw ejecuta el agente real.
5. OpenClaw responde con `POST /api/openclaw/chat/post`.
6. MissionControl emite invalidacion por WebSocket.
7. La UI muestra la respuesta del agente en vivo.

## Endpoints MissionControl utiles para OpenClaw

### Obtener contexto del agente

`GET /api/openclaw/agents/:agentId/context`

Uso:

- tareas asignadas
- presencia
- mensajes recientes
- summaries

### Obtener mensajes del canal

`GET /api/openclaw/channels/:channelId/messages`

Uso:

- leer contexto reciente antes de responder

### Publicar mensaje del agente

`POST /api/openclaw/chat/post`

Uso:

- publicar respuesta final del agente en el canal

### Publicar presencia

`POST /api/openclaw/presence`

Uso sugerido:

- marcar `typing: true` mientras el agente esta pensando
- luego `typing: false`

## Ejemplos operativos

### 1. Leer contexto antes de responder

```bash
curl -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  http://127.0.0.1:3000/api/openclaw/agents/jarvis/context
```

### 2. Marcar al agente como escribiendo

```bash
curl -X POST http://127.0.0.1:3000/api/openclaw/presence \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: typing-jarvis-msg-123" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "jarvis",
    "mode": "focus",
    "typing": true,
    "channelId": "hq-command"
  }'
```

### 3. Publicar respuesta del agente

```bash
curl -X POST http://127.0.0.1:3000/api/openclaw/chat/post \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: reply-msg-123-jarvis" \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "hq-command",
    "content": "Ya revise la configuracion de voz y el canal esta listo para pruebas.",
    "mentions": []
  }'
```

### 4. Apagar el estado escribiendo

```bash
curl -X POST http://127.0.0.1:3000/api/openclaw/presence \
  -H "Authorization: Bearer missioncontrol-dev-key" \
  -H "X-OpenClaw-Agent-Id: jarvis" \
  -H "Idempotency-Key: typing-off-jarvis-msg-123" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "jarvis",
    "mode": "focus",
    "typing": false,
    "channelId": "hq-command"
  }'
```

## Reglas importantes

- no procesar dos veces el mismo `eventId`
- no bloquear el webhook esperando ejecucion larga
- siempre responder `200` si el evento ya fue visto
- publicar errores significativos en logs
- usar `Idempotency-Key` cuando OpenClaw escriba en MissionControl

## Criterio de exito

Se considera completo cuando:

1. OpenClaw recibe `agent.mentioned`
2. valida auth y dedupe
3. resuelve el agente real
4. obtiene contexto si hace falta
5. publica respuesta en MissionControl
6. la UI web de MissionControl muestra esa respuesta en tiempo real

## Checklist para el agente de OpenClaw

- Crear o confirmar endpoint `POST /webhooks/missioncontrol`
- Validar `Authorization`
- Validar `Idempotency-Key`
- Validar schema del payload
- Persistir dedupe por `eventId`
- Mapear `agent.id` a runtime real
- Consultar contexto en MissionControl si es necesario
- Ejecutar el agente real
- Publicar `typing: true`
- Publicar respuesta con `/api/openclaw/chat/post`
- Publicar `typing: false`
- Registrar logs y errores

## Lo que falta del lado MissionControl

Cuando OpenClaw termine esta parte, el siguiente trabajo en MissionControl sera:

1. agregar variables `OPENCLAW_WEBHOOK_URL` y `OPENCLAW_WEBHOOK_SECRET`
2. implementar cliente saliente de webhook
3. emitir `agent.mentioned`
4. opcionalmente dejar fallback local si OpenClaw no responde

Ese bloque se implementara despues, una vez OpenClaw confirme que su webhook ya esta listo.
