import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig(() => {
  return {
    server: {
      host: "0.0.0.0", // Allows external access (securely)
      port: 8080,
      strictPort: true, // Ensures no fallback ports
    },
    plugins: [
      react(), // Optimized React rendering with SWC
      topLevelAwait(), // Enables top-level await support
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"), // Shorter import paths
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext", // Future-proof JS support
        supported: {
          bigint: true, // Enables BigInt support for cryptographic ops
        },
      },
    },
    build: {
      target: "esnext",
      outDir: "dist",
      sourcemap: true,
      minify: "terser", // Secure & efficient minification
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"], // Splits vendor dependencies
          },
        },
      },
      chunkSizeWarningLimit: 1500, // Prevents warnings for large crypto modules
    },
    define: {
      global: "globalThis", // Ensures compatibility across JS environments
      "process.env": {}, // Prevents environment variable leakage
    },
  };
});
