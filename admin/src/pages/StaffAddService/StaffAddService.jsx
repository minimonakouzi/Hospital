import React from "react";
import AddService from "../../components/AddService/AddService";
import { StaffPageHeader } from "../../staff/StaffLayout/StaffLayout";

export default function StaffAddService() {
  return (
    <div>
      <StaffPageHeader
        title="Add Service"
        subtitle="Create a hospital service for patient booking."
      />
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <AddService authMode="staff" embedded />
      </div>
    </div>
  );
}
