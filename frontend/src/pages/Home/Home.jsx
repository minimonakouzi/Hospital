import React from "react";
import Navbar from "../../components/Navbar/Navbar";
import Banner from "../../components/Banner/Banner";
import Certification from "../../components/Certification/Certification";
import HomeDoctors from "../../components/HomeDoctors/HomeDoctors";
import Footer from "../../components/Footer/Footer";
import bgImage from "../../assets/medical-bg.png";

const Home = () => {
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden text-white">
      {/* Background image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${bgImage})`,
        }}
      />

      <div className="fixed inset-0 z-[1] bg-[linear-gradient(180deg,rgba(2,8,23,0.70)_0%,rgba(7,32,66,0.34)_38%,rgba(238,246,255,0.92)_100%)]" />
      <div className="fixed inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.16)_0%,rgba(6,18,38,0.08)_42%,rgba(2,8,23,0.34)_100%)]" />

      <Navbar />

      <main className="relative z-10">
        <section className="flex min-h-[calc(100svh-24px)] items-center justify-center px-0 pb-10 pt-24">
          <Banner />
        </section>

        <div className="space-y-0">
          <Certification />
          <HomeDoctors />
        </div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default Home;
