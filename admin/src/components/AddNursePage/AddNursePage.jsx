import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserRoundPlus,
  XCircle,
} from "lucide-react";
import { adminAuthHeaders } from "../../utils/adminAuthHeaders";

const API_BASE = "http://localhost:4000/api";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  shift: "Morning",
  experience: "",
  specialization: "",
  status: "Active",
  notes: "",
  password: "",
  confirmPassword: "",
};

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      {children} {required ? <span className="text-rose-500">*</span> : null}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", icon: Icon }) {
  return (
    <div className="relative">
      {Icon ? (
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      ) : null}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white ${
          Icon ? "pl-11" : ""
        }`}
      />
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, visible, onToggle }) {
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function AddNursePage() {
  const { getToken } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4200);
    return () => clearTimeout(timer);
  }, [toast.show]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function showToast(type, message) {
    setToast({ show: true, type, message });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const required = ["name", "email", "phone", "department", "shift", "password"];
    const missing = required.some((field) => !String(form[field]).trim());

    if (missing) {
      showToast(
        "error",
        "Please fill name, email, phone, department, shift, and password.",
      );
      return;
    }

    if (form.password.length < 8) {
      showToast("error", "Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      showToast("error", "Password and confirm password must match.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        department: form.department.trim(),
        shift: form.shift,
        status: form.status || "Active",
        experience: form.experience.trim(),
        specialization: form.specialization.trim(),
        notes: form.notes.trim(),
        password: form.password,
      };

      const res = await fetch(`${API_BASE}/nurses`, {
        method: "POST",
        headers: await adminAuthHeaders(getToken, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        showToast("error", body?.message || "Failed to create nurse.");
        return;
      }

      showToast("success", body?.message || "Nurse created successfully.");
      setForm(initialForm);
    } catch (err) {
      console.error("create nurse error:", err);
      showToast("error", "Network error while creating nurse.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {toast.show && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm ${
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

      <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6f7] bg-[#eef4fb] px-3 py-1 text-xs font-semibold text-[#2563eb]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Nurse management
            </div>
            <h1 className="mt-4 text-[1.9rem] font-bold tracking-tight text-slate-900">
              Add Nurse
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Create a nurse account for portal access and shift management.
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm"
      >
        <div className="border-b border-[#dbe6f7] bg-[#eef4fb] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <UserRoundPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Nurse Profile
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Required fields create a backend nurse login.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_300px] sm:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <FieldLabel required>Full Name</FieldLabel>
              <TextInput
                value={form.name}
                onChange={(value) => updateField("name", value)}
                placeholder="Nurse Maya Haddad"
              />
            </div>

            <div>
              <FieldLabel required>Email Address</FieldLabel>
              <TextInput
                type="email"
                icon={Mail}
                value={form.email}
                onChange={(value) => updateField("email", value)}
                placeholder="nurse@revive.com"
              />
            </div>

            <div>
              <FieldLabel required>Phone Number</FieldLabel>
              <TextInput
                icon={Phone}
                value={form.phone}
                onChange={(value) => updateField("phone", value)}
                placeholder="+961 70 000 000"
              />
            </div>

            <div>
              <FieldLabel required>Department</FieldLabel>
              <select
                value={form.department}
                onChange={(e) => updateField("department", e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              >
                <option value="">Select department...</option>
                <option>Emergency</option>
                <option>ICU</option>
                <option>Pediatrics</option>
                <option>Cardiology</option>
                <option>Surgery</option>
                <option>General Ward</option>
              </select>
            </div>

            <div>
              <FieldLabel>Shift</FieldLabel>
              <select
                value={form.shift}
                onChange={(e) => updateField("shift", e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              >
                <option>Morning</option>
                <option>Evening</option>
                <option>Night</option>
                <option>Rotating</option>
              </select>
            </div>

            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              >
                <option>Active</option>
                <option>On Leave</option>
                <option>Inactive</option>
              </select>
            </div>

            <div>
              <FieldLabel required>Password</FieldLabel>
              <PasswordInput
                value={form.password}
                onChange={(value) => updateField("password", value)}
                placeholder="Minimum 8 characters"
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />
            </div>

            <div>
              <FieldLabel required>Confirm Password</FieldLabel>
              <PasswordInput
                value={form.confirmPassword}
                onChange={(value) => updateField("confirmPassword", value)}
                placeholder="Repeat password"
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
              />
            </div>

            <div>
              <FieldLabel>Experience</FieldLabel>
              <TextInput
                value={form.experience}
                onChange={(value) => updateField("experience", value)}
                placeholder="4 years"
              />
            </div>

            <div>
              <FieldLabel>Specialization</FieldLabel>
              <TextInput
                value={form.specialization}
                onChange={(value) => updateField("specialization", value)}
                placeholder="ICU care, triage, pediatrics..."
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Notes</FieldLabel>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Certifications, language coverage, or unit preferences..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
              />
            </div>
          </div>

          <aside className="lg:pt-1">
            <div className="rounded-3xl border border-[#dbe6f7] bg-[#f8fbff] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Create Record
                  </h3>
                  <p className="text-sm text-slate-500">Backend connected</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  "Password is hashed",
                  "No Clerk nurse user",
                  "Admin-only API access",
                  "Optional profile details",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600"
                  >
                    <BadgeCheck className="h-4 w-4 text-blue-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-slate-400">
            Nurse credentials are stored with hashed passwords.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setForm(initialForm)}
              disabled={loading}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserRoundPlus className="h-4 w-4" />
                  Add Nurse
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
