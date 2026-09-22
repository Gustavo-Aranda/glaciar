const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://127.0.0.1:5500/frontend/user/",
    env: {
      apiUrl: "http://localhost:5205/api"
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
