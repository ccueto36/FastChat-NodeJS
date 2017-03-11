var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var path = require('path');
var users = {};

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use(express.static(path.join(__dirname + '/public')));

io.sockets.on('connection', function(socket) {
    console.log("**New user connected**");

    //listens for 'send message' event from client
    socket.on('send message', function(data, callback) {
        var msg = data.trim(); //gets rid of white spaces on the returned string
        if (msg.substr(0, 3) === '/w ') { //parses first 3 string chars
            msg = msg.substr(3); //parses the rest of the message, past '/w'
            var ind = msg.indexOf(' ');
            if (ind !== -1) {
                var name = msg.substr(0, ind);
                var msg = msg.substr(ind + 1);
                if (name in users) {
                    users[name].emit('whisper', {
                        msg: msg,
                        nick: socket.nickname
                    });
                    console.log("Whisper!");
                } else {
                    callback('Error. Enter a valid user.');
                }
            } else {
                callback('Please enter a message for your whisper.');
            }
        } else {
            console.log("Message: " + msg);
            io.sockets.emit('new message', {
                msg: data,
                nick: socket.nickname,
                color: socket.nickColor
            });
        }
    });

    //listens for 'new user' event from client
    socket.on('new user', function(data, callback) {

        if (data.length == 0) {
            socket.emit('invalid nickname', "Invalid nickname. Try another.");
            return;
        }
        if (data in users) {
            callback({
                isAvailable: false,
                length: data.length
            });
        } else {
            callback({
                isAvailable: true,
                length: data.length
            });
            socket.nickname = data;
            socket.nickColor = assignRandomColor();
            users[socket.nickname] = socket;
            console.log(data);
            io.sockets.emit('system message', '<span style="color: ' + socket.nickColor + ';">' +
                socket.nickname + '</span> <span style="color: yellow;">has connected.</span><br/>');
            updateNicknames();
        }

    });

    function updateNicknames() {
        io.sockets.emit('usernames', Object.keys(users))
    };

    function assignRandomColor() {
        var colors = ["#ff8080", "aqua", "coral",
            "darkorange", "lightgreen",
            "green", "cyan", "#87CEFA",
            "#6B8E23", "#9ACD32", "aquamarine"
        ];
        var rand = Math.floor(Math.random() * 11);
        return colors[rand];
    }

    socket.on('disconnect', function(data) {
        if (!socket.nickname) return;
        delete users[socket.nickname];
        io.sockets.emit('system message', '<span style="color: ' + socket.nickColor + ';">' +
            socket.nickname + '</span> <span style="color: yellow;">has disconnected.</span><br/>');
        updateNicknames();
    });
});








server.listen(3000, function() {
    console.log('listening on port 3000');
});
