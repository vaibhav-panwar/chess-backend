//url params
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const username = urlParams.get("username");
const room = urlParams.get("room");

//video call
const APP_ID = '0310e67038924aeebf23bb827ed2b0c3';

let token = null;
let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;

let localStream;
let remoteStream;
let peerConnection;
const servers = {
    iceServers: [
        { urls: ['stun:stun1.1.google.com:19302', 'stun:stun2.1.google.com:19302'] }
    ]
}

let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID);
    await client.login({ uid, token });

    channel = client.createChannel(room);
    await channel.join();
    console.log(client)
    channel.on('MemberJoined', handleUserJoined);
    channel.on('MemberLeft', handleUserLeft);
    client.on('MessageFromPeer', handleMessageFromPeer);

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("user1").srcObject = localStream;

}

let handleUserLeft = () => {

}

let handleUserJoined = async (memberId) => {
    console.log('new user joined', memberId);
    createOffer(memberId)

}

let handleMessageFromPeer = async (message, memberId) => {
    message = JSON.parse(message.text)
    if (message.type === "offer") {
        createAnswer(memberId, message.offer)
    }

    if (message.type === "answer") {
        addAnswer(message.answer)
    }

    if (message.type === "candidate") {
        if (peerConnection) {
            peerConnection.addIceCandidate(message.candidate);
        }
    }
}

let createPeerConnection = async (memberId) => {
    peerConnection = new RTCPeerConnection(servers)

    remoteStream = new MediaStream()
    document.getElementById('user2').srcObject = remoteStream;

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById("user1").srcObject = localStream;
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }) }, memberId)
        }
    }

}

let createOffer = async (memberId) => {
    await createPeerConnection(memberId);

    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, memberId)
}

let createAnswer = async (memberId, offer) => {
    await createPeerConnection(memberId)

    await peerConnection.setRemoteDescription(offer);

    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'answer', 'answer': answer }) }, memberId)
}

let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer);
    }
}
let leaveChannel = async () => {
    await channel.leave();
    await client.logout();

}

let toggleCamera = async () => {
    let videoTrack = localStream.getTracks().find(track => track.kind === 'video');
    if (videoTrack.enabled) {
        videoTrack.enabled = false;
    }
    else {
        videoTrack.enabled = true;
    }
}

let toggleMic = async () => {
    let audioTrack = localStream.getTracks().find(track => track.kind === 'audio');
    if (audioTrack.enabled) {
        audioTrack.enabled = false;
    }
    else {
        audioTrack.enabled = true;
    }
}

document.getElementById("camera").addEventListener('click', toggleCamera);
document.getElementById("mic").addEventListener('click', toggleMic);

window.addEventListener('beforeunload', leaveChannel);

init();



const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
//chess move
var board;
var game;

window.onload = function () {
    initGame();
};

var initGame = function () {
    var cfg = {
        draggable: true,
        position: 'start',
        onDrop: handleMove,
    };

    board = new ChessBoard('gameBoard', cfg);
    game = new Chess();
};

var handleMove = function (source, target) {
    var move = game.move({ from: source, to: target });

    if (move === null) return 'snapback';
};
//getting query params



const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

const socket = io();

//emitting room name
socket.emit('join-room', { username, room });

var handleMove = function (source, target) {
    var move = game.move({ from: source, to: target });

    if (move === null) return 'snapback';
    else socket.emit('move', move);

};

socket.on('move', function (msg) {
    game.move(msg);
    board.position(game.fen()); // fen is the board layout
});

chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = e.target.elements.msg.value;
    socket.emit('chatMsg', msg);

    //Clear input
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
})
socket.on('roomUsers',({room,users})=>{
    outputRoomName(room);
    outputUsers(users);
})
socket.on('message', (data) => {
    console.log(data);
    appendMsg(data);

    //Scroll Down
    chatMessages.scrollTop = chatMessages.scrollHeight


})

function appendMsg(msg) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<p class="meta">${msg.username}<span>${msg.time}</span></p>
						<p class="text">
							${msg.message}
						</p>`
    document.querySelector('.chat-messages').appendChild(div);

}

function outputRoomName(room) {
    roomName.innerText = room
}
function outputUsers(users){
    userList.innerHTML = `${users.map(user=>`<li>${user.username}</li>`).join('')}`
}