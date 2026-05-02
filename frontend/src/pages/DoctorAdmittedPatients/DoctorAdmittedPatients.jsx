import React from "react";
import Navbar from "../../doctor/Navbar/Navbar";
import AdmittedPatients from "../../doctor/AdmittedPatients/AdmittedPatients";

export default function DoctorAdmittedPatients() {
  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] text-[#0f172a]">
      <Navbar />
      <main className="min-h-[100dvh] min-w-0 overflow-x-hidden bg-[#f8fafc] lg:pl-[270px]">
        <AdmittedPatients />
      </main>
    </div>
  );
}
