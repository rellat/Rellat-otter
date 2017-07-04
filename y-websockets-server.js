/* global Y */
'use strict'

function extend (Y) {
  class Connector extends Y.AbstractConnector {
    constructor (y, options) {
      if (options === undefined) {
        throw new Error('Options must not be undefined!')
      }
      if (options.room == null) {
        throw new Error('You must define a room name!')
      }
      if (options.io == null) {
        throw new Error('You must define the socketio server!')
      }
      options.role = 'master'
      options.forwardAppliedOperations = true
      options.generateUserId = true
      // options.checkAuth = function () { return Promise.resolve('write') }
      // console.log('checkAuth: ' + JSON.stringify(options.checkAuth));
      super(y, options)
      this.options = options
      this.io = options.io
    }
    disconnect () {
      // throw new Error('You must not disconnect with this connector!')
    }
    reconnect () {
      // throw new Error('You must not disconnect with this connector!')
    }
    destroy () {
      this.io = null
      this.options = null
    }
    send (uid, message) {
      message.room = this.options.room
      this.io.to(uid).emit('yjsSocketMessage', message, uid)
      super.send(uid, message)
    }
    broadcast (message) {
      message.room = this.options.room
      this.io.in(this.options.room).emit('yjsSocketMessage', message)
      // y.connector => receiveMessage에서 sender === receiver 일 때 return promise한다.
      // try {
      //   let socketIds = this.io.sockets.adapter.rooms[this.options.room];
      //   // push every client to the result array
      //   for (var i = 0, len = socketIds.length; i < len; i++) {
      //       // check if the socket is not the requesting socket
      //       let socket_id = socketIds.sockets[i]
      //       if (this.io.sockets.connected[socket_id].nop2p) {
      //           this.io.to(socket_id).emit('yjsSocketMessage', message, socket_id)
      //       }
      //   }
      // } catch (e) {
      //   console.log(`Attempted to access non-existent room: ${this.options.room}`);
      // }
      super.broadcast(message)
    }
    isDisconnected () {
      return false
    }
  }
  Y.extend('websockets-server', Connector)
}

module.exports = extend
if (typeof Y !== 'undefined') {
  extend(Y)
}
