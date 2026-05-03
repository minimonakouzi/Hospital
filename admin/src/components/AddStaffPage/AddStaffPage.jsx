import React, { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { adminAuthHeaders } from "../../utils/adminAuthHeaders";

const API_BASE = "http://localhost:4000";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  status: "Active",
  password: "",
  confirmPassword: "",
};

const STAFF_DEPARTMENTS = [
  "Services",
  "Laboratory",
  "Radiology",
  "Billing",
  "Reception",
  "Pharmacy",
  "Administration",
];

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function inputClass(hasError) {
  return [
    "h-11 w-full rounded-2xl border bg-[#f8fbff] px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:bg-white",
    hasError
      ? "border-rose-300 focus:border-rose-400"
      : "border-slate-200 focus:border-blue-300",
  ].join(" ");
}

export default function AddStaffPage() {
  const { getToken } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [errors, setErrors] = useState({});

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: false }));
    setMessage({ type: "", text: "" });
  }

  function validate() {
    const next = {};
    ["name", "email", "phone", "department", "password", "confirmPassword"].forEach(
      (field) => {
        if (!String(form[field] || "").trim()) next[field] = true;
      },
    );

    if (form.password && form.password.length < 8) next.password = true;
    if (form.password !== form.confirmPassword) {
      next.password = true;
      next.confirmPassword = true;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      setMessage({
        type: "error",
        text:
          form.password !== form.confirmPassword
            ? "Passwords do not match."
            : "Please complete all required fields.",
      });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const res = await fetch(`${API_BASE}/api/staff`, {
        method: "POST",
        headers: await adminAuthHeaders(getToken, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          department: form.department.trim(),
          status: form.status,
          password: form.password,
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || "Failed to create staff member.");
      }

      setForm(initialForm);
      setMessage({
        type: "success",
        text: body?.message || "Staff member created successfully.",
      });
    } catch (err) {
      console.error("create staff error:", err);
      setMessage({
        type: "error",
        text: err?.message || "Network error while creating staff member.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
        <div className="border-b border-[#dbe6f7] bg-[#eef4fb] px-6 py-6 sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <UserRoundPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Add Staff
              </h2>
              <p className="mt-1 text-sm text-slate-500">Create a staff account.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-8 sm:px-8">
          {message.text ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                message.type === "success"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-rose-100 bg-rose-50 text-rose-700"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Name" required>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={inputClass(errors.name)}
                placeholder="Staff member name"
              />
            </Field>

            <Field label="Email" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className={inputClass(errors.email)}
                placeholder="staff@revive.com"
              />
            </Field>

            <Field label="Phone" required>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className={inputClass(errors.phone)}
                placeholder="+961 ..."
              />
            </Field>

            <Field label="Department" required>
              <select
                value={form.department}
                onChange={(e) => updateField("department", e.target.value)}
                className={inputClass(errors.department)}
              >
                <option value="">Select department...</option>
                {STAFF_DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status" required>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className={inputClass(false)}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>

            <div className="hidden md:block" />

            <Field label="Password" required>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className={`${inputClass(errors.password)} pr-12`}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>

            <Field label="Confirm Password" required>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className={`${inputClass(errors.confirmPassword)} pr-12`}
                  placeholder="Repeat password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {loading ? "Creating..." : "Create Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
