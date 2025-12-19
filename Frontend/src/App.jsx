import React from "react";
import Left from "./home/Leftpart/Left";
import Right from "./home/Rightpart/Right";
import Signup from "./components/Signup";
import Login from "./components/Login";
import { useAuth } from "./context/Authprovider";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import CallInterface from "./components/CallInterface";

import useConversation from "./zustand/useConversation.js";

function App() {
  const [authUser, setAuthUser] = useAuth();
  const { selectedConversation } = useConversation();

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              authUser ? (
                <div className="flex h-[100dvh] overflow-hidden">
                  {/* Left Part: User List */}
                  <div
                    className={`w-full md:w-[350px] bg-black ${
                      selectedConversation ? "hidden md:block" : "block"
                    }`}>
                    <Left />
                  </div>

                  {/* Right Part: Chat */}
                  <div
                    className={`flex-1 min-w-0 bg-slate-900 ${
                      !selectedConversation ? "hidden md:block" : "block"
                    }`}>
                    <Right />
                  </div>
                </div>
              ) : (
                <Navigate to={"/login"} />
              )
            }
          />
          <Route
            path="/login"
            element={authUser ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/signup"
            element={authUser ? <Navigate to="/" /> : <Signup />}
          />
        </Routes>
        <CallInterface />
      </BrowserRouter>
      <Toaster />
    </>
  );
}

export default App;
