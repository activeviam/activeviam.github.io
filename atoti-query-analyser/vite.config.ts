import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      library: path.resolve(__dirname, "./src/library"),
      components: path.resolve(__dirname, "./src/components"),
      hooks: path.resolve(__dirname, "./src/hooks"),
      samples: path.resolve(__dirname, "./src/samples"),
    },
  },
  build: {
    outDir: "build",
  },
});
