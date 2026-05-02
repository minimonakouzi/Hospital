import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  Edit3,
  Eye,
  EyeOff,
  HeartPulse,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import {
  InfoPill,
  PageBody,
  PageHeader,
  SectionCard,
} from "../../nurse/shared/NurseUi";
import { getDashboardData, initials } from "../../nurse/shared/nurseData";

const API_BASE = "http://localhost:4000/api";
const NURSE_TOKEN_KEY = "nurseToken_v1";

const emptyForm = {
  name: "",
  phone: "",
  department: "",
  shift: "Morning",
  status: "Active",
  specialization: "",
  experience: "",
  notes: "",
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:bg-white disabled:text-[#64748b]";

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

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
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] transition hover:text-[#2563eb]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

export default function NurseProfile() {
  const { nurse, dashboard, refreshDashboard } = useOutletContext();
  const data = getDashboardData(dashboard);
  const profile = data.nurse || nurse || {};
  const displayName = profile.name || "Nurse";
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
      name: profile.name || "",
      phone: profile.phone || "",
      department: profile.department || "",
      shift: profile.shift || "Morning",
      status: profile.status || "Active",
      specialization: profile.specialization || "",
      experience: profile.experience || "",
      notes: profile.notes || "",
    });
  }, [
    profile.name,
    profile.phone,
    profile.department,
    profile.shift,
    profile.status,
    profile.specialization,
    profile.experience,
    profile.notes,
  ]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage({ type: "", text: "" });
  }

  function cancelEdit() {
    setEditing(false);
    setMessage({ type: "", text: "" });
    setForm({
      name: profile.name || "",
      phone: profile.phone || "",
      department: profile.department || "",
      shift: profile.shift || "Morning",
      status: profile.status || "Active",
      specialization: profile.specialization || "",
      experience: profile.experience || "",
      notes: profile.notes || "",
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
      const token = localStorage.getItem(NURSE_TOKEN_KEY);
      const res = await fetch(`${API_BASE}/nurses/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to update nurse profile.");
      }

      await refreshDashboard?.();
      setEditing(false);
      setMessage({
        type: "success",
        text: body?.message || "Profile updated successfully.",
      });
    } catch (err) {
      console.error("update nurse profile error:", err);
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
      const token = localStorage.getItem(NURSE_TOKEN_KEY);
      const res = await fetch(`${API_BASE}/nurses/me/password`, {
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
      console.error("change nurse password error:", err);
      setPasswordMessage({
        type: "error",
        text: err?.message || "Unable to change password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        eyebrow="Profile"
        title="Nurse Profile"
        subtitle="Account and shift details"
        action={
          !editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            >
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </button>
          ) : null
        }
      />

      <PageBody>
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

        <section className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#2563eb] text-2xl font-bold text-white">
                {initials(displayName)}
              </div>
              <h2 className="mt-4 text-xl font-bold text-[#0f172a]">
                {displayName}
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#2563eb]">
                {profile.department || "Nursing"}
              </p>
              <span className="mt-4 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                {profile.status || "Active"}
              </span>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </button>
              ) : null}
            </div>
          </div>

          <SectionCard
            icon={<UserRound className="h-5 w-5" />}
            title="Profile Details"
            subtitle="Nurse portal information"
          >
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
                  <input value={profile.email || ""} className={inputClass} disabled />
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
                <Field label="Shift">
                  <select
                    value={form.shift}
                    onChange={(e) => updateField("shift", e.target.value)}
                    className={inputClass}
                  >
                    <option>Morning</option>
                    <option>Evening</option>
                    <option>Night</option>
                    <option>Rotating</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                    className={inputClass}
                  >
                    <option>Active</option>
                    <option>On Leave</option>
                    <option>Inactive</option>
                  </select>
                </Field>
                <Field label="Specialization">
                  <input
                    value={form.specialization}
                    onChange={(e) => updateField("specialization", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Experience">
                  <input
                    value={form.experience}
                    onChange={(e) => updateField("experience", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                    Notes
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    className="min-h-[96px] w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:bg-white"
                  />
                </label>
                <div className="flex flex-wrap gap-3 sm:col-span-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-2 rounded-full border border-[#dbe6f7] bg-white px-4 py-2 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fbff]"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:bg-blue-300"
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
                <InfoPill
                  icon={<Mail className="h-3.5 w-3.5 text-[#2563eb]" />}
                  label="Email"
                  value={profile.email}
                />
                <InfoPill
                  icon={<Phone className="h-3.5 w-3.5 text-[#2563eb]" />}
                  label="Phone"
                  value={profile.phone}
                />
                <InfoPill
                  icon={<HeartPulse className="h-3.5 w-3.5 text-[#2563eb]" />}
                  label="Department"
                  value={profile.department}
                />
                <InfoPill
                  icon={<CalendarDays className="h-3.5 w-3.5 text-[#2563eb]" />}
                  label="Shift"
                  value={profile.shift}
                />
                <InfoPill
                  icon={<Stethoscope className="h-3.5 w-3.5 text-[#2563eb]" />}
                  label="Specialization"
                  value={profile.specialization || "Not added"}
                />
                <InfoPill
                  icon={<Activity className="h-3.5 w-3.5 text-[#2563eb]" />}
                  label="Experience"
                  value={profile.experience || "Not added"}
                />
                <InfoPill
                  icon={<BadgeCheck className="h-3.5 w-3.5 text-[#2563eb]" />}
                  label="Status"
                  value={profile.status || "Active"}
                />
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          icon={<KeyRound className="h-5 w-5" />}
          title="Change Password"
          subtitle="Update your nurse portal password"
        >
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

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={changePassword}
              disabled={passwordSaving}
              className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:bg-blue-300"
            >
              {passwordSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {passwordSaving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </SectionCard>
      </PageBody>
    </div>
  );
}
