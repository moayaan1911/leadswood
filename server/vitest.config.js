import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      // keep the downloaded mongod inside the repo, so `npm test` works from any directory
      MONGOMS_DOWNLOAD_DIR: path.join(here, "node_modules/.cache/mongodb-memory-server"),
    },
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});