import React from "react";
import DashboardPage from "../../components/DashboardPage/DashboardPage";
import AdminLayout from "../../components/AdminLayout/AdminLayout";

const Home = () => {
  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Overview of doctors, patients, appointments, and earnings"
    >
      <DashboardPage />
    </AdminLayout>
  );
};

export default Home;
