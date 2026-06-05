import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function getAppVersion() {
  const packagePath = resolve(__dirname, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf-8")) as { version?: string };

  return (
    process.env.VITE_APP_VERSION?.trim() ||
    process.env.APP_VERSION?.trim() ||
    packageJson.version ||
    "1.0.0"
  );
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
