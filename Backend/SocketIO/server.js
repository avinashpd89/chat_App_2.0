import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3001",
        methods: ["GET", "POST"],
    }
})

// realtime message
export const getReceiverSocketId = (receiverId) => {
    return users[receiverId]
}

const users = {}
// Track active group calls: { roomId: [{ socketId, userId, name }] }
const groupCalls = {}

// used to listen events on server side.
io.on("connection", (socket) => {
    console.log("a user connected", socket.id);
    const userId = socket.handshake.query.userId;
    if (userId) {
        users[userId] = socket.id
        console.log("Hello", users)
    }
    // used to send the events to all connected users
    io.emit("getOnlineUsers", Object.keys(users));

    socket.on("callUser", (data) => {
        console.log("Server received callUser event:", data.from, "calling", data.userToCall);
        const { userToCall, signalData, from, name, callType } = data;
        if (users[userToCall]) {
            console.log("Target user found, emitting callUser to:", users[userToCall], "Type:", callType);
            io.to(users[userToCall]).emit("callUser", { signal: signalData, from, name, callType });
        } else {
            console.log("Target user NOT found in users list:", userToCall);
            console.log("Current online users:", Object.keys(users));
        }
    });

    socket.on("answerCall", (data) => {
        console.log("Server received answerCall event to:", data.to);
        // data.to is already a socket ID from the client (call.from)
        io.to(data.to).emit("callAccepted", data.signal);
    });

    socket.on("rejectCall", (data) => {
        console.log("Server received rejectCall event to:", data.to);
        // data.to is already a socket ID from the client (call.from)
        io.to(data.to).emit("callRejected");
    });

    socket.on("endCall", (data) => {
        console.log("Server received endCall event to:", data.to);
        let targetSocketId = data.to;
        if (users[data.to]) {
            targetSocketId = users[data.to];
        }
        io.to(targetSocketId).emit("callEnded");
    });

    socket.on("start-group-call", (data) => {
        const { roomId, userId, name, callType, members } = data;
        console.log(`User ${name} (${userId}) starting group call in room ${roomId}, type: ${callType}`);

        // Initialize room if it doesn't exist
        if (!groupCalls[roomId]) {
            groupCalls[roomId] = [];
        }

        // Add initiator to room if not already present
        const isAlreadyInRoom = groupCalls[roomId].some(p => p.socketId === socket.id);
        if (!isAlreadyInRoom) {
            groupCalls[roomId].push({ socketId: socket.id, userId, name });
        }
        
        socket.join(roomId);

        // Notify all online group members about the call
        if (members && Array.isArray(members)) {
            members.forEach(memberId => {
                // Don't signal self
                if (users[memberId] && memberId !== userId) {
                    io.to(users[memberId]).emit("group-call-invitation", {
                        roomId,
                        callType,
                        callerName: name,
                        callerId: userId,
                        participants: groupCalls[roomId] // Send current participants (initiator)
                    });
                }
            });
        }
    });

    socket.on("join-group-call", (data) => {
        const { roomId, userId, name } = data;
        console.log(`User ${name} (${userId}) joining group call room ${roomId}`);

        if (!groupCalls[roomId]) {
            groupCalls[roomId] = [];
        }

        // Check if user is already in the room to avoid duplicates
        const existingParticipantIndex = groupCalls[roomId].findIndex(p => p.socketId === socket.id);
        if (existingParticipantIndex !== -1) {
             // Update info if needed, or just warn
             console.log(`User ${userId} already in room ${roomId}, updating info.`);
             groupCalls[roomId][existingParticipantIndex] = { socketId: socket.id, userId, name };
        } else {
             // Add new participant to room
             groupCalls[roomId].push({ socketId: socket.id, userId, name });
        }
        
        socket.join(roomId);

        // Get OTHER participants to connect to
        const otherParticipants = groupCalls[roomId].filter(p => p.socketId !== socket.id).map(p => ({
            socketId: p.socketId,
            userId: p.userId,
            name: p.name
        }));

        // Send existing participants to the new joiner
        socket.emit("existing-participants", { participants: otherParticipants });

        // Notify existing participants about new joiner
        socket.to(roomId).emit("user-joined-call", {
            socketId: socket.id,
            userId,
            name
        });
    });

    socket.on("signal-to-peer", (data) => {
        const { targetSocketId, signal, callerId, callerName } = data;
        // console.log(`Relaying signal from ${socket.id} to ${targetSocketId}`);
        io.to(targetSocketId).emit("peer-signal", {
            signal,
            callerId,
            callerName,
            socketId: socket.id
        });
    });

    socket.on("leave-group-call", (data) => {
        const { roomId, userId } = data;
        console.log(`User ${userId} leaving group call room ${roomId}`);

        if (groupCalls[roomId]) {
            groupCalls[roomId] = groupCalls[roomId].filter(p => p.socketId !== socket.id);

            // Notify others in the room BEFORE deleting if empty (though no one left to notify if empty)
            socket.to(roomId).emit("user-left-call", { socketId: socket.id, userId });
            socket.leave(roomId);

            // If room is empty, delete it
            if (groupCalls[roomId].length === 0) {
                delete groupCalls[roomId];
                console.log(`Room ${roomId} is empty and deleted.`);
            }
        }
    });

    // used to listen client side events emitted by server side (server & client)
    socket.on("disconnect", () => {
        console.log("a user disconnected", socket.id);
        delete users[userId];

        // Remove from any active group calls
        Object.keys(groupCalls).forEach(roomId => {
            const participant = groupCalls[roomId].find(p => p.socketId === socket.id);
            if (participant) {
                groupCalls[roomId] = groupCalls[roomId].filter(p => p.socketId !== socket.id);

                if (groupCalls[roomId].length === 0) {
                    delete groupCalls[roomId];
                } else {
                    io.to(roomId).emit("user-left-call", {
                        socketId: socket.id,
                        userId: participant.userId
                    });
                }
            }
        });

        io.emit("getOnlineUsers", Object.keys(users));
    })
})

export { app, io, server }