import React from "react";
import ListServicePage from "../../components/ListServicePage/ListServicePage";
import { StaffPageHeader } from "../../staff/StaffLayout/StaffLayout";

export default function StaffServices() {
  return (
    <div>
      <StaffPageHeader
        title="Services"
        subtitle="View, update, and manage hospital service offerings."
      />
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <ListServicePage authMode="staff" canEdit canDelete embedded />
      </div>
    </div>
  );
}
