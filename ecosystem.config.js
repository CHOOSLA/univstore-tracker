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
      autorestart: false, // 크롤러는 작업 완료 후 종료되므로 자동 재시작 방지
      env: {
        NODE_ENV: "development",
      }
    }
  ]
};
