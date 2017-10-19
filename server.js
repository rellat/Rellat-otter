#!/usr/bin/env node
/* global process, global */
'use strict'

const assert = require('assert')
var express = require('express')
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)
var cfenv = require('cfenv')
var signal = require('simple-signal-server')(io)
var path = require('path')
var bodyParser = require('body-parser')
var serverconfig
try { serverconfig = require('./config')
} catch (e) { serverconfig = {hostname: '127.0.0.1',port: process.env.PORT || 8080} }

// express 모듈을 사용해서 로컬 디랙토리를 웹서버 경로에 라우팅한다.
app.use('/', express.static(path.join(__dirname, 'mhweb')))
// 최상위 도메인으로 접속하면 ./mhweb 폴더에서 시작
/*
app.get('/', function (req, res, next) {
  res.sendFile(__dirname + '/mhweb/index.html')
// 파일명을 명시하지 않으면 index.html을 출력
})
*/
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use('/', require('./routes'))

// routing으로 oEmbed 설정 참고: http://oembed.com/ -> 5.1. Video example
app.get('/embed', function (req, res, next) {
  var resURL = 'https://' + serverconfig.hostname + '/' + '?embed=true&room=' + encodeURI(req.query.room)

  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify({
    success: true,
    type: 'rich',
    version: '1.0',
    provider_name: 'MultiHack',
    provider_url: 'http://multihack.co',
    title: 'Multihack',
    height: '300',
    width: '500',
    html: '<iframe src="' + resURL + '" scrolling="no" frameborder="0" height="300" allowtransparency="true" style="width: 100%; overflow: hidden;"></iframe>'
  }))
})

var calls = {}
var rooms = {}
var sockets = {}

var Y = require('yjs')
Y.debug.log = console.log.bind(console)
const log = Y.debug('y:websockets-server')
require('y-memory')(Y)
try {  require('y-leveldb')(Y)
} catch (err) {}
try { // try to require local y-websockets-server
  require('./y-websockets-server')(Y)
} catch (err) { // otherwise require global y-websockets-server
  console.log('Can not find custom y-websockets-server moudule!')
}
require('y-array')(Y)
require('y-map')(Y)
require('y-text')(Y)
require('y-richtext')(Y)

global.yInstances = {}
function getInstanceOfY (room) {
  if (global.yInstances[room] == null) {
    global.yInstances[room] = Y({
      db: {
        name: 'leveldb',
        dir: 'leveldb-data',
        namespace: room,
        // cleanStart: true
        cleanStart: false
      },
      connector: {
        name: 'websockets-server',
        room: room,
        io: io,
        debug: true
      },
      share: {}
    })
  }
  return global.yInstances[room]
}
function onceReady (target, f) {
  if (!target) {
    log('keep looking for target')
    setTimeout(onceReady.bind(this, target, f), 10)
  } else {
    f()
  }
}

// websocket은 트래픽 중계용도로 사용한다. multihack-core 참고
io.on('connection', function (socket) {
  sockets[socket.id] = socket

  socket.on('joinRoom', function (message) {
    log('User "%s" joins room "%s"', socket.id, message.room)
    socket.join(message.room)
    socket.room = message.room || 'notitle'
    socket.nickname = message.nickname || 'Guest'
    socket.nop2p = message.nop2p || false
    getInstanceOfY(message.room).then(function (y) {
      global.y = y // TODO: remove !!!
      if (!rooms[socket.room]) rooms[socket.room] = []
      // create room if missing
      y.connector.userJoined(socket.id, 'slave')
      rooms[socket.room].push(socket.id) // add to room
    })
    // announce connect (for no-p2p peers)
    socket.broadcast.to(socket.room).emit('peer-join', {
      id: socket.id,
      nickname: socket.nickname,
      nop2p: socket.nop2p
    })
  })

  // forward data (for no-p2p peers)
  socket.on('yjsSocketMessage', function (msg) {
    if (msg.room != null) {
      getInstanceOfY(msg.room).then(function (y) {
        onceReady(y.connector.connections[socket.id], function () {
          msg.sender = socket.id
          y.connector.receiveMessage(socket.id, msg)
            .catch(function (error) {
              log('' + y.connector.connections[socket.id] + ' unable to deliver message: ' + JSON.stringify(msg))
            })
        })
      })
    }
  })

  socket.on('voice-join', function () {
    if (!socket.room) return

    socket.emit('voice-discover', calls[socket.room] || [])

    calls[socket.room] = calls[socket.room] || []
    calls[socket.room].push(socket.id)
  })

  socket.on('voice-leave', function () {
    if (!socket.room) return

    calls[socket.room] = calls[socket.room] || []
    var index = calls[socket.room].indexOf(socket.id)
    if (index !== -1) calls[socket.room].splice(index, 1)
  })

  socket.on('disconnect', function () {
    getInstanceOfY(socket.room).then(function (y) {
      // announce disconnect (for no-p2p peers)
      socket.broadcast.to(socket.room).emit('peer-leave', {
        id: socket.id,
        nickname: socket.nickname,
        nop2p: socket.nop2p
      })

      calls[socket.room] = calls[socket.room] || []
      var index = calls[socket.room].indexOf(socket.id)
      if (index !== -1) calls[socket.room].splice(index, 1)

      rooms[socket.room] = rooms[socket.room] || []
      index = rooms[socket.room].indexOf(socket.id)
      if (index !== -1) rooms[socket.room].splice(index, 1)

      y.connector.userLeft(socket.id)
    })
    delete sockets[socket.id]
  })
  socket.on('leaveRoom', function (room) {
    getInstanceOfY(room).then(function (y) {
      var i = rooms.indexOf(room)
      var index = rooms[socket.room].indexOf(socket.id)
      if (index !== -1) rooms[socket.room].splice(index, 1)
      y.connector.userLeft(socket.id)
    })
  })
})

signal.on('discover', function (request) {
  if (!request.metadata.room) return
  var peerIDs = rooms[request.metadata.room] || [] // TODO: Loose mesh
  request.discover(peerIDs)
})

signal.on('request', function (request) {
  request.forward()
})

// 웹서버를 시작한다.
// var appEnv = cfenv.getAppEnv()
// server.listen(appEnv.port, appEnv.bind, function() {
//     console.log("server starting on " + appEnv.url)
// })

// DB setting
var mongoose = require('mongoose')
var db = mongoose.connection
mongoose.connect('mongodb://127.0.0.1/rellatIDE')
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function () {
  mongoose.Promise = global.Promise;
})

server.listen(serverconfig.port, '0.0.0.0', function () {
  console.log('server starting on ' + serverconfig.hostname + ':' + serverconfig.port)
})
