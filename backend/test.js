const browser = require("axios");

console.log("Starting test");

const response = await browser.get('https://ip.oxylabs.io/location', {
  proxy: {
    protocol: 'http',
    host: 'pr.oxylabs.io',
    port: 7777,
    auth: {
      user: 'customer-posty_oQQDk',
      password: 'bv6sfaQedBJtdbt4D6Uc+'
    }
  }
});

// run the file

