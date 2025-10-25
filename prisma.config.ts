import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

type Env = {
  DATABASE_URL: string;
  DIRECT_URL: string;
};

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  engine: "classic",
  datasource: {
    url: env<Env>("DATABASE_URL"),
    directUrl: env<Env>("DIRECT_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
