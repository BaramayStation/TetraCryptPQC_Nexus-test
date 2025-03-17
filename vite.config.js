import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import wasm from "vite-plugin-wasm"; // ✅ Ensures WASM support
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig(({ mode }) => {
  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      https: true, // ✅ Forces TLS encryption (local dev security)
    },
    plugins: [
      react(),
      wasm(), // ✅ Ensure WebAssembly works
      topLevelAwait(), // ✅ Async WASM support
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      exclude: ["@syntect/wasm"], // ✅ Prevents WASM incompatibility issues
      esbuildOptions: {
        target: "esnext",
        supported: {
          bigint: true, // ✅ Required for PQC (Kyber, Falcon)
          wasm: true,
        },
      },
    },
    build: {
      target: "esnext",
      outDir: "dist",
      sourcemap: true,
      minify: "terser",
      rollupOptions: {
        external: [
          "starknet", // ✅ Ensures StarkNet modules work
          "class-variance-authority",
          "@radix-ui/react-tooltip",
          "@radix-ui/react-popover",
          "@helia/unixfs",
          "vite-plugin-wasm",
          "vite-plugin-top-level-await",
        ],
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "ethers", "starknet", "helia"],
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },
    define: {
      global: "globalThis",
      "process.env": {},
    },
  };
});