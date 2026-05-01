import React from "react";
import ServiceAppointmentsPage from "../../components/ServiceAppointmentsPage/ServiceAppointmentsPage";
import AdminLayout from "../../components/AdminLayout/AdminLayout";

const ServiceAppointments = () => {
  return (
    <AdminLayout
      title="Service Appointments"
      subtitle="Manage patient bookings for hospital services"
    >
      <ServiceAppointmentsPage />
    </AdminLayout>
  );
};

export default ServiceAppointments;
