import { spawn, spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const cwd = process.cwd();
const env = { ...process.env };

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`No se pudo ejecutar ${command}:`, result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function hasBaseUser() {
  const prisma = new PrismaClient();

  try {
    return (await prisma.user.count()) > 0;
  } finally {
    await prisma.$disconnect();
  }
}

run("./node_modules/.bin/prisma", ["db", "push", "--accept-data-loss", "--skip-generate"]);

if (!(await hasBaseUser())) {
  console.log("No existe usuario base; ejecutando seed inicial.");
  run("./node_modules/.bin/tsx", ["prisma/seed.ts"]);
}

const server = spawn("node", ["server.mjs"], {
  cwd,
  env,
  stdio: "inherit",
});

server.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
