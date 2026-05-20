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
      // ZSET 무한 순환 큐 아키텍처에서는 데몬이 끊기지 않고 돌아가는 것이 가장 효율적.
      // 사이트맵 재수집/재로그인 같은 startup 오버헤드는 시작 1회로 충분.
      // crash 시에만 PM2가 자동 재기동.
      autorestart: true,
      max_restarts: 10,
      restart_delay: 30000,
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
