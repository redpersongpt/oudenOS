// PM2 Ecosystem Config for redcoreECO VDS deployment
module.exports = {
  apps: [
    {
      name: "redcore-web",
      cwd: "./apps/web",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
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
        NODE_ENV: "production",
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
        NODE_ENV: "production",
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
        NODE_ENV: "production",
        PORT: 3003,
        HOST: "127.0.0.1",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "256M",
    },
  ],
};
