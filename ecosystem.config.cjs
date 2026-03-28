// PM2 Ecosystem Config for redcoreECO VDS deployment
const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const apiEnv = {
  ...loadEnvFile(path.join(__dirname, ".env")),
  NODE_ENV: "production",
};

const webDatabaseUrl =
  process.env.WEB_DATABASE_URL ??
  `file:${path.join(__dirname, "apps/web/prisma/prisma/dev.db")}`;

module.exports = {
  apps: [
    {
      name: "redcore-web",
      cwd: "./apps/web/.next/standalone/apps/web",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_URL: webDatabaseUrl,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
    },
    {
      name: "tuning-api",
      cwd: "./apps/tuning-api",
      script: "dist/index.js",
      env: {
        ...apiEnv,
        PORT: 3001,
        HOST: "127.0.0.1",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "256M",
    },
    {
      name: "os-api",
      cwd: "./apps/os-api",
      script: "dist/index.js",
      env: {
        ...apiEnv,
        PORT: 3002,
        HOST: "127.0.0.1",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "256M",
    },
    {
      name: "cloud-api",
      cwd: "./apps/cloud-api",
      script: "dist/index.js",
      env: {
        ...apiEnv,
        PORT: 3003,
        HOST: "127.0.0.1",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "256M",
    },
  ],
};
