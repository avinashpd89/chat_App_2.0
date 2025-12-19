import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";


import userRoute from "./routes/user.route.js";
import messageRoute from "./routes/message.route.js";
import { app, server as socketServer } from "./SocketIO/server.js";


dotenv.config();

// middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(cors());

app.use("/api/user", userRoute);
app.use("/api/message", messageRoute);

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("DB Connection Successful");
    })
    .catch((err) => {
        console.log(err.message);
    });

const server = socketServer.listen(process.env.PORT, () => {
    console.log(`Server Started on Port ${process.env.PORT}`);
}); 