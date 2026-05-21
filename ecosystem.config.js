module.exports = {
  apps: [
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
      // 한 cycle 완료 시 process.exit(0)으로 정상 종료, cron이 다음 시점에 재시작하는 방식.
      // autorestart: false로 두어야 정상 종료가 즉시 재시작으로 이어지지 않음.
      // crash 시에도 다음 cron까지 대기 (BlockGuard/retry counter가 1차 안전망 역할).
      cron_restart: "0 */12 * * *",
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
