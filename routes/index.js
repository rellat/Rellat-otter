var express = require('express')
var router = express.Router()

var roomContoroller = require('./roomController')
router.get('/roomList', roomContoroller.getRooms)
router.post('/room', roomContoroller.addRoom)


module.exports = router