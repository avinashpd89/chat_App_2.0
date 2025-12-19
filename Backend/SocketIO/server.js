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
        const { userToCall, signalData, from, name } = data;
        if (users[userToCall]) {
            console.log("Target user found, emitting callUser to:", users[userToCall]);
            io.to(users[userToCall]).emit("callUser", { signal: signalData, from, name });
        } else {
            console.log("Target user NOT found in users list:", userToCall);
            console.log("Current online users:", Object.keys(users));
        }
    });

    socket.on("answerCall", (data) => {
        console.log("Server received answerCall event to:", data.to);
        if (users[data.to]) {
            io.to(users[data.to]).emit("callAccepted", data.signal);
        } else {
            console.log("Target user for answer NOT found:", data.to);
        }
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

    // used to listen client side events emitted by server side (server & client)
    socket.on("disconnect", () => {
        console.log("a user disconnected", socket.id);
        delete users[userId];
        io.emit("getOnlineUsers", Object.keys(users));
    })
})

export { app, io, server }