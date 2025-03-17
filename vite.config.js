import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig(({ mode }) => {
  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true
    },
    plugins: [react(), topLevelAwait()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext",
        supported: {
          bigint: true
        },
      },
    },
    build: {
      target: "esnext",
      outDir: "dist",
      sourcemap: true,
      minify: "terser",
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },
    define: {
      global: "globalThis",
      "process.env": {}
    },
  };
});