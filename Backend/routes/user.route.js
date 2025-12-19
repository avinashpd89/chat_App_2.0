import express from "express";
import { signup, login, logout, allUsers, updateUser, updateOtherUser, deleteUser, addContact, removeContact, blockUser } from "../controller/user.controller.js";
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

export default router;