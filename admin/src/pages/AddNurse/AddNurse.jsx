import React from "react";
import AdminLayout from "../../components/AdminLayout/AdminLayout";
import AddNursePage from "../../components/AddNursePage/AddNursePage";

export default function AddNurse() {
  return (
    <AdminLayout
      title="Add Nurse"
      subtitle="Create a demo nurse profile without backend integration"
    >
      <AddNursePage />
    </AdminLayout>
  );
}
