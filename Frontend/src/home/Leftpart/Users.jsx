import React from "react";
import User from "./User";
import userGetAllUsers from "../../context/userGetAllUsers";

function Users() {
  const [allUsers, loading] = userGetAllUsers();
  return (
    <div>
      <h1 className="px-8 py-2 text-base-content font-semibold bg-base-200 rounded-md">
        Messages
      </h1>
      <div
        className="py-2 flex-1 overflow-y-auto"
        style={{ maxHeight: "calc(84vh - 10vh)" }}>
        {allUsers.map((user, index) => (
          <User key={index} user={user} />
        ))}
      </div>
    </div>
  );
}

export default Users;
