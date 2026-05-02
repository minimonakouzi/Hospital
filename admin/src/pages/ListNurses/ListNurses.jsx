import React from "react";
import AdminLayout from "../../components/AdminLayout/AdminLayout";
import ListNursesPage from "../../components/ListNursesPage/ListNursesPage";

export default function ListNurses() {
  return (
    <AdminLayout
      title="List Nurses"
      subtitle="View demo nurse staffing and shift assignments"
    >
      <ListNursesPage />
    </AdminLayout>
  );
}
