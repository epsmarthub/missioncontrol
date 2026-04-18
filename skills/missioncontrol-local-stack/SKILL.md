---
name: missioncontrol-local-stack
description: Use when deploying or operating MissionControl fully local with Next.js, Prisma, PostgreSQL, OpenAI, and ZeroTier, without depending on Supabase as a required cloud service.
---

# MissionControl Local Stack

## Usar esta skill cuando

- quieras correr MissionControl completamente local;
- uses ZeroTier para entrar a la pagina;
- necesites una arquitectura privada sin hosting publico;
- quieras dejar Supabase como opcional o retirarlo del camino critico.

## Arquitectura recomendada

MissionControl local debe quedar asi:

1. `Next.js` corriendo en tu PC o servidor interno.
2. `PostgreSQL` local como base de datos.
3. `Prisma` como capa de acceso a datos.
4. `OpenAI` solo para IA y voz.
5. `ZeroTier` para acceso remoto privado.

## Que queda local y que no

Local:

- frontend web;
- API de MissionControl;
- base de datos PostgreSQL;
- estado persistente del negocio;
- acceso de OpenClaw a la app.

Externo:

- `OpenAI`, solo si usas menciones IA, coordinacion automatica o TTS.

## Porque esta arquitectura encaja bien

- no dependes de hosting en la nube;
- tus datos de tareas, chat y agentes quedan en tu red;
- ZeroTier evita exponer puertos publicos;
- OpenClaw puede consumir la API por IP privada de ZeroTier;
- Prisma sigue funcionando perfecto sobre PostgreSQL local.

## Variables minimas para modo local

Requeridas:

- `DATABASE_URL`
- `OPENCLAW_API_KEY`

Opcionales:

- `OPENAI_API_KEY`
- `OPENAI_TEXT_MODEL`
- `OPENAI_REALTIME_MODEL`
- `OPENAI_TTS_MODEL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Ejemplo de `.env`

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/missioncontrol"
OPENCLAW_API_KEY="missioncontrol-dev-key"

OPENAI_API_KEY="sk-..."
OPENAI_TEXT_MODEL="gpt-5-mini"
OPENAI_REALTIME_MODEL="gpt-realtime"
OPENAI_TTS_MODEL="gpt-4o-mini-tts"
```

## Flujo de arranque local

```bash
npm install
Copy-Item .env.example .env
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
```

## Despliegue en servidor Linux junto a OpenClaw

Este es el escenario ideal si OpenClaw ya vive alli.

Orden recomendado:

1. instalar `Node.js 20+`;
2. instalar `PostgreSQL`;
3. clonar MissionControl en una ruta fija;
4. crear `.env` local;
5. correr `npm install`;
6. correr `npm run prisma:generate`;
7. correr `npm run db:push`;
8. correr `npm run db:seed`;
9. correr `npm run build`;
10. levantar con `npm run start` o con `systemd`.

## Comandos Linux sugeridos

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Dentro del proyecto:

```bash
npm install
npm run prisma:generate
npm run db:push
npm run db:seed
npm run build
npm run start
```

## Acceso por ZeroTier

Asume que el host de MissionControl ya esta unido a tu red ZeroTier.

Luego:

1. identifica la IP ZeroTier de la maquina;
2. abre MissionControl en `http://<ip-zerotier>:3000`;
3. apunta tus agentes OpenClaw a esa misma base URL;
4. protege la API con `OPENCLAW_API_KEY`.

Si MissionControl y OpenClaw comparten el mismo servidor Linux, lo mas simple es:

- UI humana: `http://<ip-zerotier-del-servidor>:3000`
- OpenClaw local al servidor: `http://127.0.0.1:3000`

Con eso OpenClaw evita salir por red para llamar la API.

## Estrategia de autenticacion local

Si MissionControl vive detras de ZeroTier, puedes usar este orden de prioridad:

1. `ZeroTier` como perimetro principal de acceso;
2. `OPENCLAW_API_KEY` para agentes;
3. auth local simple o bypass controlado para operadores humanos;
4. dejar `Supabase Auth` solo como opcion futura, no como requisito.

## Lo que debes tratar como opcional

- `Supabase Auth`
- `Supabase Realtime`
- login Google
- cualquier dependencia de nube que no sea OpenAI

## Lo que si debes conservar

- `Prisma`
- `PostgreSQL`
- API `/api/openclaw/*`
- logica de XP, tareas, coordinacion y summaries en servidor

## Plan para quitar dependencia de Supabase

1. mantener `lib/env.ts` con Supabase como opcional;
2. evitar que rutas core fallen si no existe Supabase;
3. mover auth humana a un modo local simple o al perimetro ZeroTier;
4. mover presencia realtime a polling o WebSocket propio si luego hace falta;
5. conservar Prisma y PostgreSQL como fuente de verdad.

## Operacion diaria recomendada

- usar `npm run dev` o `npm run start` en la maquina host;
- correr PostgreSQL como servicio local;
- hacer backups de PostgreSQL;
- consumir MissionControl desde navegadores unidos a ZeroTier;
- consumir la API OpenClaw desde agentes dentro de la misma red ZeroTier.

En servidor Linux, prefiere:

- `npm run build`
- `npm run start`
- `systemd` para mantener el proceso vivo

Template disponible en:

- `ops/systemd/missioncontrol.service.example`

## Resultado esperado

Cuando esta skill se aplica bien, MissionControl queda como una app privada de red interna:

- UI local
- API local
- BD local
- acceso remoto privado por ZeroTier
- OpenClaw integrado sin exponer la plataforma a Internet
