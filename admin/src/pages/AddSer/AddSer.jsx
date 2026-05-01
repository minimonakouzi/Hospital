import React from "react";
import AddService from "../../components/AddService/AddService";
import AdminLayout from "../../components/AdminLayout/AdminLayout";

const AddSer = () => {
  return (
    <AdminLayout
      title="Add Service"
      subtitle="Create a new hospital service with image, instructions, and available slots"
    >
      <AddService />
    </AdminLayout>
  );
};

export default AddSer;
