import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      "/api": "https://careersgithubio-production.up.railway.app",
        // "/api": "http://localhost:3001",
    },
  },
});
