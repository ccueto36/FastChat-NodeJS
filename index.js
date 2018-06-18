var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var path = require('path');
const DEFAULT_PORT = 3000;
var usersMap = new Map();

//sends 'index.html' to default url path 
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
//tells express what path contains static files
app.use(express.static(path.join(__dirname + '/public')));

//listens for 'connection' event from client
io.sockets.on('connection', function(socket) {

    /*Listens for 'send message' event from client. Message from
    client can be either a regular message or a whisper message*/
    socket.on('send message', handleSendMessage);

    //listens for 'disconnect' event from client
    socket.on('disconnect', handleDisconnect);

    //listens for 'new user' event from client
    socket.on('new user', handleNewUser);

    //listens for the 'away mode' event from client
    socket.on('away mode', handleAwayMode);

    //listens for the 'exit away mode' event from client
    socket.on('exit away mode', handleExitAwayMode);

    /*strips 'usersMap' map's keys nickname and nickcolor
    properties and returns it to client to show currently
    logged in usersMap via 'usernames' sockets emit */
    function updateNicknames() {
        var result = {};
        usersMap.forEach(function(value, key){
            var data = {};
            data.nickname = value.nickname;
            data.nickcolor = value.nickcolor;
            data.status = value.status;
            result[value.nickname] = data;
        });
        io.sockets.emit('usernames', result);
    };

    /* Assigns a random color to new users to differentiate 
    users. When a color from the array gets used, it gets
    deleted from the list so next user gets a new color */
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
    
    /* Sets user's status to 'away' */
    function handleAwayMode(){
        var status = usersMap.get(socket.nickname).status;
        if(status != 'away'){
            usersMap.get(socket.nickname).status = 'away';
            serverLog(`${socket.nickname} is now on Away mode`);
            updateNicknames();
        }
        
    }
    /* Sets user's status to 'available' if it's currently set to 'away' */
    function handleExitAwayMode(){
        if(usersMap.get(socket.nickname).status === 'away'){
            usersMap.get(socket.nickname).status = 'available';
            serverLog(`${socket.nickname} is now on Available mode`);
        }
        updateNicknames();
    }

    /*Listens for 'disconnect' event from client and deletes
    the user from 'usersMap' object. Also sends system message
    to chat to notify connected usersMap */
    function handleDisconnect(data){
        if (!socket.nickname) return;
        usersMap.delete(socket.nickname);

        io.sockets.emit('system message', '<span style="color: ' + socket.nickcolor + ';">' +
            socket.nickname + '</span> has disconnected.');
        updateNicknames();
        serverLog(`${socket.nickname} disconnected`);
    }

    function handleNewUser(nickname, callback){
        var nickname = nickname.trim();
        if (nickname.length == 0) {
            socket.emit('invalid nickname', "Invalid nickname. Try another.");
            return;
        }
        if (usersMap.has(nickname)) {
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
            socket.nickcolor = assignRandomColor();
            socket.status = 'available';
            usersMap.set(socket.nickname, socket);
            io.sockets.emit('system message', '<span style="color: ' + socket.nickcolor + ';">' +
                socket.nickname + '</span> <span style="color: yellow;">has connected.</span>');
            serverLog(`${socket.nickname} has logged in`); //server message
            updateNicknames();
        }
    }

    function handleSendMessage(message, callback){
        var msg = message.trim(); //gets rid of white spaces on the returned string
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

                        if (usersMap.has(name)) {
                            usersMap.get(name).emit('whisper', {
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
                    msg: message,
                    nick: socket.nickname,
                    color: socket.nickcolor
                });
            }
        } 
});

//checks if message is a whisper message
function isWhisper(msg) {
    return (msg.substr(0,3) === '/w ');
};
//function to log events to server
function serverLog(msg){
    console.log(`>> ${msg}`);
}
//listens for server connections from PORT number
server.listen(DEFAULT_PORT, function() {
    serverLog('Listening on port 3000'); //server message
});
