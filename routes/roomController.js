var Room = require('./../models/rooms')

module.exports.getRooms = function (req, res) {
  Room.find({}).sort({date: -1}).exec(function (err, allRooms) {
    if (err) {
      res.error(err)
    } else {
      res.json(allRooms)
    }
  })
}

module.exports.addRoom = function (req, res) {
  var data = req.body

  Room.findOne({roomName: data.roomName}, function (err, ele) {
    if (err) {
      res.status(404)
      res.json({
        flag: false
      })
      return
    }

    if (ele) {
      res.json({
        flag: false
      })
    } else {
      var room = new Room(data)
      room.save().then(function () {
        res.json({flag: true})
      })
    }

  })

}