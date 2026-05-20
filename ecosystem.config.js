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
      // DirectApi 모드로 6.6h cycle 달성 후, 12시간마다 fresh restart로 fingerprint/세션 재설정.
      // crash 시 자동 복구도 활성화 (단, 짧은 간격 폭주 방지를 위한 max_restarts 제한).
      cron_restart: "0 */12 * * *",
      autorestart: true,
      max_restarts: 5,
      restart_delay: 60000,
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
