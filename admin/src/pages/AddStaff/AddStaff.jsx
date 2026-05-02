import React from "react";
import AdminLayout from "../../components/AdminLayout/AdminLayout";
import AddStaffPage from "../../components/AddStaffPage/AddStaffPage";

export default function AddStaff() {
  return (
    <AdminLayout
      title="Add Staff"
      subtitle="Create a service management staff account"
    >
      <AddStaffPage />
    </AdminLayout>
  );
}
