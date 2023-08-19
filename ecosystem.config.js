module.exports = {
  apps: [{
    name: "api.branch.careipro.com",
    script: "./dist/server.js",
    env_production: {
      NODE_ENV: "production",
      PORT:3004,
      TZ: "Asia/Calcutta",
      MAIN_APP_API:"https://careipro.com/webservice/v1/"
    },
    env_development: {
      NODE_ENV: "development",
      PORT:3004,
      TZ: "Asia/Calcutta",
      MAIN_APP_API:"https://careipro.com/webservice/v1/"
    }
  }]
}
