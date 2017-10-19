var mongoose = require('mongoose');

module.exports = mongoose.model('Room', {
  roomName: String,
  roomDiscription: String
})