import express from "express";
import { getMessage, sendMessage, deleteChat, clearChat, deleteMessage, createGroup, updateGroup, addMemberToGroup, leaveGroup, deleteGroup, markAsRead } from "../controller/message.controller.js";
import secureRoute from "../middleware/secureRoute.js";

const router = express.Router()
router.post("/create-group", secureRoute, createGroup)
router.put("/update-group/:id", secureRoute, updateGroup)
router.put("/add-member/:id", secureRoute, addMemberToGroup)
router.put("/leave-group/:id", secureRoute, leaveGroup)
router.delete("/delete-group/:id", secureRoute, deleteGroup)
router.put("/markAsRead/:id", secureRoute, markAsRead)
router.post("/send/:id", secureRoute, sendMessage)
router.get("/get/:id", secureRoute, getMessage)
router.delete("/delete/:id", secureRoute, deleteChat)
router.post("/clear/:id", secureRoute, clearChat)
router.delete("/deleteMessage/:id", secureRoute, deleteMessage);

export default router;