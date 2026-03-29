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

const webEnvFile = loadEnvFile(path.join(__dirname, "apps/web/.env.local"));
const webAppUrl =
  process.env.APP_URL ??
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  webEnvFile.APP_URL ??
  webEnvFile.AUTH_URL ??
  webEnvFile.NEXTAUTH_URL ??
  "https://redcoreos.net";

const webDatabaseUrl =
  `file:${path.join(__dirname, "apps/web/prisma/prisma/dev.db")}`;

module.exports = {
  apps: [
    {
      name: "redcore-web",
      cwd: "./apps/web",
      script: ".next/standalone/apps/web/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_URL: webDatabaseUrl,
        APP_URL: webAppUrl,
        AUTH_URL: webAppUrl,
        NEXTAUTH_URL: webAppUrl,
        NEXTAUTH_SECRET:
          process.env.NEXTAUTH_SECRET ??
          process.env.AUTH_SECRET ??
          webEnvFile.NEXTAUTH_SECRET,
        AUTH_SECRET:
          process.env.AUTH_SECRET ??
          process.env.NEXTAUTH_SECRET ??
          webEnvFile.NEXTAUTH_SECRET,
        GOOGLE_CLIENT_ID:
          process.env.GOOGLE_CLIENT_ID ?? webEnvFile.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET:
          process.env.GOOGLE_CLIENT_SECRET ?? webEnvFile.GOOGLE_CLIENT_SECRET,
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
