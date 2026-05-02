import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BadgeCheck,
  BriefcaseMedical,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { StaffPageHeader } from "../../staff/StaffLayout/StaffLayout";

const API_BASE = "http://localhost:4000";
const STAFF_TOKEN_KEY = "staffToken_v1";

const emptyForm = {
  name: "",
  phone: "",
  department: "",
  status: "Active",
};

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-bold text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "S"
  );
}

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white disabled:text-slate-500";

function PasswordInput({ label, value, onChange, visible, onToggle }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-11`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-blue-700"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

export default function StaffProfile() {
  const { staff, refreshStaff } = useOutletContext();
  const displayName = staff?.name || "Staff";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    setForm({
      name: staff?.name || "",
      phone: staff?.phone || "",
      department: staff?.department || "",
      status: staff?.status || "Active",
    });
  }, [staff?.name, staff?.phone, staff?.department, staff?.status]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage({ type: "", text: "" });
  }

  function cancelEdit() {
    setEditing(false);
    setMessage({ type: "", text: "" });
    setForm({
      name: staff?.name || "",
      phone: staff?.phone || "",
      department: staff?.department || "",
      status: staff?.status || "Active",
    });
  }

  async function saveProfile() {
    if (!form.name.trim() || !form.phone.trim() || !form.department.trim()) {
      setMessage({
        type: "error",
        text: "Name, phone, and department are required.",
      });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      const token = localStorage.getItem(STAFF_TOKEN_KEY);
      const res = await fetch(`${API_BASE}/api/staff/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to update staff profile.");
      }

      await refreshStaff?.();
      setEditing(false);
      setMessage({
        type: "success",
        text: body?.message || "Profile updated successfully.",
      });
    } catch (err) {
      console.error("update staff profile error:", err);
      setMessage({
        type: "error",
        text: err?.message || "Unable to update profile.",
      });
    } finally {
      setSaving(false);
    }
  }

  function updatePasswordField(field, value) {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordMessage({ type: "", text: "" });
  }

  async function changePassword() {
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordMessage({
        type: "error",
        text: "All password fields are required.",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New password and confirm password do not match.",
      });
      return;
    }

    try {
      setPasswordSaving(true);
      setPasswordMessage({ type: "", text: "" });
      const token = localStorage.getItem(STAFF_TOKEN_KEY);
      const res = await fetch(`${API_BASE}/api/staff/me/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to change password.");
      }

      setPasswordForm(emptyPasswordForm);
      setPasswordMessage({
        type: "success",
        text: body?.message || "Password changed successfully.",
      });
    } catch (err) {
      console.error("change staff password error:", err);
      setPasswordMessage({
        type: "error",
        text: err?.message || "Unable to change password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div>
      <StaffPageHeader
        title="Profile"
        subtitle="Review staff account details and password settings."
        breadcrumb="Staff Portal / Profile"
        action={
          !editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </button>
          ) : null
        }
      />

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-5">
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

          <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
            <section className="rounded-3xl border border-[#dbe6f7] bg-white p-6 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white shadow-sm ring-8 ring-blue-50">
                {initials(displayName)}
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                {displayName}
              </h2>
              <p className="mt-1 text-sm font-semibold text-blue-700">
                {staff?.department || "Services"}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                  {staff?.status || "Active"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {staff?.role || "staff"}
                </span>
              </div>
            </section>

            <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm transition duration-200 hover:shadow-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Account Details</h2>
                  <p className="text-sm text-slate-500">Staff profile</p>
                </div>
              </div>

              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name">
                    <input
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Email">
                    <input value={staff?.email || ""} className={inputClass} disabled />
                  </Field>
                  <Field label="Phone">
                    <input
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Department">
                    <input
                      value={form.department}
                      onChange={(e) => updateField("department", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(e) => updateField("status", e.target.value)}
                      className={inputClass}
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </Field>
                  <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveProfile}
                      disabled={saving}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard
                    icon={<Mail className="h-3.5 w-3.5 text-blue-600" />}
                    label="Email"
                    value={staff?.email}
                  />
                  <InfoCard
                    icon={<Phone className="h-3.5 w-3.5 text-blue-600" />}
                    label="Phone"
                    value={staff?.phone}
                  />
                  <InfoCard
                    icon={<BriefcaseMedical className="h-3.5 w-3.5 text-blue-600" />}
                    label="Department"
                    value={staff?.department}
                  />
                  <InfoCard
                    icon={<BadgeCheck className="h-3.5 w-3.5 text-blue-600" />}
                    label="Role"
                    value={staff?.role || "staff"}
                  />
                </div>
              )}
            </section>
          </div>

          <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Change Password</h2>
                <p className="text-sm text-slate-500">Update your staff portal password</p>
              </div>
            </div>

            {passwordMessage.text ? (
              <div
                className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  passwordMessage.type === "success"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-rose-100 bg-rose-50 text-rose-700"
                }`}
              >
                {passwordMessage.text}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              <PasswordInput
                label="Current Password"
                value={passwordForm.currentPassword}
                onChange={(value) => updatePasswordField("currentPassword", value)}
                visible={visiblePasswords.currentPassword}
                onToggle={() =>
                  setVisiblePasswords((prev) => ({
                    ...prev,
                    currentPassword: !prev.currentPassword,
                  }))
                }
              />
              <PasswordInput
                label="New Password"
                value={passwordForm.newPassword}
                onChange={(value) => updatePasswordField("newPassword", value)}
                visible={visiblePasswords.newPassword}
                onToggle={() =>
                  setVisiblePasswords((prev) => ({
                    ...prev,
                    newPassword: !prev.newPassword,
                  }))
                }
              />
              <PasswordInput
                label="Confirm Password"
                value={passwordForm.confirmPassword}
                onChange={(value) => updatePasswordField("confirmPassword", value)}
                visible={visiblePasswords.confirmPassword}
                onToggle={() =>
                  setVisiblePasswords((prev) => ({
                    ...prev,
                    confirmPassword: !prev.confirmPassword,
                  }))
                }
              />
            </div>

            <div className="mt-5 rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-xs leading-5 text-slate-500">
              Password changes apply to this Staff portal account only.
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={changePassword}
                disabled={passwordSaving}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300 sm:w-auto"
              >
                {passwordSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
