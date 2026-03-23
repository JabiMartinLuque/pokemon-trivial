import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_DEV_PROXY || "http://localhost:3001";
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/socket.io": {
          target,
          ws: true,
          changeOrigin: true,
        },
        "/api": { target, changeOrigin: true },
      },
    },
  };
});
