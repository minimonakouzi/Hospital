import React from "react";
import Navbar from "../../doctor/Navbar/Navbar";
import EditProfilePage from "../../doctor/EditProfilePage/EditProfilePage";

const EditProfile = () => {
  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] text-[#0f172a]">
      <Navbar />
      <main className="min-h-[100dvh] min-w-0 overflow-x-hidden bg-[#f8fafc] lg:pl-[270px]">
        <EditProfilePage />
      </main>
    </div>
  );
};

export default EditProfile;
