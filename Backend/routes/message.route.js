import express from "express";
import { getMessage, sendMessage, deleteChat, clearChat, deleteMessage } from "../controller/message.controller.js";
import secureRoute from "../middleware/secureRoute.js";

const router = express.Router()
router.post("/send/:id", secureRoute, sendMessage)
router.get("/get/:id", secureRoute, getMessage)
router.delete("/delete/:id", secureRoute, deleteChat)
router.post("/clear/:id", secureRoute, clearChat)
router.delete("/deleteMessage/:id", secureRoute, deleteMessage);

export default router;