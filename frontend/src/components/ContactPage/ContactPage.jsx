import React, { useMemo, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Building2,
  Stethoscope,
  MessageSquare,
  MapPin,
  Clock3,
  Send,
} from "lucide-react";

const departments = [
  "Cardiology",
  "Pediatrics",
  "Neurology",
  "Dermatology",
  "Orthopedics",
  "Gynecology",
  "Dentistry",
  "Emergency",
];

const departmentServices = {
  Cardiology: [
    "Heart Checkup",
    "ECG",
    "Blood Pressure Test",
    "Cardiac Consultation",
  ],
  Pediatrics: ["Child Consultation", "Vaccination", "Growth Monitoring"],
  Neurology: ["Neurological Consultation", "EEG", "Migraine Assessment"],
  Dermatology: ["Skin Consultation", "Allergy Check", "Acne Treatment"],
  Orthopedics: [
    "Bone Checkup",
    "Joint Consultation",
    "Physical Therapy Review",
  ],
  Gynecology: [
    "Women's Health Consultation",
    "Pregnancy Follow-up",
    "Ultrasound Review",
  ],
  Dentistry: ["Dental Checkup", "Cleaning", "Tooth Pain Consultation"],
  Emergency: ["Urgent Consultation", "Emergency Support"],
};

const WHATSAPP_NUMBER = "96178909710";

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[#dfe6f4] bg-[#f8fafc] px-4 text-[#0f172a] outline-none transition focus:border-[#b9cdf8] focus:bg-white";
}

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    service: "",
    message: "",
  });

  const [errors, setErrors] = useState({});

  const services = useMemo(() => {
    if (!form.department) return [];
    return departmentServices[form.department] || [];
  }, [form.department]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate() {
    const next = {};

    if (!form.name.trim()) next.name = "Full name is required.";
    if (!form.email.trim()) {
      next.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Enter a valid email.";
    }

    if (!form.phone.trim()) {
      next.phone = "Phone number is required.";
    } else if (!/^\d{8}$/.test(form.phone.trim())) {
      next.phone = "Phone number must be 8 digits.";
    }

    if (!form.department) next.department = "Please select a department.";
    if (!form.service) next.service = "Please select a service.";
    if (!form.message.trim()) next.message = "Message is required.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const text =
      `Hello Revive Hospital,%0A%0A` +
      `Full Name: ${encodeURIComponent(form.name)}%0A` +
      `Email: ${encodeURIComponent(form.email)}%0A` +
      `Phone: ${encodeURIComponent(form.phone)}%0A` +
      `Department: ${encodeURIComponent(form.department)}%0A` +
      `Service: ${encodeURIComponent(form.service)}%0A` +
      `Message: ${encodeURIComponent(form.message)}`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#eef6ff] pt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_48%,#eef6ff_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1380px] px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8 overflow-hidden rounded-[34px] border border-white/60 bg-white/70 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl">
          <div className="grid gap-8 px-6 py-8 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-10">
            {/* Left: form */}
            <div className="overflow-hidden rounded-[30px] border border-[#dbe6f7] bg-white shadow-sm">
              <div className="border-b border-[#e5eaf5] bg-[#eef4fb] px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
                    <MessageSquare className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-[2rem] font-bold tracking-tight text-[#0f172a]">
                      Contact Our Hospital
                    </h2>
                    <p className="mt-1 text-sm text-[#64748b]">
                      Fill the form — we’ll open WhatsApp so you can connect
                      with us instantly.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      <User className="h-3.5 w-3.5" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      className={inputClass()}
                    />
                    {errors.name && (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="example@domain.com"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      className={inputClass()}
                    />
                    {errors.email && (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      <Phone className="h-3.5 w-3.5" />
                      Phone
                    </label>
                    <input
                      type="text"
                      placeholder="12345678"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      className={inputClass()}
                    />
                    {errors.phone && (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      <Building2 className="h-3.5 w-3.5" />
                      Department
                    </label>
                    <select
                      value={form.department}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          department: e.target.value,
                          service: "",
                        }));
                        setErrors((prev) => ({
                          ...prev,
                          department: "",
                          service: "",
                        }));
                      }}
                      className={inputClass()}
                    >
                      <option value="">Select Department</option>
                      {departments.map((dep) => (
                        <option key={dep} value={dep}>
                          {dep}
                        </option>
                      ))}
                    </select>
                    {errors.department && (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.department}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      <Stethoscope className="h-3.5 w-3.5" />
                      Service
                    </label>
                    <select
                      value={form.service}
                      onChange={(e) => setField("service", e.target.value)}
                      className={inputClass()}
                    >
                      <option value="">
                        Select Service (or choose Department above)
                      </option>
                      {services.map((service) => (
                        <option key={service} value={service}>
                          {service}
                        </option>
                      ))}
                    </select>
                    {errors.service && (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.service}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Message
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Describe your concern briefly..."
                      value={form.message}
                      onChange={(e) => setField("message", e.target.value)}
                      className="min-h-[130px] w-full rounded-[18px] border border-[#dfe6f4] bg-[#f8fafc] px-4 py-3 text-[#0f172a] outline-none transition focus:border-[#b9cdf8] focus:bg-white"
                    />
                    {errors.message && (
                      <p className="mt-2 text-xs text-rose-600">
                        {errors.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8]"
                  >
                    <Send className="h-4 w-4" />
                    Send via WhatsApp
                  </button>
                </div>
              </form>
            </div>

            {/* Right: info */}
            <div className="space-y-5">
              <div className="overflow-hidden rounded-[30px] border border-[#dbe6f7] bg-white shadow-sm">
                <div className="px-6 py-6">
                  <h3 className="text-[1.8rem] font-bold tracking-tight text-[#0f172a]">
                    Visit Our Hospital
                  </h3>

                  <div className="mt-5 space-y-4 text-sm text-[#334155]">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-[#2563eb]" />
                      <span>Lebanon, Beirut</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-[#2563eb]" />
                      <span>81727941</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-[#2563eb]" />
                      <span>info@yourhospital.com</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[30px] border border-[#dbe6f7] bg-white shadow-sm">
                <div className="h-[255px] w-full overflow-hidden">
                  <iframe
                    title="Hospital Location"
                    src="https://www.google.com/maps?q=Beirut%20Arab%20University&z=15&output=embed"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-[30px] border border-[#dbe6f7] bg-[#eef4fb] shadow-sm">
                <div className="px-6 py-5">
                  <h4 className="text-xl font-semibold text-[#0f172a]">
                    Hospital Hours
                  </h4>
                  <div className="mt-3 flex items-center gap-3 text-sm text-[#334155]">
                    <Clock3 className="h-4 w-4 text-[#2563eb]" />
                    <span>24/7 Availability</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
