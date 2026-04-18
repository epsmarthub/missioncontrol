import { createServer } from "node:http";
import next from "next";
import { parse } from "node:url";
import { WebSocketServer } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

function getRealtimeState() {
  if (!globalThis.__MISSIONCONTROL_REALTIME__) {
    globalThis.__MISSIONCONTROL_REALTIME__ = {
      clients: new Set(),
    };
  }

  return globalThis.__MISSIONCONTROL_REALTIME__;
}

async function main() {
  const server = createServer();
  const app = next({ dev, hostname, port, httpServer: server });
  const wss = new WebSocketServer({ noServer: true });

  await app.prepare();

  const handle = app.getRequestHandler();
  const handleUpgrade = app.getUpgradeHandler();

  wss.on("connection", (socket) => {
    const state = getRealtimeState();
    state.clients.add(socket);

    try {
      socket.send(
        JSON.stringify({
          type: "connection.ready",
          at: new Date().toISOString(),
        }),
      );
    } catch {
      state.clients.delete(socket);
    }

    socket.on("close", () => {
      state.clients.delete(socket);
    });

    socket.on("error", () => {
      state.clients.delete(socket);
      try {
        socket.close();
      } catch {
        // noop
      }
    });
  });

  server.on("request", (req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    void handle(req, res, parsedUrl);
  });

  server.on("upgrade", (request, socket, head) => {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || hostname}`);

    if (requestUrl.pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
      return;
    }

    void handleUpgrade(request, socket, head).catch(() => {
      socket.destroy();
    });
  });

  server.listen(port, hostname, () => {
    console.log(
      `> MissionControl listening at http://${hostname}:${port} as ${
        dev ? "development" : process.env.NODE_ENV
      }`,
    );
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
