import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Limita vitest ai NOSTRI test in src/ (i repo clonati in references/ portano
// migliaia di test propri da NON eseguire). Alias @/ allineato a tsconfig.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "references", ".next", "dist"],
    setupFiles: ["dotenv/config"], // carica .env per i test di integrazione DB
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
