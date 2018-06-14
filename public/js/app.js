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

    socket.on('invalid nickname', function(msg) {
        $nickError.html('<span style="color:pink">' + msg + '</span>');
    });

    socket.on('usernames', function(users) {
        var html = '';
        for (i = 0; i < users.length; i++) {
            html += '&nbsp;&nbsp;&nbsp;&nbsp;<span><i class="fa fa-user" aria-hidden="true"></i>&nbsp;' + users[i] + '</span><br/>';
        }
        $users.html(html);

    });

    $messageForm.submit(function(e) {
        e.preventDefault();
        socket.emit('send message', $messageBox.val(), function(data) {
            $chat.append('<b><span style="color: red";' + data + "</span><br/>");
        });
        $messageBox.val('');
    });

    $comments_symbol.css('cursor', 'pointer');
    $comments_symbol.click(function(e) {
        socket.emit('send message', $messageBox.val(), function(data) {
            $chat.append('<b><span style="color: red";' + data + "</span><br/>");
        });
        $messageBox.val('');
    });

    socket.on('new message', function(data) {
        $chat.append('<b><span style="color: ' + data.color + ' "> ' + data.nick + ": </b>" + data.msg + "</span><br/>");
        autoScrollChat();

    });

    socket.on('whisper', function(data) {
        $chat.append('<b><em><span style="color: purple">[w] ' + data.nick + ': </b>' + data.msg + '</em></span><br/>');
    });

    socket.on('system message', function(msg) {
        $chat.append('<em style="color:yellow">' + msg + '</em>');
        autoScrollChat();
    });

    function autoScrollChat() {
        $('#chat').animate({
            scrollTop: $('#chat')[0].scrollHeight
        });
    };
});
