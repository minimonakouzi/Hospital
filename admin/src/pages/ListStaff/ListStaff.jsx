import React from "react";
import AdminLayout from "../../components/AdminLayout/AdminLayout";
import ListStaffPage from "../../components/ListStaffPage/ListStaffPage";

export default function ListStaff() {
  return (
    <AdminLayout
      title="List Staff"
      subtitle="View service management staff accounts"
    >
      <ListStaffPage />
    </AdminLayout>
  );
}
