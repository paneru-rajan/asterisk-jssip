var phone;
var comfirmCall;
var session;
var socket           = new JsSIP.WebSocketInterface('wss://' + asteriskIp + ':8089/ws');
var configuration    = {
    sockets:          [socket],
    'uri':            'sip:' + asteriskUser + '@' + asteriskIp,
    'password':       asteriskUserPass,
    'session_timers': false
};
var remoteAudio      = new window.Audio();
remoteAudio.autoplay = true;
var callOptions      = {
    mediaConstraints: {audio: true, video: false}
};
if (configuration.uri && configuration.password) {
    JsSIP.debug.enable('JsSIP:*');
    phone = new JsSIP.UA(configuration);
    phone.on('registrationFailed', function (ev) {
        console.log('Registering on SIP server failed with error: ' + ev.cause);
        configuration.uri      = null;
        configuration.password = null;
        updateUI();
    });
    phone.on('newRTCSession', function (ev) {
        var newSession = ev.session;
        if (session) {
            session.terminate();
        }
        session             = newSession;
        var completeSession = function () {
            session = null;
            updateUI();
        };
        session.on('ended', completeSession);
        session.on('failed', completeSession);
        session.on('accepted', updateUI);
        session.on('peerconnection', addAudioStream);
        session.on('confirmed', updateUI);
        if (session._direction == 'incoming') {
            ringTone.play();
            if (!document.hasFocus())
                comfirmCall = setTimeout(function () {
                    var receivePhone = confirm('Incoming Call\n Do you like to receive the Incoming Call?');
                    if (receivePhone) {
                        session.answer(callOptions);
                    } else {
                        hangup();
                    }
                }, 3000);


        }
        updateUI();
    });
    phone.start();
}

updateUI();

function addAudioStream() {
    session.connection.addEventListener('addstream', function (event) {
        ringTone.pause();
        remoteAudio.src = window.URL.createObjectURL(event.stream);
    });
}

$('#connectCall').click(function () {
    var dest = $('#toField').val();
    phone.call(dest, callOptions);
    updateUI();
});
$('#answer').click(function () {
    session.answer(callOptions);
    if (comfirmCall) {
        clearTimeout(comfirmCall);
        comfirmCall = false;
    }
});
var hangup = function () {
    session.terminate();
};
$('#hangUp').click(hangup);
$('#reject').click(hangup);
$('#mute').click(function () {
    if (session.isMuted().audio) {
        session.unmute({audio: true});
    } else {
        session.mute({audio: true});
    }
    updateUI();
});
$('#toField').keypress(function (e) {
    if (e.which === 13) {//enter
        $('#connectCall').click();
    }
});
var lock_dtmf_while_playing = false; //inorder to lock multiple input until playing ends
dtmfTone.onended            = function () {
    lock_dtmf_while_playing = false;
};
$('#inCallButtons').on('click', '.dialpad-char', function (e) {
    if (!lock_dtmf_while_playing) {
        lock_dtmf_while_playing = true;
        dtmfTone.play();
        var $target = $(e.target);
        var value   = $target.data('value');
        session.sendDTMF(value.toString());
    }
});

function updateUI() {
    if (configuration.uri && configuration.password) {
        $('#errorMessage').hide();
        $('#wrapper').show();
        if (session) {
            if (session.isInProgress()) {
                if (session._direction === 'incoming') {
                    $('#incomingCallNumber').html(session.remote_identity.uri);
                    $('#incomingCall').show();
                    $('#callControl').hide();
                    $('#incomingCall').show();
                } else {
                    $('#callInfoText').html('Ringing...');
                    $('#callInfoNumber').html(session.remote_identity.uri.user);
                    $('#callStatus').show();
                }

            } else if (session.isEstablished()) {
                $('#callStatus').show();
                $('#incomingCall').hide();
                $('#callInfoText').html('In Call');
                $('#callInfoNumber').html(session.remote_identity.uri.user);
                $('#inCallButtons').show();
                ringTone.pause();
            }
            $('#callControl').hide();
        } else {
            $('#incomingCall').hide();
            $('#callControl').show();
            $('#callStatus').hide();
            $('#inCallButtons').hide();
            ringTone.pause();
        }
        if (session && session.isMuted().audio) {
            $('#muteIcon').addClass('fa-microphone-slash');
            $('#muteIcon').removeClass('fa-microphone');
        } else {
            $('#muteIcon').removeClass('fa-microphone-slash');
            $('#muteIcon').addClass('fa-microphone');
        }
    } else {
        $('#wrapper').hide();
        $('#errorMessage').show();
    }
}

window.onbeforeunload = function (event) {
    return false;
};