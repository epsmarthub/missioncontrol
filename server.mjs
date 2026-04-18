import { createServer } from "node:http";
import next from "next";
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
  const handle = app.getRequestHandler();
  const wss = new WebSocketServer({ noServer: true });

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
    void handle(req, res);
  });

  await app.prepare();
  const handleUpgrade = app.getUpgradeHandler();

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
