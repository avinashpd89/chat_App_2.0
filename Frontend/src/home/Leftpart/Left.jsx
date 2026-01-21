import React, { useState, useEffect } from "react";
import Search from "./Search.jsx";
import Users from "./Users.jsx";
import Self from "./Self.jsx";

function Left() {
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const handleFilterChange = (event) => {
      setFilterType(event.detail);
    };

    window.addEventListener("changeFilter", handleFilterChange);
    return () => window.removeEventListener("changeFilter", handleFilterChange);
  }, []);

  return (
    <div className="w-full h-full bg-base-300 text-base-content flex flex-col">
      <Search onFilterChange={setFilterType} />

      <div className="flex-1 overflow-y-auto">
        <Users filterType={filterType} />
      </div>
      <Self />
    </div>
  );
}

export default Left;
