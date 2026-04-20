import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 so the dev server is reachable from a phone browser (Termux) or LAN.
    host: true,
    port: Number(process.env.PORT) || 3000,
    strictPort: false,
  },
});
