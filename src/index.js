const path = require('path')
const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const publicDirectoryPath = path.join(__dirname, "../public")

const port = process.env.PORT || 3000
app.use(express.static(publicDirectoryPath))

io.on("connection", (socket) => {

    socket.on('join', (options, callback) => {
        const {error, user} = addUser({
            id: socket.id,
            ...options
        })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
    
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on("sendMessage", (msg, callback) => {
        const filter = new Filter()

        if (filter.isProfane(msg)) {
            return callback('Profanity is not allowed')
        }

        const user = getUser(socket.id)

        io.to(user.room).emit('message', generateMessage(user.username, msg))
        callback()
    })

    socket.on('shareGeolocation', (location, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps/?q=${location.latitude},${location.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})



server.listen(port, () => {
    console.log("Server is listening on port ", port)
})