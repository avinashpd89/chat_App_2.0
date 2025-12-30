import express from "express";
import { signup, login, logout, allUsers, updateUser, updateOtherUser, deleteUser, addContact, removeContact, blockUser, publishKeys, fetchKeyBundle, getKeyCount } from "../controller/user.controller.js";
import secureRoute from "../middleware/secureRoute.js";

const router = express.Router()
router.post("/signup", signup)
router.post("/login", login)
router.post("/logout", logout)
router.get("/allusers", secureRoute, allUsers)
router.put("/update", secureRoute, updateUser)
router.put("/update/:id", secureRoute, updateOtherUser)
router.delete("/delete/:id", secureRoute, deleteUser)
router.post("/add", secureRoute, addContact)
router.post("/remove-contact", secureRoute, removeContact)
router.post("/block", secureRoute, blockUser)
// Signal Protocol Routes
router.post("/keys/publish", secureRoute, publishKeys);
router.get("/keys/count", secureRoute, getKeyCount);
router.get("/keys/fetch/:id", secureRoute, fetchKeyBundle);

export default router;