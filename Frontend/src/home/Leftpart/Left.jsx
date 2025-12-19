import React from "react";
import Search from "./Search.jsx";
import Users from "./Users.jsx";
import Self from "./Self.jsx";

function Left() {
  return (
    <div className="w-full h-full bg-base-300 text-base-content flex flex-col">
      <Search />

      <div className="flex-1 overflow-y-auto">
        <Users />
      </div>
      <Self />
    </div>
  );
}

export default Left;
