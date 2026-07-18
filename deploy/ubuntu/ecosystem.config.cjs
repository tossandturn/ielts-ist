const path = require("path");

module.exports = {
  apps: [
    {
      name: "ieltsist",
      script: "server.js",
      cwd: path.resolve(__dirname, "..", ".."),
      instances: 1,
      exec_mode: "fork",
      watch: false,
      time: true,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
        PORT: "4321",
      },
    },
  ],
};

