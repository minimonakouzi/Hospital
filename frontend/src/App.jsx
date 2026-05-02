// src/App.jsx
import React, { useEffect, useState } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";

// Pages
import Home from "./pages/Home/Home";
import Doctors from "./pages/Doctors/Doctors";
import Contact from "./pages/Contact/Contact";
import Service from "./pages/Service/Service";
import DoctorDetail from "./pages/DoctorDetail/DoctorDetail";
import ServiceDetailPage from "./pages/ServiceDetailPage/ServiceDetailPage";
import Appointments from "./pages/Appointments/Appointments";
import MedicalRecords from "./pages/MedicalRecords/MedicalRecords";
import Login from "./pages/Login/Login";
import NurseLogin from "./pages/NurseLogin/NurseLogin";
import NurseDashboard from "./pages/NurseDashboard/NurseDashboard";
import NurseCheckIns from "./pages/NurseCheckIns/NurseCheckIns";
import NurseVitals from "./pages/NurseVitals/NurseVitals";
import NurseBookings from "./pages/NurseBookings/NurseBookings";
import NurseProfile from "./pages/NurseProfile/NurseProfile";
import NurseLayout from "./nurse/NurseLayout/NurseLayout";

// Doctor Admin
import DHome from "./pages/DHome/DHome";
import List from "./pages/List/List";
import EditProfile from "./pages/EditProfile/EditProfile";
import ScheduleCalendar from "./pages/ScheduleCalendar/ScheduleCalendar";

// Lucide icon
import { CircleChevronUp } from "lucide-react";
import VerifyPaymentPage from "../VerifyPaymetPage";
import VerifyServicePaymentPage from "../VerifyServicePaymentPage";

/* ================= Scroll To Top ================= */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
};

/* ================= Floating Scroll Button ================= */
const ScrollButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      onClick={scrollTop}
      className={`fixed right-4 bottom-6 z-50 h-11 w-11 rounded-full flex items-center justify-center 
      bg-emerald-600 text-white shadow-lg transition-all duration-300 
      ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} 
      hover:scale-110 hover:shadow-xl`}
      title="Go to top"
    >
      <CircleChevronUp size={22} />
    </button>
  );
};

/* ================= Main App ================= */
function getDocumentTitle(pathname) {
  if (pathname.startsWith("/nurse")) return "Nurse | Revive Hospital";
  if (pathname.startsWith("/doctor-admin")) return "Doctor | Revive Hospital";
  return "Revive Hospital";
}

const App = () => {
  const location = useLocation();
  const isNurseRoute = location.pathname.startsWith("/nurse");

  useEffect(() => {
    document.body.style.overflowX = "hidden";
    document.documentElement.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = "auto";
      document.documentElement.style.overflowX = "auto";
    };
  }, []);

  useEffect(() => {
    document.title = getDocumentTitle(location.pathname);
  }, [location.pathname]);

  return (
    <>
      <ScrollToTop />

      <div
        className={`min-h-[100dvh] overflow-x-hidden text-gray-900 ${
          isNurseRoute ? "bg-[#eef4fb]" : "bg-transparent"
        }`}
      >
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/doctors/:id" element={<DoctorDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/services" element={<Service />} />
          <Route path="/services/:id" element={<ServiceDetailPage />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/medical-records" element={<MedicalRecords />} />
          <Route path="/doctor-admin/login" element={<Login />} />
          <Route path="/nurse/login" element={<NurseLogin />} />
          <Route path="/nurse" element={<NurseLayout />}>
            <Route index element={<Navigate to="/nurse/dashboard" replace />} />
            <Route path="dashboard" element={<NurseDashboard />} />
            <Route path="check-ins" element={<NurseCheckIns />} />
            <Route path="vitals" element={<NurseVitals />} />
            <Route path="bookings" element={<NurseBookings />} />
            <Route path="profile" element={<NurseProfile />} />
          </Route>

          {/* Stripe payment routes */}
          <Route path="/appointment/success" element={<VerifyPaymentPage />} />
          <Route path="/appointment/cancel" element={<VerifyPaymentPage />} />

          <Route
            path="/service-appointment/success"
            element={<VerifyServicePaymentPage />}
          />
          <Route
            path="/service-appointment/cancel"
            element={<VerifyServicePaymentPage />}
          />

          {/* Doctor Admin */}
          <Route path="/doctor-admin/:id" element={<DHome />} />
          <Route path="/doctor-admin/:id/appointments" element={<List />} />
          <Route
            path="/doctor-admin/:id/schedule-calendar"
            element={<ScheduleCalendar />}
          />
          <Route
            path="/doctor-admin/:id/profile/edit"
            element={<EditProfile />}
          />
        </Routes>
      </div>

      <ScrollButton />
    </>
  );
};

export default App;
