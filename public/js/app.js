jQuery(function($) {
    var socket = io.connect();
    var $nickForm = $('#setNick');
    var $nickError = $('#nickError');
    var $nickBox = $('#nickName');
    var $users = $('#users');
    var $messageForm = $('#send-message');
    var $messageBox = $('#message');
    var $chat = $('#chat');
    var $comments_symbol = $('#comments_symbol');
    var idleTime = 0;

    $nickForm.submit(function(e) {
        e.preventDefault();
        socket.emit('new user', $nickBox.val(), function(nickname) {

            if (nickname.isAvailable) {
                $('#chatContainer').hide();
                $('#contentWrap').show();
                $('#message').focus();
            } else {
                $nickError.html('<span style="color:pink">Username already taken. Try another one.</span>');
            }
        });
        $nickBox.val('');

    });
    /* -----Start of Away Mode Logic------- */
    var idleInterval = setInterval(timerIncrement, 300000);
    $messageBox.keypress(function(){
        idleTime = 0;
        socket.emit('exit away mode');
    });

    function timerIncrement(){
        idleTime = idleTime + 1;
        if(idleTime >= 1) {
            socket.emit('away mode');
        }
    }
    /* -----End of Away Mode Logic------ */

    socket.on('invalid nickname', function(msg) {
        $nickError.html('<span style="color:pink">' + msg + '</span>');
    });

    socket.on('usernames', function(users) {
        var html = '';
        for(user in users) {
            var status = users[user].status;
            var circleColor = status === 'available' ? 'lime' : status === 'away' ? 'yellow' : 'unknown';
            html += `&nbsp;&nbsp;&nbsp;&nbsp;<i style="color:${circleColor};" class="fa fa-circle" aria-hidden="true"></i>
            <span style=color:${users[user].nickcolor}>&nbsp;${users[user].nickname}</span><br/>`;
        };
        $users.html(html);
    });

    $messageForm.submit(function(e) {
        e.preventDefault();
        socket.emit('send message', $messageBox.val(), function(data) {
            $chat.append('<b><span style="color: red";' + data + "</span><br/>");
        });
        $messageBox.val('');
    });

    $comments_symbol.click(function(e) {
        socket.emit('send message', $messageBox.val(), function(data) {
            $chat.append('<b><span style="color: red";' + data + "</span><br/>");
        });
        $messageBox.val('');
    });

    socket.on('new message', function(data) {
        var d = new Date();
        var n = d.toString();
        var formatted = n.substr(3,18);
        $chat.append(`<b><span style="color:${data.color};">${data.nick}: </b>${data.msg}</span>
        <p style="font-size: 9px; margin-bottom: 0;">${formatted}</p>`);
        autoScrollChat();

    });

    socket.on('whisper', function(data) {
        $chat.append('<b><em><span style="color: purple">[w] ' + data.nick + ': </b>' + data.msg + '</em></span><br/>');
    });

    socket.on('system message', function(msg) {
        $chat.append('<em style="color:yellow">' + msg + '</em><br/>');
        autoScrollChat();
    });

    function autoScrollChat() {
        $('#chat').animate({
            scrollTop: $('#chat')[0].scrollHeight
        });
    };
});
