import React from "react";
import AppointmentsPage from "../../components/AppointmentsPage/AppointmentsPage";
import AdminLayout from "../../components/AdminLayout/AdminLayout";

const Appointments = () => {
  return (
    <AdminLayout
      title="Appointments"
      subtitle="Track and manage all doctor appointments"
    >
      <AppointmentsPage />
    </AdminLayout>
  );
};

export default Appointments;
