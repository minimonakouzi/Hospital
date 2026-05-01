import React from "react";
import ListServicePage from "../../components/ListServicePage/ListServicePage";
import AdminLayout from "../../components/AdminLayout/AdminLayout";

const ListService = () => {
  return (
    <AdminLayout
      title="List Services"
      subtitle="Search, edit, and manage your available services"
    >
      <ListServicePage />
    </AdminLayout>
  );
};

export default ListService;
