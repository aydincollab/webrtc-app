const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const users = new Map();
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı');

    socket.on('joinRoom', ({ roomId, username }) => {
        socket.join(roomId);
        users.set(socket.id, { username, roomId });

        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(socket.id);

        const currentUsers = Array.from(rooms.get(roomId)).map(id => ({
            id,
            username: users.get(id).username
        }));

        socket.emit('joinResponse', {
            success: true,
            currentUsers
        });

        socket.to(roomId).emit('userJoined', {
            userId: socket.id,
            username
        });
    });

    // WebRTC sinyal işlemleri
    socket.on('offer', ({ offer, targetId, username }) => {
        socket.to(targetId).emit('offer', {
            offer,
            sender: socket.id,
            username
        });
    });

    socket.on('answer', ({ answer, targetId }) => {
        socket.to(targetId).emit('answer', {
            answer,
            sender: socket.id
        });
    });

    socket.on('ice-candidate', ({ candidate, targetId }) => {
        socket.to(targetId).emit('ice-candidate', {
            candidate,
            sender: socket.id
        });
    });

    // Mesajlaşma - Düzeltildi
    socket.on('message', ({ content, username }) => {
        const user = users.get(socket.id);
        if (user) {
            // Sadece diğer kullanıcılara gönder, gönderen kendi mesajını client-side'da gösterecek
            socket.to(user.roomId).emit('message', {
                sender: username,
                content: content,
                system: false
            });
        }
    });

    socket.on('typing', ({ isTyping }) => {
        const user = users.get(socket.id);
        if (user) {
            socket.to(user.roomId).emit('typing', {
                username: user.username,
                isTyping
            });
        }
    });

    socket.on('mediaState', ({ type, enabled }) => {
        const user = users.get(socket.id);
        if (user) {
            socket.to(user.roomId).emit('mediaState', {
                userId: socket.id,
                type,
                enabled
            });
        }
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            const { roomId, username } = user;
            const room = rooms.get(roomId);
            
            if (room) {
                room.delete(socket.id);
                if (room.size === 0) {
                    rooms.delete(roomId);
                }
            }

            socket.to(roomId).emit('userLeft', {
                userId: socket.id,
                username
            });

            users.delete(socket.id);
        }
        console.log('Bir kullanıcı ayrıldı');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server ${PORT} portunda calisiyor`);
});