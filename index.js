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

    //listens for 'send message' event from client
    socket.on('send message', function(data, callback) {
        var msg = data.trim(); //gets rid of white spaces on the returned string
        if (isWhisper(msg)) { //determines if it's a Whisper message
            msg = msg.substr(3); //parses the rest of the message, past '/w'
            var ind = msg.indexOf(' ');
            if (ind !== -1) {
                var name = msg.substr(0, ind);
                var msg = msg.substr(ind + 1);
                if(name === socket.nickname){
                    socket.emit('system message', "You cannot whisper to yourself. That'd be weird");
                }
                else {
                    socket.emit('whisper', {
                        msg: msg,
                        nick: socket.nickname
                    });

                    if (name in users) {
                        users[name].emit('whisper', {
                            msg: msg,
                            nick: socket.nickname
                        });
                    }
                    else {
                        callback('Error. Enter a valid user.');
                    }
                    serverLog(`${socket.nickname} whispered ${name}: ${msg}`); //server message
                
                } 
            } else {
                callback('Please enter a message for your whisper.');
            }
        } else { //regular message
            serverLog(`${socket.nickname} said: ${msg}`); //server message
            io.sockets.emit('new message', {
                msg: data,
                nick: socket.nickname,
                color: socket.nickColor
            });
        }
    });

    

    //listens for 'new user' event from client
    socket.on('new user', function(nickname, callback) {

        if (nickname.length == 0) {
            socket.emit('invalid nickname', "Invalid nickname. Try another.");
            return;
        }
        if (nickname in users) {
            callback({
                isAvailable: false,
                length: nickname.length
            });
        } else {
            callback({
                isAvailable: true,
                length: nickname.length
            });
            socket.nickname = nickname;
            socket.nickColor = assignRandomColor();
            users[socket.nickname] = socket;
            io.sockets.emit('system message', '<span style="color: ' + socket.nickColor + ';">' +
                socket.nickname + '</span> <span style="color: yellow;">has connected.</span>');
            serverLog(`${socket.nickname} has logged in`); //server message
            updateNicknames();
        }

    });

    function isWhisper(msg) {
        return (msg.substr(0,3) === '/w ');
    };

    function updateNicknames() {
        debugger;
        io.sockets.emit('usernames', Object.keys(users));
    };

    function assignRandomColor() {
        var colors = ["#ff8080", "aqua", "coral",
            "darkorange", "lightgreen",
            "green", "cyan", "#87CEFA",
            "#6B8E23", "#9ACD32", "aquamarine"
        ];
        var rand = Math.floor(Math.random() * colors.length);
        var chosen = colors[rand];
        colors.splice(chosen,1);
        return chosen;
    };

    socket.on('disconnect', function(data) {
        if (!socket.nickname) return;
        delete users[socket.nickname];
        io.sockets.emit('system message', '<span style="color: ' + socket.nickColor + ';">' +
            socket.nickname + '</span> has disconnected.');
        updateNicknames();
        serverLog(`${socket.nickname} disconnected`);
    });
});

function serverLog(msg){
    console.log(`>> ${msg}`);
}

server.listen(3000, function() {
    serverLog('Listening on port 3000'); //server message
});
