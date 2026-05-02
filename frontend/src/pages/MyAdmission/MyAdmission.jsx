import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import {
  AlertCircle,
  BedDouble,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock3,
  DoorOpen,
  FileText,
  Loader2,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000";
const ADMISSION_API_URL = `${API_BASE_URL.replace(/\/$/, "")}/api/admissions/my-admission`;

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function textOrFallback(value, fallback = "Not available") {
  return value ? String(value) : fallback;
}

function getDoctorName(doctor) {
  if (!doctor) return "Not assigned";
  return doctor.name || doctor.fullName || doctor.email || "Doctor";
}

function getNurseName(nurse) {
  if (!nurse) return "Not assigned";
  return [nurse.name || nurse.fullName || nurse.email || "Nurse", nurse.nurseCode].filter(Boolean).join(" - ");
}

function getPatientCode(admission) {
  return admission?.patientId?.patientCode || "";
}

function getWardName(ward) {
  return ward?.wardName || "Ward not available";
}

function getRoomNumber(room) {
  return room?.roomNumber || "Not available";
}

function getBedNumber(bed) {
  return bed?.bedNumber || "Not available";
}

function getPatientDisplayName(user, activeAdmission) {
  const fullName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  if (fullName) return fullName;
  return activeAdmission?.patientId?.phone || user?.primaryEmailAddress?.emailAddress || "Patient";
}

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Transferred: "bg-sky-50 text-sky-700 ring-sky-200",
    Discharged: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${
        styles[status] || "bg-blue-50 text-blue-700 ring-blue-200"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function InfoTile({ icon, label, value }) {
  const IconComponent = icon;

  return (
    <div className="rounded-2xl border border-[#dbe6f7] bg-white p-4 shadow-sm">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
        <IconComponent className="h-5 w-5" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#64748b]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#0f172a]">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white/85 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
        <ClipboardList className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-[#0f172a]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748b]">{description}</p>
    </div>
  );
}

function AdmissionSummary({ admission, user }) {
  const patientName = getPatientDisplayName(user, admission);
  const readablePatientCode = getPatientCode(admission);

  return (
    <section className="rounded-[2rem] border border-[#dbe6f7] bg-white p-5 shadow-[0_18px_50px_rgba(30,64,175,0.08)] sm:p-6">
      <div className="flex flex-col gap-4 border-b border-[#e8eef8] pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={admission.status} />
            {admission.finalStatus ? (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                {admission.finalStatus}
              </span>
            ) : null}
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">
            Current Admission
          </h2>
          <p className="mt-1 text-sm text-[#64748b]">
            Admission information for {patientName}
          </p>
          {readablePatientCode ? (
            <p className="mt-2 text-sm font-bold text-[#2563eb]">
              Patient ID: {readablePatientCode}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#334155] ring-1 ring-[#dbe6f7]">
          <span className="text-[#64748b]">Admitted:</span>{" "}
          {formatDate(admission.admissionDate)}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoTile icon={Building2} label="Ward" value={getWardName(admission.wardId)} />
        <InfoTile icon={DoorOpen} label="Room" value={getRoomNumber(admission.roomId)} />
        <InfoTile icon={BedDouble} label="Bed" value={getBedNumber(admission.bedId)} />
        <InfoTile icon={Stethoscope} label="Doctor" value={getDoctorName(admission.doctorId)} />
        <InfoTile icon={UserRound} label="Nurse" value={getNurseName(admission.nurseId)} />
        <InfoTile
          icon={CalendarDays}
          label="Expected Discharge"
          value={formatDate(admission.expectedDischargeDate)}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-[#f8fbff] p-4 ring-1 ring-[#dbe6f7]">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#0f172a]">
            <FileText className="h-4 w-4 text-[#2563eb]" />
            Reason for Admission
          </div>
          <p className="text-sm leading-6 text-[#475569]">
            {textOrFallback(admission.reasonForAdmission)}
          </p>
        </div>

        <div className="rounded-2xl bg-[#f8fbff] p-4 ring-1 ring-[#dbe6f7]">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#0f172a]">
            <Clock3 className="h-4 w-4 text-[#2563eb]" />
            Discharge Details
          </div>
          <p className="text-sm leading-6 text-[#475569]">
            <span className="font-semibold text-[#334155]">Date:</span>{" "}
            {formatDate(admission.dischargeDate)}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#475569]">
            {textOrFallback(admission.dischargeSummary, "No discharge summary available.")}
          </p>
        </div>
      </div>
    </section>
  );
}

function HistoryCard({ admission }) {
  return (
    <article className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <StatusBadge status={admission.status} />
          <h3 className="mt-3 text-lg font-extrabold text-[#0f172a]">
            {getWardName(admission.wardId)}
          </h3>
          <p className="mt-1 text-sm text-[#64748b]">
            Room {getRoomNumber(admission.roomId)} - Bed {getBedNumber(admission.bedId)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f8fbff] px-3 py-2 text-xs font-bold text-[#334155] ring-1 ring-[#dbe6f7]">
          {admission.finalStatus || "No final status"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-[#475569] sm:grid-cols-2">
        <p>
          <span className="font-bold text-[#0f172a]">Admitted:</span>{" "}
          {formatDate(admission.admissionDate)}
        </p>
        <p>
          <span className="font-bold text-[#0f172a]">Discharged:</span>{" "}
          {formatDate(admission.dischargeDate)}
        </p>
        <p>
          <span className="font-bold text-[#0f172a]">Doctor:</span>{" "}
          {getDoctorName(admission.doctorId)}
        </p>
        <p>
          <span className="font-bold text-[#0f172a]">Nurse:</span>{" "}
          {getNurseName(admission.nurseId)}
        </p>
      </div>

      {admission.dischargeSummary ? (
        <p className="mt-4 rounded-2xl bg-[#f8fbff] p-4 text-sm leading-6 text-[#475569] ring-1 ring-[#dbe6f7]">
          {admission.dischargeSummary}
        </p>
      ) : null}
    </article>
  );
}

function MyAdmissionContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeAdmission, setActiveAdmission] = useState(null);
  const [history, setHistory] = useState([]);

  const loadAdmission = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const response = await fetch(ADMISSION_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "Unable to load admission details. Please try again.");
      }

      setActiveAdmission(payload.activeAdmission || null);
      setHistory(Array.isArray(payload.history) ? payload.history : []);
      setMessage(payload.message || "");
    } catch (err) {
      setError(err.message || "Unable to load admission details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    loadAdmission();
  }, [loadAdmission]);

  const hasHistory = history.length > 0;

  const pageSummary = useMemo(() => {
    if (activeAdmission) return "Your current hospital admission is available below.";
    if (hasHistory) return "No active admission found. Your previous admission history is below.";
    return message || "No active admission found.";
  }, [activeAdmission, hasHistory, message]);

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen bg-[#f5f9ff] px-4 pb-16 pt-28">
        <div className="mx-auto flex max-w-6xl items-center justify-center rounded-3xl border border-[#dbe6f7] bg-white p-10 shadow-sm">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-[#2563eb]" />
          <span className="font-semibold text-[#334155]">Loading your admission details...</span>
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-[#f5f9ff] px-4 pb-16 pt-28">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#dbe6f7] bg-white p-8 text-center shadow-[0_18px_50px_rgba(30,64,175,0.08)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
            <UserRound className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">
            My Admission
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#64748b]">
            Sign in to view your current hospital admission and admission history.
          </p>
          <button
            type="button"
            onClick={() => clerk.openSignIn()}
            className="mt-6 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1d4ed8]"
          >
            Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f9ff] px-4 pb-16 pt-28">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-[#dbe6f7] bg-white p-6 shadow-[0_18px_50px_rgba(30,64,175,0.08)] sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#2563eb] ring-1 ring-blue-100">
                <BedDouble className="h-3.5 w-3.5" />
                Patient Admission
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a] sm:text-4xl">
                My Admission
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748b]">
                View your current hospital admission and admission history.
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#334155] ring-1 ring-[#dbe6f7]">
              {pageSummary}
            </div>
          </div>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {activeAdmission ? (
          <AdmissionSummary admission={activeAdmission} user={user} />
        ) : (
          <EmptyState
            title="No active admission found."
            description="There is no current hospital admission linked to your patient profile."
          />
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">
                Previous Admission History
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Past admission records linked to your patient profile.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2563eb] ring-1 ring-[#dbe6f7]">
              {history.length} record{history.length === 1 ? "" : "s"}
            </span>
          </div>

          {hasHistory ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {history.map((admission) => (
                <HistoryCard key={admission._id} admission={admission} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No previous admission history found."
              description="Previous admissions will appear here after a discharge or future admission cycle."
            />
          )}
        </section>
      </div>
    </main>
  );
}

export default function MyAdmission() {
  return (
    <div>
      <Navbar />
      <MyAdmissionContent />
      <Footer />
    </div>
  );
}
