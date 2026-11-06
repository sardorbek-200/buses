module.exports = {
  apps: [{
    name: "busticket",
    script: "server.js",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: "700M",
    kill_timeout: 10000,
    env: {
      NODE_ENV: "production",
      PORT: 3009,
      NEXT_TELEMETRY_DISABLED: 1
    }
  }]
};
