import React from "react";
import Navbar from "../../doctor/Navbar/Navbar";
import ListPage from "../../doctor/ListPage/ListPage";

const List = () => {
  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc]">
      <div className="flex h-full">
        <div className="shrink-0">
          <Navbar />
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <ListPage />
        </main>
      </div>
    </div>
  );
};

export default List;
