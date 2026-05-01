import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Save,
  X,
  Plus,
  Calendar,
  Image as ImageIcon,
  Trash2,
  User,
  Briefcase,
  GraduationCap,
  MapPin,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Mail,
  Star,
  Users,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

const STORAGE_KEY = "doctorToken_v1";
const API_BASE = "http://localhost:4000/api/doctors";

/* ---------------- helpers ---------------- */
function parse12HourTimeToMinutes(t) {
  if (!t) return 0;
  const [time = "0:00", ampm = ""] = String(t).split(" ");
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  let h = Number(hh) % 12;
  if ((ampm || "").toUpperCase() === "PM") h += 12;
  return h * 60 + Number(mm || 0);
}

function formatTimeFromInput(time24) {
  if (!time24) return time24;
  const [h, m] = time24.split(":");
  let hr = Number(h);
  const ampm = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  return `${String(hr).padStart(2, "0")}:${m} ${ampm}`;
}

function dedupeAndSortSchedule(schedule = {}) {
  const out = {};
  Object.entries(schedule || {}).forEach(([date, slots]) => {
    const uniq = Array.from(new Set(Array.isArray(slots) ? slots : []));
    uniq.sort(
      (a, b) => parse12HourTimeToMinutes(a) - parse12HourTimeToMinutes(b),
    );
    out[date] = uniq;
  });
  return out;
}

function getFieldValue(doc, key, fallback = "") {
  return doc?.[key] ?? fallback;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildInputClass(editing, multiline = false) {
  return [
    "w-full rounded-[18px] border border-[#dfe6f4] bg-[#f8fafc] text-[#0f172a] outline-none transition",
    multiline ? "min-h-[120px] px-4 py-3 resize-none" : "h-12 px-4",
    editing
      ? "focus:border-[#b9cdf8] focus:bg-white"
      : "cursor-default opacity-95",
  ].join(" ");
}

function toastTone(type) {
  if (type === "success")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "error") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

/* ---------------- page ---------------- */
export default function EditProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doc, setDoc] = useState(null);
  const [editing, setEditing] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [localImageFile, setLocalImageFile] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const fileInputRef = useRef(null);

  const specializationOptions = [
    "General Physician",
    "Cardiology",
    "Pediatrics",
    "Dermatology",
    "Neurology",
    "Orthopedics",
    "Gynecology",
    "Dentist",
    "Psychiatrist",
    "Pulmonologist",
    "Oncology",
    "ENT Specialist",
  ];

  const addToast = (text, type = "success") => {
    const idt = Date.now() + Math.random();
    const t = { id: idt, text, type };
    setToasts((prev) => [t, ...prev.slice(0, 2)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((it) => it.id !== idt));
    }, 3000);
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchDoctor() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to fetch doctor");

        const d = json.data || json || {};
        d.schedule = dedupeAndSortSchedule(d.schedule || {});
        d.imageUrl =
          d.imageUrl || d.image || d.imageUrl === null ? d.imageUrl : d.image;

        if (!cancelled) {
          setDoc(d);
          setImagePreview(d.imageUrl || "");
        }
      } catch (err) {
        console.error("fetchDoctor error:", err);
        addToast("Unable to load profile", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) fetchDoctor();

    return () => {
      cancelled = true;
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [id]);

  const addDate = (dateStr) => {
    if (!dateStr || !doc) return;
    if (doc.schedule?.[dateStr]) {
      addToast("Date already exists", "error");
      return;
    }
    setDoc((d) => ({
      ...d,
      schedule: { ...(d.schedule || {}), [dateStr]: [] },
    }));
    addToast("Date added successfully", "success");
  };

  const addSlot = (dateStr, time) => {
    if (!dateStr || !time || !doc) return;
    const formatted = formatTimeFromInput(time);

    setDoc((d) => {
      const existing = d.schedule?.[dateStr] || [];
      if (existing.includes(formatted)) {
        addToast(`${formatted} already exists for ${dateStr}`, "error");
        return d;
      }

      const nextArr = [...existing, formatted];
      nextArr.sort(
        (a, b) => parse12HourTimeToMinutes(a) - parse12HourTimeToMinutes(b),
      );

      return {
        ...d,
        schedule: { ...(d.schedule || {}), [dateStr]: nextArr },
      };
    });

    addToast(`Time slot ${formatted} added`, "success");
  };

  const removeSlot = (dateStr, slot) => {
    setDoc((d) => {
      const next = (d.schedule?.[dateStr] || []).filter((s) => s !== slot);
      return {
        ...d,
        schedule: { ...(d.schedule || {}), [dateStr]: next },
      };
    });
    addToast(`Removed ${slot} from ${dateStr}`, "info");
  };

  const removeDate = (dateStr) => {
    setDoc((d) => {
      const clone = { ...(d.schedule || {}) };
      delete clone[dateStr];
      return { ...d, schedule: clone };
    });
    addToast(`Date ${dateStr} removed`, "info");
  };

  const handleImageChange = (e) => {
    if (!editing) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setLocalImageFile(file);
    setDoc((d) => ({ ...d, imageUrl: url }));
    addToast("Profile image updated locally", "success");
  };

  const toggleAvailability = () => {
    setDoc((d) => {
      const current = d.availability === "Available" || d.available === true;
      const nextVal = current ? "Unavailable" : "Available";
      return { ...d, availability: nextVal, available: !current };
    });
    addToast("Availability toggled", "info");
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to fetch");

      const d = json.data || json || {};
      d.schedule = dedupeAndSortSchedule(d.schedule || {});
      setDoc(d);
      setImagePreview(d.imageUrl || "");
      setLocalImageFile(null);
      setEditing(false);
      addToast("Reset to server profile", "info");
    } catch (err) {
      console.error("Reset error:", err);
      addToast("Reset failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!doc) return;

    setSaveMessage({ type: "saving", text: "Saving profile..." });
    addToast("Saving profile...", "info");

    try {
      const form = new FormData();

      const updatable = [
        "name",
        "specialization",
        "experience",
        "qualifications",
        "location",
        "about",
        "fee",
        "availability",
        "success",
        "patients",
        "rating",
        "email",
        "password",
      ];

      updatable.forEach((k) => {
        if (doc[k] !== undefined && doc[k] !== null) {
          form.append(k, String(doc[k]));
        }
      });

      form.append("schedule", JSON.stringify(doc.schedule || {}));

      if (localImageFile) {
        form.append("image", localImageFile);
      } else if (doc.imageUrl && !String(doc.imageUrl).startsWith("blob:")) {
        form.append("imageUrl", doc.imageUrl);
      }

      const token = localStorage.getItem(STORAGE_KEY);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers,
        body: form,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to save");

      const updated = json.data || json;
      updated.schedule = dedupeAndSortSchedule(updated.schedule || {});
      setDoc(updated);
      setLocalImageFile(null);
      setImagePreview(updated.imageUrl || imagePreview);
      setEditing(false);
      setSaveMessage({ type: "success", text: "Profile saved successfully!" });
      addToast("Profile saved successfully!", "success");

      setTimeout(() => setSaveMessage(null), 1600);
    } catch (err) {
      console.error("handleSave error:", err);
      setSaveMessage({ type: "error", text: "Save failed" });
      addToast(err.message || "Save failed", "error");
    }
  };

  const scheduleDates = useMemo(() => {
    if (!doc?.schedule) return [];
    return Object.keys(doc.schedule).sort((a, b) => new Date(a) - new Date(b));
  }, [doc]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="border-b border-[#e9eef7] bg-white px-6 py-5 lg:px-8">
          <div className="mx-auto max-w-[1320px]">
            <h1 className="text-[1.9rem] font-bold tracking-tight text-[#0f172a]">
              Edit Profile
            </h1>
            <p className="mt-1 text-[0.98rem] text-[#64748b]">
              Update your professional details and availability
            </p>
          </div>
        </div>

        <div className="px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1320px] rounded-[30px] border border-[#e5eaf5] bg-white p-10 text-center text-[#64748b] shadow-sm">
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="px-4 py-8 lg:px-8">
          <div className="mx-auto max-w-[1320px] rounded-[30px] border border-rose-200 bg-white p-10 text-center text-rose-600 shadow-sm">
            Unable to load doctor profile.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* top header */}
      <div className="border-b border-[#e9eef7] bg-white px-6 py-5 lg:px-8">
        <div className="mx-auto max-w-[1320px]">
          <h1 className="text-[1.9rem] font-bold tracking-tight text-[#0f172a]">
            Edit Profile
          </h1>
          <p className="mt-1 text-[0.98rem] text-[#64748b]">
            Update your doctor profile with schedule, credentials, and details
          </p>
        </div>
      </div>

      <div className="px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-[1320px]">
          {/* toast */}
          {toasts.length > 0 && (
            <div className="mb-4 space-y-3">
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${toastTone(
                    toast.type,
                  )}`}
                >
                  {toast.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : toast.type === "error" ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                  <span>{toast.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* title block */}
          <div className="mb-6">
            <h2 className="text-[2rem] font-bold tracking-tight text-[#0f172a] lg:text-[2.15rem]">
              Update Medical Professional Profile
            </h2>
            <p className="mt-1 text-[0.98rem] text-[#64748b]">
              Configure credentials, professional details, and availability
              slots.
            </p>
          </div>

          {/* main card */}
          <div className="overflow-hidden rounded-[30px] border border-[#e5eaf5] bg-white shadow-sm">
            {/* strip */}
            <div className="border-b border-[#e5eaf5] bg-[#eef4fb] px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
                  <User className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#0f172a]">
                    Doctor Profile Details
                  </h3>
                  <p className="mt-1 text-sm text-[#64748b]">
                    Provide accurate information to update your doctor profile.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 lg:px-6 lg:py-7">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                {/* image panel */}
                <div>
                  <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                    Profile Image
                  </label>

                  <div className="rounded-[24px] border border-[#e5eaf5] bg-[#f8fafc] p-4">
                    <div className="flex min-h-[270px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#d7e2f3] bg-white px-5 py-6 text-center">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Doctor"
                          className="mb-4 h-28 w-28 rounded-3xl object-cover shadow-sm"
                        />
                      ) : (
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#2563eb]">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}

                      <p className="text-lg font-semibold text-[#334155]">
                        Upload doctor photo
                      </p>
                      <p className="mt-1 text-sm text-[#94a3b8]">
                        Supported formats: JPG, PNG, WEBP
                      </p>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />

                      <button
                        type="button"
                        onClick={() => editing && fileInputRef.current?.click()}
                        disabled={!editing}
                        className={`mt-5 rounded-full px-5 py-3 text-sm font-semibold ${
                          editing
                            ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                            : "cursor-not-allowed bg-[#e9eef7] text-[#94a3b8]"
                        }`}
                      >
                        Choose from library
                      </button>
                    </div>
                  </div>
                </div>

                {/* fields */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        value={getFieldValue(doc, "name")}
                        onChange={(e) =>
                          editing &&
                          setDoc((d) => ({ ...d, name: e.target.value }))
                        }
                        disabled={!editing}
                        className={`${buildInputClass(editing)} pl-11`}
                        placeholder="Doctor full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Specialization *
                    </label>
                    <select
                      value={getFieldValue(doc, "specialization")}
                      onChange={(e) =>
                        editing &&
                        setDoc((d) => ({
                          ...d,
                          specialization: e.target.value,
                        }))
                      }
                      disabled={!editing}
                      className={buildInputClass(editing)}
                    >
                      <option value="">Select medical field...</option>
                      {specializationOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Practice Location *
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        value={getFieldValue(doc, "location")}
                        onChange={(e) =>
                          editing &&
                          setDoc((d) => ({ ...d, location: e.target.value }))
                        }
                        disabled={!editing}
                        className={`${buildInputClass(editing)} pl-11`}
                        placeholder="Medical center, wing..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Years of Experience *
                    </label>
                    <div className="relative">
                      <Briefcase className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        value={getFieldValue(doc, "experience")}
                        onChange={(e) =>
                          editing &&
                          setDoc((d) => ({ ...d, experience: e.target.value }))
                        }
                        disabled={!editing}
                        className={`${buildInputClass(editing)} pl-11`}
                        placeholder="e.g. 10 years"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Official Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        type="email"
                        value={getFieldValue(doc, "email")}
                        onChange={(e) =>
                          editing &&
                          setDoc((d) => ({ ...d, email: e.target.value }))
                        }
                        disabled={!editing}
                        className={`${buildInputClass(editing)} pl-11`}
                        placeholder="doctor@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Consultation Fee ($) *
                    </label>
                    <div className="relative">
                      <DollarSign className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        value={getFieldValue(doc, "fee")}
                        onChange={(e) =>
                          editing &&
                          setDoc((d) => ({ ...d, fee: e.target.value }))
                        }
                        disabled={!editing}
                        className={`${buildInputClass(editing)} pl-11`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Qualifications *
                    </label>
                    <div className="relative">
                      <GraduationCap className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        value={getFieldValue(doc, "qualifications")}
                        onChange={(e) =>
                          editing &&
                          setDoc((d) => ({
                            ...d,
                            qualifications: e.target.value,
                          }))
                        }
                        disabled={!editing}
                        className={`${buildInputClass(editing)} pl-11`}
                        placeholder="MBBS, MD..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={getFieldValue(doc, "password")}
                        onChange={(e) =>
                          editing &&
                          setDoc((d) => ({ ...d, password: e.target.value }))
                        }
                        disabled={!editing}
                        className={`${buildInputClass(editing)} pr-12`}
                        placeholder="Doctor password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
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
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Patients *
                    </label>
                    <div className="relative">
                      <Users className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        value={getFieldValue(doc, "patients")}
                        onChange={(e) =>
                          editing &&
                          setDoc((d) => ({ ...d, patients: e.target.value }))
                        }
                        disabled={!editing}
                        className={`${buildInputClass(editing)} pl-11`}
                        placeholder="e.g. 2k+"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Success Rate *
                    </label>
                    <div className="relative">
                      <CheckCircle2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        value={getFieldValue(doc, "success")}
                        onChange={(e) =>
                          editing &&
                          setDoc((d) => ({ ...d, success: e.target.value }))
                        }
                        disabled={!editing}
                        className={`${buildInputClass(editing)} pl-11`}
                        placeholder="e.g. 98%"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Rating *
                    </label>
                    <div className="relative">
                      <Star className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        value={getFieldValue(doc, "rating")}
                        onChange={(e) =>
                          editing &&
                          setDoc((d) => ({ ...d, rating: e.target.value }))
                        }
                        disabled={!editing}
                        className={`${buildInputClass(editing)} pl-11`}
                        placeholder="1.0 - 5.0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Availability
                    </label>
                    <div className="flex gap-3">
                      <input
                        value={getFieldValue(doc, "availability", "Available")}
                        disabled
                        className={`${buildInputClass(false)} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => editing && toggleAvailability()}
                        disabled={!editing}
                        className={`rounded-[18px] px-4 text-sm font-semibold ${
                          editing
                            ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                            : "cursor-not-allowed bg-[#e9eef7] text-[#94a3b8]"
                        }`}
                      >
                        Toggle
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* biography */}
              <div className="mt-6">
                <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                  Professional Biography *
                </label>
                <textarea
                  value={getFieldValue(doc, "about")}
                  onChange={(e) =>
                    editing && setDoc((d) => ({ ...d, about: e.target.value }))
                  }
                  disabled={!editing}
                  className={buildInputClass(editing, true)}
                  placeholder="Briefly describe the doctor's background, achievements, and patient care philosophy..."
                />
              </div>

              {/* schedule */}
              <div className="mt-7 rounded-[28px] border border-[#e5eaf5] bg-[#f8fafc] p-5">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef4fb] text-[#2563eb]">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold uppercase tracking-[0.12em] text-[#2563eb]">
                        Availability Management
                      </h4>
                      <p className="mt-1 text-sm text-[#64748b]">
                        Add one or more schedule slots for the doctor.
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7fb] bg-white px-4 py-2 text-sm text-[#2563eb]">
                    <ShieldCheck className="h-4 w-4" />
                    Must have one schedule slot
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_1.2fr_auto]">
                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      disabled={!editing}
                      min={todayISO()}
                      className={buildInputClass(editing)}
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c8aa5]">
                      Time *
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      disabled={!editing}
                      className={buildInputClass(editing)}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!editing) return;
                        if (newDate && !doc.schedule?.[newDate])
                          addDate(newDate);
                        if (newDate && newTime) {
                          addSlot(newDate, newTime);
                          setNewTime("");
                        }
                      }}
                      disabled={!editing}
                      className={`h-12 w-full rounded-[18px] px-5 text-sm font-semibold md:w-[220px] ${
                        editing
                          ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                          : "cursor-not-allowed bg-[#e9eef7] text-[#94a3b8]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Slot
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-[20px] border border-dashed border-[#d7e2f3] bg-white p-4">
                  {scheduleDates.length === 0 ? (
                    <p className="text-sm text-[#94a3b8]">
                      No schedule slot added yet. Add a date and time to create
                      availability.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {scheduleDates.map((dateStr) => (
                        <div
                          key={dateStr}
                          className="rounded-[18px] border border-[#edf1f7] bg-[#fbfdff] p-4"
                        >
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm font-semibold text-[#0f172a]">
                              {dateStr}
                            </div>

                            <button
                              type="button"
                              onClick={() => editing && removeDate(dateStr)}
                              disabled={!editing}
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${
                                editing
                                  ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                  : "cursor-not-allowed bg-[#f8fafc] text-[#c0c8d8]"
                              }`}
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove Date
                            </button>
                          </div>

                          {(doc.schedule?.[dateStr] || []).length === 0 ? (
                            <p className="text-sm text-[#94a3b8]">
                              No slots added for this date yet.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(doc.schedule?.[dateStr] || []).map((slot) => (
                                <div
                                  key={`${dateStr}-${slot}`}
                                  className="inline-flex items-center gap-2 rounded-full border border-[#dbe7fb] bg-[#eef4fb] px-3 py-2 text-sm text-[#2563eb]"
                                >
                                  <span>{slot}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      editing && removeSlot(dateStr, slot)
                                    }
                                    disabled={!editing}
                                    className={`rounded-full ${
                                      editing
                                        ? "text-rose-500 hover:text-rose-700"
                                        : "cursor-not-allowed text-[#c0c8d8]"
                                    }`}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* footer actions */}
              <div className="mt-8 flex flex-col gap-4 border-t border-[#eef2f7] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#94a3b8]">
                  Main categories preserved: doctor profile, credentials,
                  professional details, availability, and image.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {!editing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="rounded-[18px] border border-[#e5eaf5] bg-white px-5 py-3 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc]"
                      >
                        Edit Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="rounded-[18px] bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
                      >
                        Back
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="rounded-[18px] border border-[#e5eaf5] bg-white px-5 py-3 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <X className="h-4 w-4" />
                          Cancel
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-[18px] bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save Profile
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {saveMessage && (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                    saveMessage.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : saveMessage.type === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
