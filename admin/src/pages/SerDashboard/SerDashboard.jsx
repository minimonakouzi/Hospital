import React from "react";
import ServiceDashboard from "../../components/ServiceDashboard/ServiceDashboard";
import AdminLayout from "../../components/AdminLayout/AdminLayout";

const SerDashboard = () => {
  return (
    <AdminLayout
      title="Service Dashboard"
      subtitle="View service booking performance, totals, and status summaries"
    >
      <ServiceDashboard />
    </AdminLayout>
  );
};

export default SerDashboard;
