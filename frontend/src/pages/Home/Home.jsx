import React from "react";
import Navbar from "../../components/Navbar/Navbar";
import Banner from "../../components/Banner/Banner";
import Certification from "../../components/Certification/Certification";
import HomeDoctors from "../../components/HomeDoctors/HomeDoctors";
import Testimonial from "../../components/Testimonial/Testimonial";
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

      {/* Light overlay */}
      <div className="fixed inset-0 z-[1] bg-white/10" />

      <Navbar />

      <main className="relative z-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/12 blur-3xl" />
          <div className="absolute -left-24 top-[30rem] h-72 w-72 rounded-full bg-blue-300/10 blur-3xl" />
          <div className="absolute right-0 top-[70rem] h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
        </div>

        {/* first screen only */}
        <section className="flex min-h-[100svh] items-center justify-center px-0 pt-20">
          <Banner />
        </section>

        {/* below fold */}
        <div className="space-y-0">
          <Certification />
          <HomeDoctors />
          <Testimonial />
        </div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default Home;
