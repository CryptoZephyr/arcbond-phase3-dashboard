import { defineConfig } from "@prisma/config";
import { readFileSync } from "node:fs";

function readEnv(file: string, key: string): string {
  try {
    const line = readFileSync(file, "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith(key + "="));
    if (!line) return "";
    let v = line.slice(key.length + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v;
  } catch {
    return "";
  }
}

const url = process.env.DATABASE_URL || readEnv(".env.local", "DATABASE_URL");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});
