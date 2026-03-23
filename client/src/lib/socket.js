import { io } from "socket.io-client";

/**
 * Desarrollo: usa `client/.env.development` → VITE_SOCKET_URL=http://localhost:3001
 * (conexión directa; el proxy WS de Vite a veces provoca ECONNABORTED).
 * Producción: mismo origen → URL vacía.
 */
export function createSocket() {
  const url = import.meta.env.VITE_SOCKET_URL || undefined;
  return io(url, {
    path: "/socket.io",
    transports: ["polling", "websocket"],
    autoConnect: true,
  });
}
