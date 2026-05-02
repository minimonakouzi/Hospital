import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import {
  AlertCircle,
  CalendarDays,
  Download,
  FileText,
  Loader2,
  Pill,
  Printer,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api`;

function itemId(item = {}) {
  return item?._id || item?.id || "";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusTone(status = "") {
  if (status === "Cancelled") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (status === "Completed") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function doctorName(doctor = {}) {
  return doctor?.name || doctor?.email || "Doctor";
}

function patientName(patient = {}) {
  return patient?.name || patient?.email || patient?.phone || patient?.patientCode || "Patient";
}

function PrintablePrescription({ prescription }) {
  return (
    <div className="print:block">
      <div className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm print:border-0 print:shadow-none">
        <div className="flex flex-col gap-4 border-b border-[#e8eef8] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Revive Hospital eRx</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#0f172a]">Digital Prescription</h2>
            <p className="mt-1 text-sm text-[#64748b]">Issued {formatDate(prescription.createdAt)}</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone(prescription.status)}`}>
            {prescription.status}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <InfoLine icon={<UserRound className="h-4 w-4" />} label="Patient" value={`${patientName(prescription.patientId)}${prescription.patientId?.patientCode ? ` (${prescription.patientId.patientCode})` : ""}`} />
          <InfoLine icon={<Stethoscope className="h-4 w-4" />} label="Doctor" value={doctorName(prescription.doctorId)} />
          <InfoLine icon={<CalendarDays className="h-4 w-4" />} label="Date" value={formatDate(prescription.createdAt)} />
          <InfoLine icon={<FileText className="h-4 w-4" />} label="Diagnosis" value={prescription.diagnosis || "-"} />
        </div>

        <div className="mt-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[#64748b]">Medicines</h3>
          <div className="grid gap-3">
            {(prescription.medicines || []).map((medicine, index) => (
              <div key={index} className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4">
                <p className="font-bold text-[#0f172a]">{medicine.medicineName}</p>
                <p className="mt-2 text-sm text-[#334155]">
                  {medicine.dosage} | {medicine.frequency} | {medicine.duration}
                </p>
                {medicine.instructions ? <p className="mt-2 text-sm text-[#64748b]">{medicine.instructions}</p> : null}
              </div>
            ))}
          </div>
        </div>

        {prescription.notes ? (
          <div className="mt-5 rounded-2xl bg-[#f8fbff] p-4 ring-1 ring-[#dbe6f7]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">Notes</p>
            <p className="mt-2 text-sm text-[#334155]">{prescription.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InfoLine({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-[#f8fbff] p-4 ring-1 ring-[#dbe6f7]">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">
        <span className="text-[#2563eb]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-[#0f172a]">{value || "-"}</p>
    </div>
  );
}

function MyPrescriptionsContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const clerk = useClerk();
  const [prescriptions, setPrescriptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPrescriptions = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const token = await getToken();
      const res = await fetch(`${API_BASE}/prescriptions/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Unable to load prescriptions. Please try again.");
      setPrescriptions(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      setPrescriptions([]);
      setError(err?.message || "Unable to load prescriptions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const activeCount = useMemo(
    () => prescriptions.filter((item) => item.status === "Active").length,
    [prescriptions]
  );

  function printSelected() {
    window.print();
  }

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen bg-[#f5f9ff] px-4 pb-16 pt-28">
        <div className="mx-auto flex max-w-5xl items-center justify-center rounded-3xl border border-[#dbe6f7] bg-white p-10 text-sm font-semibold text-[#2563eb] shadow-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading prescriptions...
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-[#f5f9ff] px-4 pb-16 pt-28">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#dbe6f7] bg-white p-8 text-center shadow-sm">
          <FileText className="mx-auto h-10 w-10 text-[#2563eb]" />
          <h1 className="mt-4 text-3xl font-extrabold text-[#0f172a]">My Prescriptions</h1>
          <p className="mt-2 text-sm text-[#64748b]">Sign in to view doctor-created prescriptions.</p>
          <button type="button" onClick={() => clerk.openSignIn()} className="mt-6 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white">
            Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f9ff] px-4 pb-16 pt-28 print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl space-y-6 print:hidden">
        <section className="rounded-3xl border border-[#dbe6f7] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#2563eb] ring-1 ring-blue-100">
                <Pill className="h-3.5 w-3.5" />
                Patient eRx
              </div>
              <h1 className="text-3xl font-extrabold text-[#0f172a]">My Prescriptions</h1>
              <p className="mt-2 text-sm text-[#64748b]">View, print, and download prescriptions created by your doctors.</p>
            </div>
            <div className="rounded-2xl bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#334155] ring-1 ring-[#dbe6f7]">
              {activeCount} active prescription{activeCount === 1 ? "" : "s"}
            </div>
          </div>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            {error}
          </div>
        ) : null}

        {prescriptions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white p-10 text-center text-sm text-[#64748b]">
            <FileText className="mx-auto mb-3 h-10 w-10 text-[#2563eb]" />
            No prescriptions found.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {prescriptions.map((prescription) => (
              <article key={itemId(prescription)} className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone(prescription.status)}`}>
                      {prescription.status}
                    </span>
                    <h2 className="mt-3 text-lg font-extrabold text-[#0f172a]">{prescription.diagnosis || "Prescription"}</h2>
                    <p className="mt-1 text-sm text-[#64748b]">Dr. {doctorName(prescription.doctorId)} | {formatDate(prescription.createdAt)}</p>
                  </div>
                  <button type="button" onClick={() => setSelected(prescription)} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-bold text-white">
                    <FileText className="h-4 w-4" />
                    View
                  </button>
                </div>
                <div className="mt-4 text-sm text-[#64748b]">{prescription.medicines?.length || 0} medicine{prescription.medicines?.length === 1 ? "" : "s"}</div>
              </article>
            ))}
          </div>
        )}

        {selected ? (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-bold text-[#0f172a]">Prescription</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={printSelected} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-50 px-3 text-sm font-bold text-[#2563eb]">
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button type="button" onClick={printSelected} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dbe6f7] bg-white px-3 text-sm font-bold text-[#334155]">
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button type="button" onClick={() => setSelected(null)} className="rounded-2xl border border-slate-200 p-2 text-slate-500">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <PrintablePrescription prescription={selected} />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="hidden print:block">
          <PrintablePrescription prescription={selected} />
        </div>
      ) : null}
    </main>
  );
}

export default function MyPrescriptions() {
  return (
    <div>
      <Navbar />
      <MyPrescriptionsContent />
      <Footer />
    </div>
  );
}
