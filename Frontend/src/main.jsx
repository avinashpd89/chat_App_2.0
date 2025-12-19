import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { Authprovider } from "./context/Authprovider.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { CallProvider } from "./context/CallProvider.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Authprovider>
      <SocketProvider>
        <CallProvider>
          <App />
        </CallProvider>
      </SocketProvider>
    </Authprovider>
  </React.StrictMode>
);
