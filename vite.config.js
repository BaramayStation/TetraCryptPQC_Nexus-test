import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  build: {
    target: "esnext",
    outDir: "dist",
    sourcemap: false, // Disable source maps to reduce build size
    minify: "terser", // More memory-efficient minification
    chunkSizeWarningLimit: 2000, // Increase threshold for chunk warnings
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor"; // Reduce large chunks
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },
});
