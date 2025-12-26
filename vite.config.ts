import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize for Vercel deployment
    rollupOptions: {
      // Prevent Rollup from trying to load native modules
      external: [],
      output: {
        manualChunks: undefined,
      },
    },
    // Use esbuild for dependencies optimization
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Ensure compatibility
    target: 'es2015',
    // Minify for production
    minify: mode === 'production' ? 'esbuild' : false,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    esbuildOptions: {
      target: 'es2015',
    },
  },
}));
