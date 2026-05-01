import React from "react";
import ListPage from "../../components/ListPage/ListPage";
import AdminLayout from "../../components/AdminLayout/AdminLayout";

const List = () => {
  return (
    <AdminLayout
      title="List Doctors"
      subtitle="Browse, search, and manage all doctors in the system"
    >
      <ListPage />
    </AdminLayout>
  );
};

export default List;
