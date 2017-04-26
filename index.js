var express = require('express'),
    app = express(),
    path = require('path'),
    server = require('http').Server(app);
app.set('port', process.env.PORT || 3000);
app.use('/', express.static(path.join(__dirname, 'mhweb')));
app.use('/bower_components/', express.static(path.join(__dirname, 'bower_components')));
// Set up express server
server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});

var childProcess = require('child_process')
childProcess.execFile('google-chrome', [
    '--headless','--disable-gpu','--remote-debugging-port=9222'
    ], function(err, stdout, stderr) {
        // handle results 
});
childProcess.execFile('node', [
    '--inspect=9222',path.join(__dirname, 'primary-peer.js'),
    'http://localhost:3000'
    ], function(err, stdout, stderr) {
        // handle results 
});
