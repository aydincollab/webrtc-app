// Socket.io baglantisi
const socket = io();

// DOM elementleri
const joinScreen = document.getElementById('joinScreen');
const chatScreen = document.getElementById('chatScreen');
const usernameInput = document.getElementById('username');
const roomIdInput = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const toggleAudioBtn = document.getElementById('toggleAudio');
const toggleVideoBtn = document.getElementById('toggleVideo');
const leaveBtn = document.getElementById('leaveBtn');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessage');
const messagesContainer = document.getElementById('messages');
const typingIndicator = document.getElementById('typingIndicator');

// WebRTC degiskenleri
let localStream;
let peerConnection;
let isAudioEnabled = true;
let isVideoEnabled = true;
let typingTimeout;
const TYPING_TIMER_LENGTH = 1000;

// Notification System
function showNotification(message, type = 'success') {
    const container = document.querySelector('.notification-container');
    
    if (!container) {
        console.error('Notification container bulunamadi!');
        alert(message);
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = document.createElement('i');
    icon.className = type === 'success' 
        ? 'fas fa-check-circle'
        : 'fas fa-exclamation-circle';
    
    const text = document.createElement('span');
    text.className = 'notification-text';
    text.textContent = message;
    
    notification.appendChild(icon);
    notification.appendChild(text);
    container.appendChild(notification);

    setTimeout(() => {
        notification.addEventListener('animationend', () => {
            if (notification.parentNode) {
                notification.remove();
            }
        });
    }, 3000);
}

// Mesaj ekleme fonksiyonu
function addMessage(username, content, isSent = false, isSystem = false) {
    const messageDiv = document.createElement('div');
    
    if (isSystem) {
        messageDiv.className = 'system-message';
        messageDiv.textContent = content;
    } else {
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const usernameSpan = document.createElement('div');
        usernameSpan.className = 'username';
        usernameSpan.textContent = username;
        
        const contentSpan = document.createElement('div');
        contentSpan.className = 'content';
        contentSpan.textContent = content;
        
        messageDiv.appendChild(usernameSpan);
        messageDiv.appendChild(contentSpan);
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// RTC yapilandirmasi
const rtcConfig = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302'
            ]
        }
    ]
};

// Medya kisitlamalari
const mediaConstraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    },
    video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 1.7777777778 },
        facingMode: 'user'
    }
};

// Yardimci fonksiyonlar
function showScreen(screenId) {
    joinScreen.classList.add('hidden');
    chatScreen.classList.add('hidden');
    document.getElementById(screenId).classList.remove('hidden');
}

// Medya yonetimi
async function initializeMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        localVideo.srcObject = localStream;
        return true;
    } catch (error) {
        console.error('Medya erisim hatasi:', error);
        showNotification('Kamera veya mikrofon erisimi reddedildi!', 'error');
        return false;
    }
}

function updateMediaStatus(type, enabled) {
    const button = type === 'audio' ? toggleAudioBtn : toggleVideoBtn;
    const icon = button.querySelector('i');
    
    if (type === 'audio') {
        icon.className = enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
        const localMicStatus = localVideo.parentElement.querySelector('.mic-status i');
        if (localMicStatus) {
            localMicStatus.className = enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
            localMicStatus.parentElement.style.background = enabled ? 
                'rgba(33, 150, 243, 0.5)' : 
                'rgba(244, 67, 54, 0.5)';
        }
    } else {
        icon.className = enabled ? 'fas fa-video' : 'fas fa-video-slash';
        const localVideoStatus = localVideo.parentElement.querySelector('.video-status i');
        if (localVideoStatus) {
            localVideoStatus.className = enabled ? 'fas fa-video' : 'fas fa-video-slash';
            localVideoStatus.parentElement.style.background = enabled ? 
                'rgba(33, 150, 243, 0.5)' : 
                'rgba(244, 67, 54, 0.5)';
        }
    }

    socket.emit('mediaState', { type, enabled });
}

// Event Listeners
joinBtn.addEventListener('click', async () => {
    try {
        const username = usernameInput.value.trim();
        const roomId = roomIdInput.value.trim();

        if (!username || !roomId) {
            showNotification('Lutfen tum alanlari doldurun!', 'error');
            return;
        }

        if (roomId !== '1234') {
            showNotification('Yanlis Oda ID!', 'error');
            return;
        }

        if (await initializeMedia()) {
            socket.emit('joinRoom', { roomId, username });
            showNotification('Giris basarili!', 'success');
            showScreen('chatScreen');
        }
    } catch (error) {
        console.error('Join error:', error);
        showNotification('Bir hata olustu!', 'error');
    }
});

function toggleMedia(type) {
    const tracks = localStream.getTracks().filter(track => track.kind === type);
    tracks.forEach(track => {
        track.enabled = !track.enabled;
    });

    if (type === 'audio') {
        isAudioEnabled = !isAudioEnabled;
        updateMediaStatus('audio', isAudioEnabled);
    } else {
        isVideoEnabled = !isVideoEnabled;
        updateMediaStatus('video', isVideoEnabled);
    }
}

// WebRTC fonksiyonlari
async function createPeerConnection() {
    try {
        peerConnection = new RTCPeerConnection(rtcConfig);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    targetId: remoteVideo.dataset.userId
                });
            }
        };

        return peerConnection;
    } catch (error) {
        console.error('Peer baglantisi olusturma hatasi:', error);
        throw error;
    }
}

// Mesajlasma ve Typing Indicator
messageInput.addEventListener('input', () => {
    if (!typingTimeout) {
        socket.emit('typing', { isTyping: true });
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('typing', { isTyping: false });
        typingTimeout = null;
    }, TYPING_TIMER_LENGTH);
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessageBtn.click();
    }
});

sendMessageBtn.addEventListener('click', () => {
    const content = messageInput.value.trim();
    if (content) {
        socket.emit('message', {
            content,
            username: usernameInput.value.trim()
        });
        addMessage(usernameInput.value.trim(), content, true);
        messageInput.value = '';
    }
});

// Button Event Listeners
toggleAudioBtn.addEventListener('click', () => toggleMedia('audio'));
toggleVideoBtn.addEventListener('click', () => toggleMedia('video'));

leaveBtn.addEventListener('click', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
    socket.disconnect();
    window.location.reload();
});

// Socket Events
socket.on('joinResponse', async (data) => {
    if (data.success) {
        updateMediaStatus('audio', isAudioEnabled);
        updateMediaStatus('video', isVideoEnabled);

        if (data.currentUsers.length > 1) {
            const otherUser = data.currentUsers.find(user => user.id !== socket.id);
            if (otherUser) {
                try {
                    await createPeerConnection();
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);

                    socket.emit('offer', {
                        offer,
                        targetId: otherUser.id,
                        username: usernameInput.value.trim()
                    });

                    remoteVideo.dataset.userId = otherUser.id;
                    const nameTag = remoteVideo.parentElement.querySelector('.name-tag');
                    if (nameTag) nameTag.textContent = otherUser.username;
                } catch (error) {
                    console.error('Connection error:', error);
                }
            }
        }
    }
});

socket.on('userJoined', ({ userId, username }) => {
    const nameTag = remoteVideo.parentElement.querySelector('.name-tag');
    if (nameTag) nameTag.textContent = username;
    addMessage(null, `${username} odaya katıldı`, false, true);
});

socket.on('userLeft', ({ userId, username }) => {
    if (remoteVideo.dataset.userId === userId) {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        
        remoteVideo.srcObject = null;
        remoteVideo.dataset.userId = '';
        
        const nameTag = remoteVideo.parentElement.querySelector('.name-tag');
        if (nameTag) nameTag.textContent = 'Bekleniyor...';
        
        const micStatus = remoteVideo.parentElement.querySelector('.mic-status i');
        const videoStatus = remoteVideo.parentElement.querySelector('.video-status i');
        
        if (micStatus) {
            micStatus.className = 'fas fa-microphone-slash';
            micStatus.parentElement.style.background = 'rgba(244, 67, 54, 0.5)';
        }
        
        if (videoStatus) {
            videoStatus.className = 'fas fa-video-slash';
            videoStatus.parentElement.style.background = 'rgba(244, 67, 54, 0.5)';
        }
    }
    addMessage(null, `${username} odadan ayrıldı`, false, true);
});

socket.on('offer', async ({ offer, sender, username }) => {
    try {
        await createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('answer', {
            answer,
            targetId: sender
        });

        remoteVideo.dataset.userId = sender;
        const nameTag = remoteVideo.parentElement.querySelector('.name-tag');
        if (nameTag) nameTag.textContent = username;
    } catch (error) {
        console.error('Offer handling error:', error);
    }
});

socket.on('answer', async ({ answer }) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
        console.error('Answer handling error:', error);
    }
});

socket.on('ice-candidate', async ({ candidate }) => {
    try {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    } catch (error) {
        console.error('ICE candidate error:', error);
    }
});

socket.on('message', ({ sender, content, system }) => {
    if (system) {
        addMessage(null, content, false, true);
    } else {
        addMessage(sender, content, sender === usernameInput.value.trim());
    }
});

socket.on('typing', ({ username, isTyping }) => {
    if (isTyping) {
        typingIndicator.textContent = `${username} yazıyor...`;
        typingIndicator.classList.add('active');
    } else {
        typingIndicator.classList.remove('active');
    }
});

socket.on('mediaState', ({ userId, type, enabled }) => {
    if (remoteVideo.dataset.userId === userId) {
        const statusElement = remoteVideo.parentElement.querySelector(
            type === 'audio' ? '.mic-status i' : '.video-status i'
        );

        if (statusElement) {
            statusElement.className = enabled ? 
                `fas fa-${type}` : 
                `fas fa-${type}-slash`;
            
            statusElement.parentElement.style.background = enabled ? 
                'rgba(33, 150, 243, 0.5)' : 
                'rgba(244, 67, 54, 0.5)';
        }
    }
});

// Sayfa yenileme/kapatma kontrolu
window.addEventListener('beforeunload', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
    socket.disconnect();
});