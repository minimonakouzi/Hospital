import React from "react";
import Navbar from "../../components/Navbar/Navbar";
import MedicalRecordsPage from "../../components/MedicalRecordsPage/MedicalRecordsPage";
import Footer from "../../components/Footer/Footer";

const MedicalRecords = () => {
  return (
    <div>
      <Navbar />
      <MedicalRecordsPage />
      <Footer />
    </div>
  );
};

export default MedicalRecords;
