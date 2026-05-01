import React from "react";
import AddPage from "../../components/AddPage/AddPage";
import AdminLayout from "../../components/AdminLayout/AdminLayout";

const Add = () => {
  return (
    <AdminLayout
      title="Add Doctor"
      subtitle="Create a new doctor profile with schedule, credentials, and details"
    >
      <AddPage />
    </AdminLayout>
  );
};

export default Add;
