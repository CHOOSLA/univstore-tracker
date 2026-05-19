module.exports = {
  apps: [
    {
      name: "univ-dashboard",
      script: "npm",
      args: "run dashboard:dev",
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "univ-worker",
      script: "npm",
      args: "run worker:dev",
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "univ-crawler",
      script: "npm",
      args: "run crawler:dev",
      cron_restart: "0 */6 * * *", // 6시간마다 자동 실행
      autorestart: false,
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "univ-sync-picks",
      script: "node",
      args: "packages/crawler/sync-picks.js",
      cron_restart: "0 4 * * *", // 매일 새벽 4시 자동 실행
      autorestart: false,
      env: {
        NODE_ENV: "development",
      }
    }
  ]
};
