import React, { useEffect } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

// Import your pages
import Home from "./pages/Home/Home";
import Add from "./pages/Add/Add";
import List from "./pages/List/List";
import Appointments from "./pages/Appointments/Appointments";
import SerDashboard from "./pages/SerDashboard/SerDashboard";
import ListService from "./pages/ListService/ListService";
import ServiceAppointments from "./pages/ServiceAppointments/ServiceAppointments";
import Hero from "./components/Hero/Hero";
import AddNurse from "./pages/AddNurse/AddNurse";
import ListNurses from "./pages/ListNurses/ListNurses";
import AddStaff from "./pages/AddStaff/AddStaff";
import ListStaff from "./pages/ListStaff/ListStaff";
import StaffLogin from "./pages/StaffLogin/StaffLogin";
import StaffLayout from "./staff/StaffLayout/StaffLayout";
import StaffServices from "./pages/StaffServices/StaffServices";
import StaffAddService from "./pages/StaffAddService/StaffAddService";
import StaffProfile from "./pages/StaffProfile/StaffProfile";
import StaffServiceAppointments from "./pages/StaffServiceAppointments/StaffServiceAppointments";
import StaffAdmissions from "./pages/StaffAdmissions/StaffAdmissions";
import AuditLogs from "./pages/AuditLogs/AuditLogs";
import StaffPerformance from "./pages/StaffPerformance";
import WardManagement from "./pages/WardManagement/WardManagement";

function RequireAuth({ children }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return null; // prevent flicker
  if (!isSignedIn)
    return (
      <div className="min-h-screen font-mono flex items-center justify-center bg-linear-to-b from-blue-50 via-sky-50 to-blue-100 px-4">
        <div className="text-center">
          {/* Animated text */}
          <p className="text-blue-800 font-semibold text-lg sm:text-2xl mb-4 animate-fade-in">
            Please sign in to view this page
          </p>

          {/* Button on new line */}
          <div className="flex justify-center">
            <Link
              to="/"
              className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white shadow-sm
                       hover:bg-blue-700 hover:shadow-md
                       transition-all duration-300 ease-in-out
                       animate-bounce-subtle"
            >
              HOME
            </Link>
          </div>
        </div>
      </div>
    );
  return children;
}

const App = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = location.pathname.startsWith("/staff")
      ? "Staff | Revive Hospital"
      : "Admin | Revive Hospital";
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/staff" element={<StaffLayout />}>
        <Route index element={<Navigate to="/staff/services" replace />} />
        <Route path="services" element={<StaffServices />} />
        <Route path="service-appointments" element={<StaffServiceAppointments />} />
        <Route path="admissions" element={<StaffAdmissions />} />
        <Route path="add-service" element={<StaffAddService />} />
        <Route path="profile" element={<StaffProfile />} />
      </Route>
      <Route
        path="/h"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/add"
        element={
          <RequireAuth>
            <Add />
          </RequireAuth>
        }
      />
      <Route
        path="/list"
        element={
          <RequireAuth>
            <List />
          </RequireAuth>
        }
      />
      <Route
        path="/add-nurse"
        element={
          <RequireAuth>
            <AddNurse />
          </RequireAuth>
        }
      />
      <Route
        path="/list-nurses"
        element={
          <RequireAuth>
            <ListNurses />
          </RequireAuth>
        }
      />
      <Route
        path="/add-staff"
        element={
          <RequireAuth>
            <AddStaff />
          </RequireAuth>
        }
      />
      <Route
        path="/list-staff"
        element={
          <RequireAuth>
            <ListStaff />
          </RequireAuth>
        }
      />
      <Route
        path="/performance"
        element={
          <RequireAuth>
            <StaffPerformance />
          </RequireAuth>
        }
      />
      <Route
        path="/staff-performance"
        element={
          <RequireAuth>
            <Navigate to="/performance" replace />
          </RequireAuth>
        }
      />
      <Route
        path="/appointments"
        element={
          <RequireAuth>
            <Appointments />
          </RequireAuth>
        }
      />
      <Route
        path="/ward-management"
        element={
          <RequireAuth>
            <WardManagement />
          </RequireAuth>
        }
      />
      <Route
        path="/service-dashboard"
        element={
          <RequireAuth>
            <SerDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/add-service"
        element={
          <RequireAuth>
            <Navigate to="/service-dashboard" replace />
          </RequireAuth>
        }
      />
      <Route
        path="/list-service"
        element={
          <RequireAuth>
            <ListService />
          </RequireAuth>
        }
      />
      <Route
        path="/service-appointments"
        element={
          <RequireAuth>
            <ServiceAppointments />
          </RequireAuth>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <RequireAuth>
            <AuditLogs />
          </RequireAuth>
        }
      />
    </Routes>
  );
};

export default App;
