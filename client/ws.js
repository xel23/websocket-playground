const wsConnection = new WebSocket('ws://localhost:9124');
let clientId;
let targetId = null;
let myPeerConnection = null;
let transceiver = null;
let webcamStream = null;

const mediaConstraints = {
    audio: true,
    video: {
        aspectRatio: {
            ideal: 1.333333
        }
    }
};

function sendToServer(msg) {
    const msgJSON = JSON.stringify(msg);

    wsConnection.send(msgJSON);
}

function closeVideoCall() {
    const localVideo = document.getElementById('local_video');

    console.log('Closing the call');

    if (myPeerConnection) {
        console.log('--> Closing the peer connection');

        myPeerConnection.ontrack = null;
        myPeerConnection.onnicecandidate = null;
        myPeerConnection.oniceconnectionstatechange = null;
        myPeerConnection.onsignalingstatechange = null;
        myPeerConnection.onicegatheringstatechange = null;
        myPeerConnection.onnotificationneeded = null;

        myPeerConnection.getTransceivers().forEach(transceiver => {
            transceiver.stop();
        });

        if (localVideo.srcObject) {
            localVideo.pause();
            localVideo.srcObject.getTracks().forEach(track => {
                track.stop();
            });
        }

        myPeerConnection.close();
        myPeerConnection = null;
        webcamStream = null;
    }

    document.getElementById('hangup-button').disabled = true;
    targetId = null;
}

function handleUserlistMsg(msg) {
    const listElem = document.querySelector('.userlistbox');

    while (listElem.firstChild) {
        listElem.removeChild(listElem.firstChild);
    }

    msg.users.forEach(function(username) {
        const item = document.createElement("li");
        item.appendChild(document.createTextNode(username));
        item.addEventListener("click", invite, false);

        listElem.appendChild(item);
    });
}

function hangUpCall() {
    closeVideoCall();

    sendToServer({
        target: targetId,
        type: 'hang-up'
    });
}

async function handleNegotiationNeededEvent() {
    console.log('*** Negotiation needed');

    try {
        console.log('---> Creating offer');
        const offer = await myPeerConnection.createOffer();

        if (myPeerConnection.signalingState !== 'stable') {
            console.log('     -- The connection isn\'t stable yet; postponing...')
            return;
        }

        console.log('---> Setting local description to the offer');
        await myPeerConnection.setLocalDescription(offer);

        console.log('---> Sending the offer to the remote peer', clientId);
        sendToServer({
            clientId,
            target: targetId,
            type: 'video-offer',
            sdp: myPeerConnection.localDescription
        });
    } catch(err) {
        console.log('*** The following error occurred while handling the negotiationneeded event:');
        reportError(err);
    }
}

function handleTrackEvent(event) {
    console.log('*** Track event');
    document.getElementById('received_video').srcObject = event.streams[0];
    document.getElementById('hangup-button').disabled = false;
}

function handleICECandidateEvent(event) {
    if (event.candidate) {
        console.log('*** Outgoing ICE candidate: ' + event.candidate.candidate);

        sendToServer({
            type: 'new-ice-candidate',
            target: targetId,
            candidate: event.candidate
        });
    }
}

function handleICEConnectionStateChangeEvent() {
    console.log('*** ICE connection state changed to ' + myPeerConnection.iceConnectionState);

    switch(myPeerConnection.iceConnectionState) {
        case 'closed':
        case 'failed':
        case 'disconnected':
            closeVideoCall();
            break;
    }
}

function handleSignalingStateChangeEvent() {
    console.log('*** WebRTC signaling state changed to: ' + myPeerConnection.signalingState);
    switch(myPeerConnection.signalingState) {
        case 'have-remote-offer': {
            if (myPeerConnection.msg) {
                handleVideoOfferMsg(myPeerConnection.msg);
            }
            break;
        }
        case 'closed':
            closeVideoCall();
            break;
    }
}

function handleICEGatheringStateChangeEvent() {
    console.log('*** ICE gathering state changed to: ' + myPeerConnection.iceGatheringState);
}

function createPeerConnection() {
    console.log('Setting up a connection...');
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: 'turn:localhost:7788',
                username: 'webrtc',
                credential: 'turnserver'
            }
        ]
    });

    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
    myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
    myPeerConnection.ontrack = handleTrackEvent;
}

function handleHangUpMsg(msg) {
    console.log("*** Received hang up notification from other peer");
    closeVideoCall();
}

wsConnection.onopen = function() {
    console.log('Connected');
};

wsConnection.onclose = function(event) {
    if (event.wasClean) {
        console.log('Connected was closed clean');
    } else {
        console.log('Connection refused');
    }
    console.log('Code: ' + event.code + ' reason: ' + event.reason);
};

wsConnection.onerror = function(error) {
    console.log('Error', error.message);
};

wsConnection.onmessage = async(event) => {
    const data = await new Response(event.data).json();
    switch (data.type) {
        case 'id': {
            console.log('set id');
            const userList = document.getElementById('userlistbox');
            const newUser = document.createElement('li');
            newUser.innerText = data.id;
            if (!clientId) {
                clientId = data.id;
            }
            newUser.addEventListener("click", invite, false);
            userList.appendChild(newUser);
            break;
        }

        case 'userlist': {
            handleUserlistMsg(data);
            break;
        }

        case 'video-offer': {
            handleVideoOfferMsg(data);
            break;
        }

        case 'video-answer': {
            handleVideoAnswerMsg(data);
            break;
        }

        case 'new-ice-candidate': {
            handleNewICECandidateMsg(data);
            break;
        }
        case 'hang-up': {
            handleHangUpMsg(data);
            break;
        }
    }
}

async function invite(evt) {
    console.log('Starting to prepare an invitation');
    if (myPeerConnection) {
        alert('You can\'t start a call because you already have one open!');
    } else {
        const clickedId = evt.target.textContent;

        if (clickedId === clientId) {
            alert('I\'m afraid I can\'t let you talk to yourself. That would be weird.');
            return;
        }
        targetId = clickedId;
        console.log('Inviting user ' + targetId);

        console.log('Setting up connection to invite user: ' + targetId);
        createPeerConnection();

        try {
            webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            document.getElementById('local_video').srcObject = webcamStream;
        } catch(err) {
            handleGetUserMediaError(err);
            return;
        }

        try {
            webcamStream.getTracks().forEach(
                transceiver = track => myPeerConnection.addTransceiver(track, {streams: [webcamStream]})
            );
        } catch(err) {
            handleGetUserMediaError(err);
        }
    }
}

async function handleVideoOfferMsg(msg) {
    targetId = msg.clientId;

    console.log('Received video chat offer from ' + targetId);
    if (!myPeerConnection) {
        createPeerConnection();
    }

    const desc = new RTCSessionDescription(msg.sdp);

    if (myPeerConnection.signalingState !== 'stable') {
        myPeerConnection.lastMsg = msg;
        console.log('  - But the signaling state isn\'t stable, so triggering rollback');
        try {
            await Promise.all([
                myPeerConnection.setLocalDescription({type: 'rollback'}),
                myPeerConnection.setRemoteDescription(desc)
            ]);
        } catch (e){}
        return;
    } else {
        console.log ('  - Setting remote description');
        await myPeerConnection.setRemoteDescription(desc);
    }

    if (!webcamStream) {
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        } catch(err) {
            handleGetUserMediaError(err);
            return;
        }

        document.getElementById('local_video').srcObject = webcamStream;

        try {
            webcamStream.getTracks().forEach(
                transceiver = track => myPeerConnection.addTransceiver(track, {streams: [webcamStream]})
            );
        } catch(err) {
            handleGetUserMediaError(err);
        }
    }

    console.log('---> Creating and sending answer to caller');

    await myPeerConnection.setLocalDescription(await myPeerConnection.createAnswer()).catch(e => console.error(e));

    sendToServer({
        target: targetId,
        type: 'video-answer',
        sdp: myPeerConnection.localDescription
    });
}

async function handleVideoAnswerMsg(msg) {
    console.log('*** Call recipient has accepted our call');
    const desc = new RTCSessionDescription(msg.sdp);
    await myPeerConnection.setRemoteDescription(desc).catch(reportError);
}

async function handleNewICECandidateMsg(msg) {
    const candidate = new RTCIceCandidate(msg.candidate);

    console.log('*** Adding received ICE candidate: ' + JSON.stringify(candidate));
    try {
        await myPeerConnection.addIceCandidate(candidate)
    } catch(err) {
        reportError(err);
    }
}

function handleGetUserMediaError(e) {
    console.error(e);
    switch(e.name) {
        case 'NotFoundError':
            alert('Unable to open your call because no camera and/or microphone were found.');
            break;
        case 'SecurityError':
        case 'PermissionDeniedError':
            break;
        default:
            alert('Error opening your camera and/or microphone: ' + e.message);
            break;
    }

    closeVideoCall();
}

function reportError(errMessage) {
    console.error(`Error ${errMessage.name}: ${errMessage.message}`);
}
