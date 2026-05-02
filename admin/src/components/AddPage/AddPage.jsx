import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRoundPlus,
  XCircle,
} from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { adminAuthHeaders } from "../../utils/adminAuthHeaders";

function timeStringToMinutes(t) {
  if (!t) return 0;
  const [hhmm, ampm] = t.split(" ");
  let [h, m] = hhmm.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function formatDateISO(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = String(Number(d));
  const month = monthNames[dateObj.getMonth()] || "";
  return `${day} ${month} ${y}`;
}

function getFlatSlots(scheduleObj) {
  const arr = [];
  Object.keys(scheduleObj)
    .sort()
    .forEach((date) => {
      scheduleObj[date].forEach((time) => {
        arr.push({ date, time });
      });
    });
  return arr;
}

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      {children} {required ? <span className="text-rose-500">*</span> : null}
    </label>
  );
}

function InputShell({ children }) {
  return <div className="relative">{children}</div>;
}

export default function AddPage() {
  const { getToken } = useAuth();
  const fileInputRef = useRef(null);

  const [doctorList, setDoctorList] = useState([]);
  const [form, setForm] = useState({
    name: "",
    specialization: "",
    imageFile: null,
    imagePreview: "",
    experience: "",
    qualifications: "",
    location: "",
    about: "",
    fee: "",
    success: "",
    patients: "",
    rating: "",
    schedule: {},
    availability: "Available",
    email: "",
    password: "",
  });

  const [slotDate, setSlotDate] = useState("");
  const [slotHour, setSlotHour] = useState("");
  const [slotMinute, setSlotMinute] = useState("00");
  const [slotAmpm, setSlotAmpm] = useState("AM");

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [today] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
    return () => clearTimeout(t);
  }, [toast.show]);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  const slotCount = useMemo(
    () => getFlatSlots(form.schedule).length,
    [form.schedule],
  );

  function handleImage(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (form.imagePreview && form.imageFile) {
      try {
        URL.revokeObjectURL(form.imagePreview);
      } catch {}
    }

    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
  }

  function removeImage() {
    if (form.imagePreview && form.imageFile) {
      try {
        URL.revokeObjectURL(form.imagePreview);
      } catch {}
    }

    setForm((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: "",
    }));

    if (fileInputRef.current) {
      try {
        fileInputRef.current.value = "";
      } catch {}
    }
  }

  function addSlotToForm() {
    if (!slotDate || !slotHour) {
      showToast("error", "Select date and time first.");
      return;
    }

    if (slotDate < today) {
      showToast("error", "Cannot add a slot in the past.");
      return;
    }

    const time = `${slotHour}:${slotMinute} ${slotAmpm}`;

    if (slotDate === today) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const slotMinutes = timeStringToMinutes(time);
      if (slotMinutes <= nowMinutes) {
        showToast("error", "Cannot add a time that already passed today.");
        return;
      }
    }

    setForm((prev) => {
      const sched = { ...prev.schedule };
      if (!sched[slotDate]) sched[slotDate] = [];
      if (!sched[slotDate].includes(time)) sched[slotDate].push(time);

      sched[slotDate] = sched[slotDate].sort(
        (a, b) => timeStringToMinutes(a) - timeStringToMinutes(b),
      );

      return { ...prev, schedule: sched };
    });

    setSlotHour("");
    setSlotMinute("00");
    setSlotAmpm("AM");
  }

  function removeSlot(date, time) {
    setForm((prev) => {
      const sched = { ...prev.schedule };
      sched[date] = sched[date].filter((t) => t !== time);
      if (!sched[date].length) delete sched[date];
      return { ...prev, schedule: sched };
    });
  }

  function validate(f) {
    const requiredFields = [
      "name",
      "specialization",
      "experience",
      "qualifications",
      "location",
      "about",
      "fee",
      "success",
      "patients",
      "rating",
      "email",
      "password",
    ];

    for (const k of requiredFields) {
      if (!f[k]) return false;
    }

    if (!f.imageFile) return false;
    if (!Object.keys(f.schedule).length) return false;

    return true;
  }

  async function handleAdd(e) {
    e.preventDefault();

    if (!validate(form)) {
      showToast(
        "error",
        "Fill all fields, upload image, and add at least one slot.",
      );
      return;
    }

    const ratingNumber = Number(form.rating);
    if (Number.isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      showToast("error", "Rating must be between 1 and 5.");
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();

      fd.append("name", form.name);
      fd.append("specialization", form.specialization || "");
      fd.append("experience", form.experience || "");
      fd.append("qualifications", form.qualifications || "");
      fd.append("location", form.location || "");
      fd.append("about", form.about || "");
      fd.append("fee", form.fee === "" ? "0" : String(form.fee));
      fd.append("success", form.success || "");
      fd.append("patients", form.patients || "");
      fd.append("rating", form.rating === "" ? "0" : String(form.rating));
      fd.append("availability", form.availability || "Available");
      fd.append("email", form.email);
      fd.append("password", form.password);
      fd.append("schedule", JSON.stringify(form.schedule || {}));

      if (form.imageFile) {
        fd.append("image", form.imageFile);
      }

      const API_BASE = "http://localhost:4000/api";

      const res = await fetch(`${API_BASE}/doctors`, {
        method: "POST",
        headers: await adminAuthHeaders(getToken),
        body: fd,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message || `Server error (${res.status})`;
        showToast("error", msg);
        setLoading(false);
        return;
      }

      showToast("success", "Doctor added successfully.");

      if (data?.token) {
        try {
          localStorage.setItem("token", data.token);
        } catch {}
      }

      const doctorFromServer = data?.data
        ? data.data
        : {
            id: Date.now(),
            ...form,
            imageUrl: form.imagePreview,
          };

      setDoctorList((old) => [doctorFromServer, ...old]);

      if (form.imagePreview && form.imageFile) {
        try {
          URL.revokeObjectURL(form.imagePreview);
        } catch {}
      }

      setForm({
        name: "",
        specialization: "",
        imageFile: null,
        imagePreview: "",
        experience: "",
        qualifications: "",
        location: "",
        about: "",
        fee: "",
        success: "",
        patients: "",
        rating: "",
        schedule: {},
        availability: "Available",
        email: "",
        password: "",
      });

      setSlotDate("");
      setSlotHour("");
      setSlotMinute("00");
      setSlotAmpm("AM");

      if (fileInputRef.current) {
        try {
          fileInputRef.current.value = "";
        } catch {}
      }
    } catch (err) {
      console.error("Add doctor error:", err);
      showToast("error", "Network error while adding doctor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Toast */}
      {toast.show && (
        <div
          className={`mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[2rem] font-bold tracking-tight text-slate-900">
          Onboard New Medical Professional
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure credentials, professional details, and availability slots.
        </p>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
        {/* Top strip */}
        <div className="border-b border-[#dbe6f7] bg-[#eef4fb] px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <UserRoundPlus className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Doctor Profile Details
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Provide accurate information to build a complete doctor profile.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleAdd} className="px-6 py-6">
          {/* Upload + first info rows */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            {/* Image upload */}
            <div className="xl:col-span-3">
              <FieldLabel required>Profile Image</FieldLabel>

              <div className="rounded-3xl border border-[#dbe6f7] bg-[#f8fbff] p-4">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                  {form.imagePreview ? (
                    <div className="w-full">
                      <img
                        src={form.imagePreview}
                        alt="Doctor preview"
                        className="mx-auto h-36 w-36 rounded-2xl object-cover ring-1 ring-blue-100"
                      />

                      <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                        >
                          <Camera className="h-4 w-4" />
                          Change
                        </button>

                        <button
                          type="button"
                          onClick={removeImage}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <ImagePlus className="h-7 w-7" />
                      </div>

                      <div className="mt-4 text-sm font-medium text-slate-700">
                        Upload doctor photo
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Supported formats: JPG, PNG, WEBP
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                      >
                        Choose from library
                      </button>
                    </>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImage}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Main fields */}
            <div className="xl:col-span-9">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <FieldLabel required>Full Name</FieldLabel>
                  <InputShell>
                    <input
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                      placeholder="Dr. Jonathan Doe"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </InputShell>
                </div>

                <div>
                  <FieldLabel required>Specialization</FieldLabel>
                  <select
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
                    value={form.specialization}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        specialization: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select medical field...</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dentistry">Dentistry</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Endocrinology">Endocrinology</option>
                    <option value="ENT">ENT</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Gynecology">Gynecology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Psychiatry">Psychiatry</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Urology">Urology</option>
                  </select>
                </div>

                <div>
                  <FieldLabel required>Practice Location</FieldLabel>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                      placeholder="Medical Center, Wing A"
                      value={form.location}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel required>Years of Experience</FieldLabel>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                    placeholder="e.g. 10 years"
                    value={form.experience}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        experience: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <FieldLabel required>Official Email Address</FieldLabel>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                    placeholder="doctor@revive.com"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <FieldLabel required>Consultation Fee ($)</FieldLabel>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                    placeholder="0.00"
                    type="number"
                    min={0}
                    value={form.fee}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fee: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <FieldLabel required>Qualifications</FieldLabel>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                    placeholder="MBBS, MD, DCH..."
                    value={form.qualifications}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        qualifications: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <FieldLabel required>Password</FieldLabel>
                  <div className="relative">
                    <input
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                      placeholder="Doctor password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <FieldLabel required>Patients</FieldLabel>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                    placeholder="e.g. 2k+"
                    value={form.patients}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, patients: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <FieldLabel required>Success Rate</FieldLabel>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                    placeholder="e.g. 98%"
                    value={form.success}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, success: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <FieldLabel required>Rating</FieldLabel>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                    placeholder="1.0 - 5.0"
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={form.rating}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        setForm((prev) => ({ ...prev, rating: "" }));
                        return;
                      }

                      const n = Number(v);
                      if (Number.isNaN(n)) return;

                      const clamped = Math.max(1, Math.min(5, n));
                      const fixed = Math.round(clamped * 10) / 10;

                      setForm((prev) => ({
                        ...prev,
                        rating: fixed.toString(),
                      }));
                    }}
                    onBlur={() => {
                      setForm((prev) => {
                        if (!prev.rating) return prev;
                        const n = Number(prev.rating);
                        if (Number.isNaN(n)) return { ...prev, rating: "" };

                        const clamped = Math.max(1, Math.min(5, n));
                        return { ...prev, rating: clamped.toFixed(1) };
                      });
                    }}
                  />
                </div>

                <div>
                  <FieldLabel>Availability</FieldLabel>
                  <select
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
                    value={form.availability}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        availability: e.target.value,
                      }))
                    }
                  >
                    <option value="Available">Available</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Biography */}
          <div className="mt-6">
            <FieldLabel required>Professional Biography</FieldLabel>
            <textarea
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
              placeholder="Briefly describe the doctor's background, achievements, and patient care philosophy..."
              value={form.about}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, about: e.target.value }))
              }
            />
          </div>

          {/* Availability */}
          <div className="mt-6 rounded-3xl border border-[#dbe6f7] bg-[#f8fbff] p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-700">
                    Availability Management
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Add one or more schedule slots for the doctor.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Must have one schedule slot
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-5">
              <div>
                <FieldLabel required>Date</FieldLabel>
                <input
                  type="date"
                  value={slotDate}
                  min={today}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                />
              </div>

              <div>
                <FieldLabel required>Start Hour</FieldLabel>
                <select
                  value={slotHour}
                  onChange={(e) => setSlotHour(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                >
                  <option value="">-- : --</option>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={String(i + 1).padStart(2, "0")}>
                      {String(i + 1).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Minute</FieldLabel>
                <select
                  value={slotMinute}
                  onChange={(e) => setSlotMinute(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                >
                  {Array.from({ length: 60 }).map((_, i) => (
                    <option key={i} value={String(i).padStart(2, "0")}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Status</FieldLabel>
                <select
                  value={slotAmpm}
                  onChange={(e) => setSlotAmpm(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addSlotToForm}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Slot
                </button>
              </div>
            </div>

            <div className="mt-5">
              {slotCount === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#dbe6f7] bg-white px-4 py-4 text-sm text-slate-400">
                  No schedule slot added yet. Add a date and time to create
                  availability.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {getFlatSlots(form.schedule).map((slot) => (
                    <div
                      key={`${slot.date}-${slot.time}`}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800">
                          {formatDateISO(slot.date)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {slot.time}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSlot(slot.date, slot.time)}
                        className="rounded-xl p-2 text-rose-600 transition hover:bg-rose-50"
                        aria-label="Remove slot"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom actions */}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-400">
              Main categories preserved: doctor profile, credentials,
              professional details, availability, and image.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  if (loading) return;

                  if (form.imagePreview && form.imageFile) {
                    try {
                      URL.revokeObjectURL(form.imagePreview);
                    } catch {}
                  }

                  setForm({
                    name: "",
                    specialization: "",
                    imageFile: null,
                    imagePreview: "",
                    experience: "",
                    qualifications: "",
                    location: "",
                    about: "",
                    fee: "",
                    success: "",
                    patients: "",
                    rating: "",
                    schedule: {},
                    availability: "Available",
                    email: "",
                    password: "",
                  });

                  setSlotDate("");
                  setSlotHour("");
                  setSlotMinute("00");
                  setSlotAmpm("AM");

                  if (fileInputRef.current) {
                    try {
                      fileInputRef.current.value = "";
                    } catch {}
                  }
                }}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                onClick={handleAdd}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Stethoscope className="h-4 w-4" />
                    Register Doctor Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Optional recently added preview */}
      {doctorList.length > 0 && (
        <div className="mt-6 rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Recently Added
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {doctorList.slice(0, 3).map((doctor, index) => (
              <div
                key={doctor.id || doctor._id || index}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-3">
                  {doctor.imageUrl ? (
                    <img
                      src={doctor.imageUrl}
                      alt={doctor.name}
                      className="h-12 w-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 font-semibold text-blue-700">
                      {String(doctor.name || "D")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">
                      {doctor.name}
                    </div>
                    <div className="truncate text-sm text-slate-500">
                      {doctor.specialization}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
