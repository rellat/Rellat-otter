var system = require('system'), t, address;
if (system.args.length < 2) {
  console.log('missing arg');
  process.exit();
}
t = Date.now();
address = system.args[2];

// Set headless chrome to make this server as primary peer of webRTC.
const CDP = require('chrome-remote-interface');
CDP((client) => {
  // Extract used DevTools domains.
  const {Page, Runtime} = client;
  // Enable events on domains we are interested in.
  Promise.all([
    Page.enable()
  ]).then(() => {
    return Page.navigate({url: address});
  });
  // Evaluate outerHTML after page has loaded.
  Page.loadEventFired(() => {
    Runtime.evaluate({expression: 'document.body.outerHTML'}).then((result) => {
      //console.log(result.result.value);
      //client.close(); // keep opening connection.
    });
  });
}).on('error', (err) => {
  console.error('Cannot connect to browser:', err);
});