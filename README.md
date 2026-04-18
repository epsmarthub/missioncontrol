# MissionControl

MissionControl es una app web estilo SNES para supervision de trabajo, tablero de tareas, agentes RPG, resumenes de reuniones y voz opt-in.

## Stack recomendado para ti

- Next.js 16 + App Router
- Tailwind CSS 4
- Prisma + PostgreSQL local
- OpenAI para voz y automatizaciones futuras
- ZeroTier para acceso privado remoto

## Stack opcional

- Supabase Auth, solo si despues quieres login Google gestionado en la nube

## Arquitectura local sugerida

- `MissionControl` corre localmente en tu maquina o servidor interno
- `PostgreSQL` corre localmente
- `Prisma` conecta la app con PostgreSQL local
- `OpenAI` sigue siendo el unico servicio externo para IA y voz
- `ZeroTier` expone la app de forma privada a tus dispositivos y agentes dentro de tu red

Flujo simple:

- Navegador -> ZeroTier -> Next.js local
- Next.js -> Prisma -> PostgreSQL local
- Next.js -> OpenAI API

## Stack legado disponible

- Next.js 16 + App Router
- Tailwind CSS 4
- Prisma + PostgreSQL
- Supabase Auth / Realtime
- OpenAI para voz y automatizaciones futuras

## Arranque rapido

```bash
npm install
Copy-Item .env.example .env
npm run prisma:generate
npm run dev
```

Abre `http://localhost:3000`.

## Variables de entorno

- `DATABASE_URL`: PostgreSQL para Prisma
- `OPENAI_API_KEY`: agentes IA, voz y TTS
- `OPENAI_TEXT_MODEL`: por defecto `gpt-5-mini`
- `OPENAI_REALTIME_MODEL`: por defecto `gpt-realtime`
- `OPENAI_TTS_MODEL`: por defecto `gpt-4o-mini-tts`
- `OPENCLAW_API_KEY`: token Bearer para agentes OpenClaw. En desarrollo usa `missioncontrol-dev-key` por defecto si no lo defines.
- `MISSIONCONTROL_SEED_MODE`: controla la semilla inicial. Usa `base` para 1 usuario + 1 agente o `demo` para poblar toda la maqueta.

Variables opcionales si mantienes Supabase:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: cliente Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: operaciones backend con Supabase

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run prisma:generate
npm run db:push
npm run db:seed
npm run db:seed:base
npm run db:seed:demo
```

## Modo demo

Si faltan credenciales, la app sigue funcionando con datos seed en memoria/localStorage:

- tablero y progresion EXP
- roster de agentes
- resumenes markdown
- toggle de voz con token demo

## Modo local recomendado

Para tu caso, el camino recomendado es:

1. instalar PostgreSQL local;
2. apuntar `DATABASE_URL` a esa instancia local;
3. correr `npm run prisma:generate`;
4. correr `npm run db:push`;
5. correr `npm run db:seed` o `npm run db:seed:base`;
6. levantar la app con `npm run dev`;
7. entrar por `http://<ip-zerotier>:3000`.

En esta modalidad:

- Supabase no es obligatorio;
- la API OpenClaw sigue funcionando;
- ZeroTier hace de capa de acceso privado;
- OpenAI sigue siendo opcional si quieres modo demo o voz mas adelante.

## Actualizar una instalacion Linux existente

Si ya tienes MissionControl montado en Linux con los datos demo anteriores, despues de bajar estos cambios debes ejecutar:

```bash
npm install
npm run prisma:generate
npm run db:push
npm run db:seed
npm run build
sudo systemctl restart missioncontrol
```

Esto es importante porque:

- el esquema ahora persiste `tags` en tareas;
- el seed por defecto ahora crea una base minima de 1 usuario + 1 agente;
- si quieres la maqueta completa debes usar `npm run db:seed:demo`;
- la UI y la API OpenClaw ya leen desde PostgreSQL real, no desde el snapshot demo en memoria.

## Servidor Linux + OpenClaw

Si MissionControl va en el mismo servidor Linux donde ya corre OpenClaw, la forma recomendada es:

1. `MissionControl` escucha en el puerto `3000`
2. `PostgreSQL` corre local en el mismo servidor
3. `OpenClaw` consume la API usando `http://127.0.0.1:3000`
4. tus navegadores humanos entran por `http://<ip-zerotier-del-servidor>:3000`

Comandos tipicos en Linux:

```bash
npm install
npm run prisma:generate
npm run db:push
npm run db:seed
npm run build
npm run start
```

Si quieres dejarlo persistente como servicio del sistema, usa el template:

- [ops/systemd/missioncontrol.service.example](/G:/Proyectos%20Reat/MissionControl/ops/systemd/missioncontrol.service.example)

## Endpoints incluidos

- `GET /api/standup`
- `POST /api/voice/session`
- `POST /api/voice/tts`
- `POST /api/tasks/:taskId/transition`
- `POST /api/tasks/:taskId/approve`
- `GET /auth/login`
- `GET /auth/callback`
- `POST /auth/logout`

## API OpenClaw

Namespace completo para agentes externos:

- `GET /api/openclaw/health`
- `GET /api/openclaw/snapshot`
- `GET /api/openclaw/dashboard`
- `GET /api/openclaw/agents`
- `GET /api/openclaw/agents/:agentId`
- `GET /api/openclaw/agents/:agentId/context`
- `GET /api/openclaw/tasks`
- `GET /api/openclaw/tasks/:taskId`
- `POST /api/openclaw/tasks/:taskId/claim`
- `POST /api/openclaw/tasks/:taskId/transition`
- `POST /api/openclaw/tasks/:taskId/approve`
- `GET /api/openclaw/summaries`
- `POST /api/openclaw/summaries`
- `GET /api/openclaw/summaries/:summaryId`
- `GET /api/openclaw/summaries/:summaryId/markdown`
- `GET /api/openclaw/standup`
- `GET /api/openclaw/presence`
- `POST /api/openclaw/presence`
- `POST /api/openclaw/voice/session`
- `POST /api/openclaw/voice/tts`

Headers requeridos:

- `Authorization: Bearer <OPENCLAW_API_KEY>`
- `X-OpenClaw-Agent-Id: <agentId>` para acciones de agente
- `Idempotency-Key: <uuid>` para escrituras
