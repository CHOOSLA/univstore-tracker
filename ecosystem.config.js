module.exports = {
  apps: [
    {
      name: "univ-worker",
      script: "node",
      args: "packages/worker/index.js",
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "univ-crawler",
      script: "node",
      args: "packages/crawler/index.js",
      // cycle 완료 시 process.exit(0)으로 정상 종료 → stop_exit_codes로 재시작 안 함(cron 대기).
      // crash(비정상 종료)는 autorestart로 즉시 복구 → PROGRESS_KEY 기준 mid-cycle 이어받음.
      // 과거 autorestart:false라 디스크 풀→Redis MISCONF crash 시 12h cron까지 박제됐음.
      // exp_backoff로 디스크가 계속 차 있을 때 무한 재시작 폭주를 막는다.
      cron_restart: "0 */12 * * *",
      autorestart: true,
      stop_exit_codes: [0],
      exp_backoff_restart_delay: 5000,
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
