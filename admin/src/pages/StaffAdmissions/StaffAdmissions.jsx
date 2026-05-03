import React, { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertCircle,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  DoorOpen,
  Eye,
  Loader2,
  LogOut,
  MoveRight,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { StaffPageHeader } from "../../staff/StaffLayout/StaffLayout";
import {
  admitPatient,
  dischargeAdmission,
  fetchAdmissionStats,
  fetchAdmissions,
  fetchDoctors,
  fetchNurseLookups,
  fetchPatientLookups,
  fetchWardBoard,
  transferAdmission,
} from "../../api/staffAdmissionApi";

const FINAL_STATUSES = [
  "Recovered",
  "Referred",
  "Left Against Advice",
  "Deceased",
  "Other",
];
const RELEASE_STATUSES = ["Cleaning", "Available"];
const ADMISSION_STATUSES = ["Active", "Transferred", "Discharged"];

const emptyAdmitForm = {
  patientId: "",
  doctorId: "",
  nurseId: "",
  wardId: "",
  roomId: "",
  bedId: "",
  admissionDate: "",
  expectedDischargeDate: "",
  reasonForAdmission: "",
  notes: "",
};

const emptyTransferForm = {
  newWardId: "",
  newRoomId: "",
  newBedId: "",
  transferReason: "",
  oldBedAfterTransferStatus: "Cleaning",
};

const emptyDischargeForm = {
  dischargeDate: "",
  dischargeSummary: "",
  finalStatus: "Recovered",
  bedAfterDischargeStatus: "Cleaning",
};

function itemId(item = {}) {
  return item?._id || item?.id || "";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayPatient(patient = {}) {
  if (!patient || typeof patient !== "object") return "Unknown patient";
  return (
    patient.fullName ||
    patient.name ||
    patient.phone ||
    patient.email ||
    patient.patientCode ||
    `Patient ${String(itemId(patient)).slice(-6)}`
  );
}

function displayDoctor(doctor = {}) {
  if (!doctor || typeof doctor !== "object") return "Unassigned";
  return (
    doctor.name || doctor.email || `Doctor ${String(itemId(doctor)).slice(-6)}`
  );
}

function displayNurse(nurse = {}) {
  if (!nurse || typeof nurse !== "object") return "Unassigned";
  return (
    nurse.name ||
    nurse.email ||
    nurse.nurseCode ||
    `Nurse ${String(itemId(nurse)).slice(-6)}`
  );
}

function patientCode(patient = {}) {
  return patient?.patientCode || "";
}

function nurseCode(nurse = {}) {
  return nurse?.nurseCode || "";
}

function patientLabel(patient = {}) {
  const code = patientCode(patient) || "Patient";
  const name = displayPatient(patient);
  const contact = patient.email || patient.phone || "";
  return [code, name, contact].filter(Boolean).join(" - ");
}

function nurseLabel(nurse = {}) {
  const code = nurseCode(nurse) || "Nurse";
  const name = displayNurse(nurse);
  const context = [nurse.department, nurse.shift].filter(Boolean).join(" / ");
  return [code, name, context].filter(Boolean).join(" - ");
}

function admissionQrPayload(admission = {}) {
  return JSON.stringify({ admissionId: itemId(admission) });
}

function bedTone(status = "") {
  if (status === "Available")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Occupied") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "Cleaning")
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "Maintenance")
    return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-slate-200 bg-white text-slate-600";
}

function statusBadgeClass(status = "") {
  if (status === "Active" || status === "Available")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "Transferred" || status === "Occupied")
    return "bg-blue-50 text-blue-700 ring-blue-100";
  if (status === "Cleaning") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "Discharged")
    return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadgeClass(status)}`}
    >
      {status || "Unknown"}
    </span>
  );
}

const inputClass =
  "h-11 w-full rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white";

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Notice({ message, onClose }) {
  if (!message.text) return null;
  const success = message.type === "success";
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
        success
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-rose-100 bg-rose-50 text-rose-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {success ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4" />
        )}
        {message.text}
      </div>
      <button type="button" onClick={onClose}>
        <X className="h-4 w-4 opacity-70" />
      </button>
    </div>
  );
}

function StatCard({ label, value, icon, tone = "blue" }) {
  const color =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";
  return (
    <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${color}`}
        >
          {React.createElement(icon, { className: "h-5 w-5" })}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

export default function StaffAdmissions() {
  const [admissions, setAdmissions] = useState([]);
  const [wards, setWards] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    wardId: "",
    doctorId: "",
    dateFrom: "",
    dateTo: "",
    bedStatus: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      const [admissionBody, statsBody, wardBody, doctorBody] =
        await Promise.all([
          fetchAdmissions({
            search: filters.search,
            status: filters.status,
            wardId: filters.wardId,
            doctorId: filters.doctorId,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
          }),
          fetchAdmissionStats(),
          fetchWardBoard(),
          fetchDoctors().catch((err) => ({
            error: err?.message || "Doctor list unavailable.",
          })),
        ]);

      setAdmissions(
        Array.isArray(admissionBody?.data) ? admissionBody.data : [],
      );
      setStats(statsBody?.stats || null);
      setWards(Array.isArray(wardBody?.data) ? wardBody.data : []);
      const nextDoctors = Array.isArray(doctorBody?.data)
        ? doctorBody.data
        : Array.isArray(doctorBody?.doctors)
          ? doctorBody.doctors
          : [];
      setDoctors(nextDoctors);
    } catch (err) {
      console.error("load staff admissions error:", err);
      setAdmissions([]);
      setStats(null);
      setWards([]);
      setMessage({
        type: "error",
        text:
          err?.message || "Unable to load admissions data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    filters.dateFrom,
    filters.dateTo,
    filters.doctorId,
    filters.search,
    filters.status,
    filters.wardId,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredWards = useMemo(() => {
    if (!filters.bedStatus) return wards;
    return wards
      .map((ward) => {
        const rooms = (ward.rooms || [])
          .map((room) => ({
            ...room,
            beds: (room.beds || []).filter(
              (bed) => bed.bedStatus === filters.bedStatus,
            ),
          }))
          .filter((room) => room.beds.length > 0);
        return { ...ward, rooms };
      })
      .filter((ward) => ward.rooms.length > 0);
  }, [filters.bedStatus, wards]);

  const wardOptions = useMemo(
    () =>
      wards.map((ward) => ({
        id: itemId(ward),
        label: ward.wardName || "Unnamed Ward",
      })),
    [wards],
  );

  function roomsForWard(wardId) {
    return wards.find((ward) => itemId(ward) === wardId)?.rooms || [];
  }

  function bedsForRoom(wardId, roomId) {
    return (
      roomsForWard(wardId).find((room) => itemId(room) === roomId)?.beds || []
    );
  }

  function openAdmitModal() {
    setModal({ type: "admit", form: { ...emptyAdmitForm } });
  }

  function openTransferModal(admission) {
    setModal({ type: "transfer", admission, form: { ...emptyTransferForm } });
  }

  function openDischargeModal(admission) {
    setModal({ type: "discharge", admission, form: { ...emptyDischargeForm } });
  }

  function openViewModal(admission) {
    setModal({ type: "view", admission });
  }

  function openQrModal(admission) {
    setModal({ type: "qr", admission });
  }

  function updateModalField(field, value) {
    setModal((current) => {
      if (!current?.form) return current;
      const form = { ...current.form, [field]: value };
      if (field === "wardId" || field === "newWardId") {
        const roomKey = field === "wardId" ? "roomId" : "newRoomId";
        const bedKey = field === "wardId" ? "bedId" : "newBedId";
        form[roomKey] = "";
        form[bedKey] = "";
      }
      if (field === "roomId" || field === "newRoomId") {
        const bedKey = field === "roomId" ? "bedId" : "newBedId";
        form[bedKey] = "";
      }
      return { ...current, form };
    });
  }

  async function submitModal(event) {
    event.preventDefault();
    if (!modal?.form) return;

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      let body;

      if (modal.type === "admit") {
        const { patientId, wardId, roomId, bedId, reasonForAdmission } =
          modal.form;
        if (!patientId || !wardId || !roomId || !bedId || !reasonForAdmission) {
          throw new Error("Patient, ward, room, bed, and reason are required.");
        }
        body = await admitPatient({
          ...modal.form,
          doctorId: modal.form.doctorId || undefined,
          nurseId: modal.form.nurseId || undefined,
        });
      }

      if (modal.type === "transfer") {
        body = await transferAdmission(itemId(modal.admission), modal.form);
      }

      if (modal.type === "discharge") {
        body = await dischargeAdmission(itemId(modal.admission), modal.form);
      }

      setModal(null);
      setMessage({
        type: "success",
        text: body?.message || "Admission action completed.",
      });
      await loadData();
    } catch (err) {
      console.error("submit admission modal error:", err);
      setMessage({
        type: "error",
        text: err?.message || "Unable to complete admission action.",
      });
    } finally {
      setSaving(false);
    }
  }

  const summary = stats || {
    activeAdmissions: 0,
    availableBeds: 0,
    occupiedBeds: 0,
    cleaningBeds: 0,
    maintenanceBeds: 0,
    occupancyPercentage: 0,
  };

  return (
    <div>
      <StaffPageHeader
        title="Admissions"
        subtitle="Manage patient admissions, bed assignments, transfers, and discharges."
        breadcrumb="Staff Portal / Admissions"
        action={
          <button
            type="button"
            onClick={openAdmitModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Admit Patient
          </button>
        }
      />

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              label="Active Admissions"
              value={summary.activeAdmissions || 0}
              icon={ClipboardList}
            />
            <StatCard
              label="Available Beds"
              value={summary.availableBeds || 0}
              icon={CheckCircle2}
              tone="green"
            />
            <StatCard
              label="Occupied Beds"
              value={summary.occupiedBeds || 0}
              icon={BedDouble}
            />
            <StatCard
              label="Cleaning Beds"
              value={summary.cleaningBeds || 0}
              icon={RefreshCw}
              tone="amber"
            />
            <StatCard
              label="Maintenance"
              value={summary.maintenanceBeds || 0}
              icon={Building2}
            />
            <StatCard
              label="Occupancy"
              value={`${summary.occupancyPercentage || 0}%`}
              icon={DoorOpen}
            />
          </section>

          <section className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_150px_170px_170px_145px_145px_145px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${inputClass} pl-11`}
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  placeholder="Search patient, reason, location..."
                />
              </div>
              <select
                className={inputClass}
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="">All statuses</option>
                {ADMISSION_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <select
                className={inputClass}
                value={filters.wardId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, wardId: e.target.value }))
                }
              >
                <option value="">All wards</option>
                {wardOptions.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.label}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={filters.doctorId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, doctorId: e.target.value }))
                }
              >
                <option value="">All doctors</option>
                {doctors.map((doctor) => (
                  <option key={itemId(doctor)} value={itemId(doctor)}>
                    {displayDoctor(doctor)}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={filters.bedStatus}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, bedStatus: e.target.value }))
                }
              >
                <option value="">All beds</option>
                {["Available", "Occupied", "Cleaning", "Maintenance"].map(
                  (status) => (
                    <option key={status}>{status}</option>
                  ),
                )}
              </select>
              <input
                className={inputClass}
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                }
              />
              <input
                className={inputClass}
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                }
              />
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    search: "",
                    status: "",
                    wardId: "",
                    doctorId: "",
                    dateFrom: "",
                    dateTo: "",
                    bedStatus: "",
                  })
                }
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </section>

          <Notice
            message={message}
            onClose={() => setMessage({ type: "", text: "" })}
          />

          <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Bed Availability Board
                </h2>
                <p className="text-sm text-slate-500">
                  Available beds can be selected for admission or transfer.
                </p>
              </div>
              <button
                type="button"
                onClick={loadData}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 text-sm font-bold text-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
            <BedBoard wards={filteredWards} loading={loading} />
          </section>

          <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-16 text-sm font-bold text-blue-700">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading admissions data...
              </div>
            ) : admissions.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                  <ClipboardList className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-slate-950">
                  No admission records found
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Admissions created by staff will appear here.
                </p>
              </div>
            ) : (
              <AdmissionTable
                admissions={admissions}
                onView={openViewModal}
                onQr={openQrModal}
                onTransfer={openTransferModal}
                onDischarge={openDischargeModal}
              />
            )}
          </section>
        </div>
      </div>

      {modal?.type === "admit" ? (
        <AdmitModal
          modal={modal}
          wards={wards}
          doctors={doctors}
          roomsForWard={roomsForWard}
          bedsForRoom={bedsForRoom}
          saving={saving}
          onClose={() => setModal(null)}
          onChange={updateModalField}
          onSubmit={submitModal}
        />
      ) : null}

      {modal?.type === "transfer" ? (
        <TransferModal
          modal={modal}
          wards={wards}
          roomsForWard={roomsForWard}
          bedsForRoom={bedsForRoom}
          saving={saving}
          onClose={() => setModal(null)}
          onChange={updateModalField}
          onSubmit={submitModal}
        />
      ) : null}

      {modal?.type === "discharge" ? (
        <DischargeModal
          modal={modal}
          saving={saving}
          onClose={() => setModal(null)}
          onChange={updateModalField}
          onSubmit={submitModal}
        />
      ) : null}

      {modal?.type === "view" ? (
        <ViewModal admission={modal.admission} onClose={() => setModal(null)} />
      ) : null}

      {modal?.type === "qr" ? (
        <QrModal admission={modal.admission} onClose={() => setModal(null)} />
      ) : null}
    </div>
  );
}

function BedBoard({ wards, loading }) {
  if (loading) {
    return <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />;
  }
  if (!wards.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f8fbff] px-4 py-8 text-center text-sm text-slate-500">
        No ward or bed records found.
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {wards.map((ward) => (
        <div
          key={itemId(ward)}
          className="rounded-2xl border border-slate-200 bg-[#f8fbff] p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-700" />
            <h3 className="font-bold text-slate-950">
              {ward.wardName || "Unnamed ward"}
            </h3>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              Floor {ward.floorNumber || "-"}
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {(ward.rooms || []).map((room) => (
              <div
                key={itemId(room)}
                className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800">
                  <DoorOpen className="h-4 w-4 text-blue-700" />
                  Room {room.roomNumber || "-"}
                  <span className="text-xs font-semibold text-slate-500">
                    {room.roomType || ""}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                  {(room.beds || []).map((bed) => (
                    <div
                      key={itemId(bed)}
                      className={`rounded-2xl border px-3 py-3 text-sm font-bold ${bedTone(bed.bedStatus)}`}
                    >
                      <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4" />
                        Bed {bed.bedNumber || "-"}
                      </div>
                      <div className="mt-1 text-xs font-semibold opacity-80">
                        {bed.bedStatus || "Unknown"}
                      </div>
                    </div>
                  ))}
                  {(room.beds || []).length === 0 ? (
                    <div className="text-sm text-slate-500">No beds.</div>
                  ) : null}
                </div>
              </div>
            ))}
            {(ward.rooms || []).length === 0 ? (
              <div className="text-sm text-slate-500">
                No rooms in this ward.
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdmissionTable({ admissions, onView, onQr, onTransfer, onDischarge }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-[#f8fbff] text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-5 py-4">Patient</th>
            <th className="px-5 py-4">Doctor / Nurse</th>
            <th className="px-5 py-4">Location</th>
            <th className="px-5 py-4">Dates</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {admissions.map((admission) => {
            const discharged = admission.status === "Discharged";
            return (
              <tr
                key={itemId(admission)}
                className="align-top text-sm text-slate-600"
              >
                <td className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-950">
                        {displayPatient(admission.patientId)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-blue-700">
                        {patientCode(admission.patientId) ||
                          "Patient ID pending"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {admission.reasonForAdmission || "-"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-800">
                    {displayDoctor(admission.doctorId)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {displayNurse(admission.nurseId)}
                    {nurseCode(admission.nurseId)
                      ? ` (${nurseCode(admission.nurseId)})`
                      : ""}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-800">
                    {admission.wardId?.wardName || "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Room {admission.roomId?.roomNumber || "-"} | Bed{" "}
                    {admission.bedId?.bedNumber || "-"}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p>{formatDate(admission.admissionDate)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Expected: {formatDate(admission.expectedDischargeDate)}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={admission.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <IconButton
                      icon={Eye}
                      label="View"
                      onClick={() => onView(admission)}
                    />
                    {!discharged ? (
                      <IconButton
                        icon={QrCode}
                        label="Patient QR"
                        onClick={() => onQr(admission)}
                      />
                    ) : null}
                    {!discharged ? (
                      <IconButton
                        icon={MoveRight}
                        label="Transfer"
                        onClick={() => onTransfer(admission)}
                      />
                    ) : null}
                    {!discharged ? (
                      <IconButton
                        icon={LogOut}
                        label="Discharge"
                        onClick={() => onDischarge(admission)}
                        danger
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IconButton({ icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${
        danger
          ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
      }`}
    >
      {React.createElement(icon, { className: "h-3.5 w-3.5" })}
      {label}
    </button>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label
      className={`grid gap-1.5 text-sm font-semibold text-slate-700 ${className}`}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

function AdmitModal({
  modal,
  wards,
  doctors,
  roomsForWard,
  bedsForRoom,
  saving,
  onClose,
  onChange,
  onSubmit,
}) {
  const rooms = roomsForWard(modal.form.wardId);
  const beds = bedsForRoom(modal.form.wardId, modal.form.roomId).filter(
    (bed) => bed.bedStatus === "Available",
  );
  const [patientSearch, setPatientSearch] = useState("");
  const [nurseSearch, setNurseSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [lookupLoading, setLookupLoading] = useState({
    patients: true,
    nurses: true,
  });
  const [lookupError, setLookupError] = useState({ patients: "", nurses: "" });

  useEffect(() => {
    let active = true;
    setLookupLoading((prev) => ({ ...prev, patients: true }));
    setLookupError((prev) => ({ ...prev, patients: "" }));

    fetchPatientLookups({ search: patientSearch })
      .then((body) => {
        if (!active) return;
        setPatients(Array.isArray(body?.data) ? body.data : []);
      })
      .catch((err) => {
        if (!active) return;
        setPatients([]);
        setLookupError((prev) => ({
          ...prev,
          patients: err?.message || "Unable to load patients.",
        }));
      })
      .finally(() => {
        if (active) setLookupLoading((prev) => ({ ...prev, patients: false }));
      });

    return () => {
      active = false;
    };
  }, [patientSearch]);

  useEffect(() => {
    let active = true;
    setLookupLoading((prev) => ({ ...prev, nurses: true }));
    setLookupError((prev) => ({ ...prev, nurses: "" }));

    fetchNurseLookups({ search: nurseSearch, status: "Active" })
      .then((body) => {
        if (!active) return;
        setNurses(Array.isArray(body?.data) ? body.data : []);
      })
      .catch((err) => {
        if (!active) return;
        setNurses([]);
        setLookupError((prev) => ({
          ...prev,
          nurses: err?.message || "Unable to load nurses.",
        }));
      })
      .finally(() => {
        if (active) setLookupLoading((prev) => ({ ...prev, nurses: false }));
      });

    return () => {
      active = false;
    };
  }, [nurseSearch]);

  return (
    <Modal
      title="Admit Patient"
      subtitle="Assign a real patient profile to an available bed."
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <LookupField
            label="Patient"
            required
            value={modal.form.patientId}
            search={patientSearch}
            onSearch={setPatientSearch}
            options={patients}
            loading={lookupLoading.patients}
            error={lookupError.patients}
            emptyText="No patients found."
            placeholder="Search patient ID, name, email, or phone"
            formatOption={patientLabel}
            onSelect={(patient) => onChange("patientId", itemId(patient))}
          />
          <Field label="Assigned Doctor">
            <select
              className={inputClass}
              value={modal.form.doctorId}
              onChange={(e) => onChange("doctorId", e.target.value)}
            >
              <option value="">Optional doctor</option>
              {doctors.map((doctor) => (
                <option key={itemId(doctor)} value={itemId(doctor)}>
                  {displayDoctor(doctor)}
                </option>
              ))}
            </select>
          </Field>
          <LookupField
            label="Assigned Nurse"
            value={modal.form.nurseId}
            search={nurseSearch}
            onSearch={setNurseSearch}
            options={nurses}
            loading={lookupLoading.nurses}
            error={lookupError.nurses}
            emptyText="No active nurses found."
            placeholder="Search nurse ID, name, department, email, or phone"
            formatOption={nurseLabel}
            onSelect={(nurse) => onChange("nurseId", itemId(nurse))}
            onClear={() => onChange("nurseId", "")}
          />
          <Field label="Ward">
            <select
              className={inputClass}
              value={modal.form.wardId}
              onChange={(e) => onChange("wardId", e.target.value)}
              required
            >
              <option value="">Select ward</option>
              {wards.map((ward) => (
                <option key={itemId(ward)} value={itemId(ward)}>
                  {ward.wardName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Room">
            <select
              className={inputClass}
              value={modal.form.roomId}
              onChange={(e) => onChange("roomId", e.target.value)}
              required
              disabled={!modal.form.wardId}
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={itemId(room)} value={itemId(room)}>
                  Room {room.roomNumber}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Available Bed">
            <select
              className={inputClass}
              value={modal.form.bedId}
              onChange={(e) => onChange("bedId", e.target.value)}
              required
              disabled={!modal.form.roomId}
            >
              <option value="">
                {beds.length ? "Select bed" : "No available beds"}
              </option>
              {beds.map((bed) => (
                <option key={itemId(bed)} value={itemId(bed)}>
                  Bed {bed.bedNumber}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Admission Date">
            <input
              className={inputClass}
              type="date"
              value={modal.form.admissionDate}
              onChange={(e) => onChange("admissionDate", e.target.value)}
            />
          </Field>
          <Field label="Expected Discharge">
            <input
              className={inputClass}
              type="date"
              value={modal.form.expectedDischargeDate}
              onChange={(e) =>
                onChange("expectedDischargeDate", e.target.value)
              }
            />
          </Field>
          <Field label="Reason for Admission" className="sm:col-span-2">
            <textarea
              className="min-h-24 w-full resize-none rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
              value={modal.form.reasonForAdmission}
              onChange={(e) => onChange("reasonForAdmission", e.target.value)}
              required
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea
              className="min-h-20 w-full resize-none rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
              value={modal.form.notes}
              onChange={(e) => onChange("notes", e.target.value)}
            />
          </Field>
        </div>
        <ModalActions
          saving={saving}
          onClose={onClose}
          submitLabel="Admit Patient"
        />
      </form>
    </Modal>
  );
}

function LookupField({
  label,
  value,
  search,
  onSearch,
  options,
  loading,
  error,
  emptyText,
  placeholder,
  formatOption,
  onSelect,
  onClear,
  required = false,
}) {
  const selected = options.find((option) => itemId(option) === value);

  return (
    <div className="grid gap-1.5 text-sm font-semibold text-slate-700">
      <div className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {value && !required ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-bold text-blue-700 hover:text-blue-800"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-2 transition focus-within:border-blue-300 focus-within:bg-white">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-9 w-full rounded-xl bg-transparent pl-9 pr-3 text-sm text-slate-800 outline-none"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={placeholder}
          />
        </div>
        <select
          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none"
          value={value}
          onChange={(event) => {
            const option = options.find(
              (item) => itemId(item) === event.target.value,
            );
            if (option) onSelect(option);
          }}
          required={required}
        >
          <option value="">
            {loading
              ? "Loading..."
              : selected
                ? formatOption(selected)
                : required
                  ? "Select patient"
                  : "Optional nurse"}
          </option>
          {options.map((option) => (
            <option key={itemId(option)} value={itemId(option)}>
              {formatOption(option)}
            </option>
          ))}
        </select>
      </div>
      {selected ? (
        <p className="text-xs font-semibold text-blue-700">
          {formatOption(selected)}
        </p>
      ) : null}
      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading {label.toLowerCase()} options...
        </p>
      ) : null}
      {!loading && !error && options.length === 0 ? (
        <p className="text-xs font-semibold text-slate-500">{emptyText}</p>
      ) : null}
      {error ? (
        <p className="text-xs font-semibold text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}

function TransferModal({
  modal,
  wards,
  roomsForWard,
  bedsForRoom,
  saving,
  onClose,
  onChange,
  onSubmit,
}) {
  const rooms = roomsForWard(modal.form.newWardId);
  const beds = bedsForRoom(modal.form.newWardId, modal.form.newRoomId).filter(
    (bed) => bed.bedStatus === "Available",
  );
  const admission = modal.admission;

  return (
    <Modal
      title="Transfer Admission"
      subtitle={`Current: ${admission.wardId?.wardName || "-"} / Room ${admission.roomId?.roomNumber || "-"} / Bed ${admission.bedId?.bedNumber || "-"}`}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <Field label="New Ward">
            <select
              className={inputClass}
              value={modal.form.newWardId}
              onChange={(e) => onChange("newWardId", e.target.value)}
              required
            >
              <option value="">Select ward</option>
              {wards.map((ward) => (
                <option key={itemId(ward)} value={itemId(ward)}>
                  {ward.wardName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="New Room">
            <select
              className={inputClass}
              value={modal.form.newRoomId}
              onChange={(e) => onChange("newRoomId", e.target.value)}
              required
              disabled={!modal.form.newWardId}
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={itemId(room)} value={itemId(room)}>
                  Room {room.roomNumber}
                </option>
              ))}
            </select>
          </Field>
          <Field label="New Available Bed">
            <select
              className={inputClass}
              value={modal.form.newBedId}
              onChange={(e) => onChange("newBedId", e.target.value)}
              required
              disabled={!modal.form.newRoomId}
            >
              <option value="">
                {beds.length ? "Select bed" : "No available beds"}
              </option>
              {beds.map((bed) => (
                <option key={itemId(bed)} value={itemId(bed)}>
                  Bed {bed.bedNumber}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Old Bed Status">
            <select
              className={inputClass}
              value={modal.form.oldBedAfterTransferStatus}
              onChange={(e) =>
                onChange("oldBedAfterTransferStatus", e.target.value)
              }
            >
              {RELEASE_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Transfer Reason" className="sm:col-span-2">
            <textarea
              className="min-h-24 w-full resize-none rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
              value={modal.form.transferReason}
              onChange={(e) => onChange("transferReason", e.target.value)}
            />
          </Field>
        </div>
        <ModalActions
          saving={saving}
          onClose={onClose}
          submitLabel="Transfer Patient"
        />
      </form>
    </Modal>
  );
}

function DischargeModal({ modal, saving, onClose, onChange, onSubmit }) {
  return (
    <Modal
      title="Discharge Patient"
      subtitle={displayPatient(modal.admission?.patientId)}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <Field label="Discharge Date">
            <input
              className={inputClass}
              type="date"
              value={modal.form.dischargeDate}
              onChange={(e) => onChange("dischargeDate", e.target.value)}
            />
          </Field>
          <Field label="Final Status">
            <select
              className={inputClass}
              value={modal.form.finalStatus}
              onChange={(e) => onChange("finalStatus", e.target.value)}
              required
            >
              {FINAL_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Bed After Discharge">
            <select
              className={inputClass}
              value={modal.form.bedAfterDischargeStatus}
              onChange={(e) =>
                onChange("bedAfterDischargeStatus", e.target.value)
              }
            >
              {RELEASE_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Discharge Summary" className="sm:col-span-2">
            <textarea
              className="min-h-28 w-full resize-none rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] px-4 py-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
              value={modal.form.dischargeSummary}
              onChange={(e) => onChange("dischargeSummary", e.target.value)}
              required
            />
          </Field>
        </div>
        <ModalActions
          saving={saving}
          onClose={onClose}
          submitLabel="Discharge Patient"
          danger
        />
      </form>
    </Modal>
  );
}

function ModalActions({ saving, onClose, submitLabel, danger = false }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </button>
    </div>
  );
}

function ViewModal({ admission, onClose }) {
  return (
    <Modal
      title="Admission Details"
      subtitle={displayPatient(admission.patientId)}
      onClose={onClose}
    >
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
        <Detail
          label="Patient ID"
          value={patientCode(admission.patientId) || "Pending"}
          icon={UserRound}
        />
        <Detail
          label="Doctor"
          value={displayDoctor(admission.doctorId)}
          icon={Stethoscope}
        />
        <Detail
          label="Nurse"
          value={`${displayNurse(admission.nurseId)}${nurseCode(admission.nurseId) ? ` (${nurseCode(admission.nurseId)})` : ""}`}
          icon={UserRound}
        />
        <Detail
          label="Location"
          value={`${admission.wardId?.wardName || "-"} / Room ${admission.roomId?.roomNumber || "-"} / Bed ${admission.bedId?.bedNumber || "-"}`}
          icon={BedDouble}
        />
        <Detail
          label="Admission Date"
          value={formatDate(admission.admissionDate)}
          icon={CalendarDays}
        />
        <div className="rounded-2xl border border-slate-200 bg-[#f8fbff] p-4 sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            Reason / Notes
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {admission.reasonForAdmission || "-"}
          </p>
          {admission.notes ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {admission.notes}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            Transfer History
          </p>
          {(admission.transferHistory || []).length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No transfers recorded.
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              {admission.transferHistory.map((item, index) => (
                <div
                  key={`${item.transferDate}-${index}`}
                  className="rounded-2xl bg-[#f8fbff] p-3 text-sm text-slate-600"
                >
                  {formatDate(item.transferDate)}:{" "}
                  {item.fromWardId?.wardName || "-"} /{" "}
                  {item.fromRoomId?.roomNumber || "-"} /{" "}
                  {item.fromBedId?.bedNumber || "-"} to{" "}
                  {item.toWardId?.wardName || "-"} /{" "}
                  {item.toRoomId?.roomNumber || "-"} /{" "}
                  {item.toBedId?.bedNumber || "-"}
                  {item.transferReason ? (
                    <div className="mt-1 text-xs text-slate-500">
                      {item.transferReason}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function QrModal({ admission, onClose }) {
  const [copyState, setCopyState] = useState("");
  const payload = admissionQrPayload(admission);
  const patient = displayPatient(admission.patientId);

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopyState("QR content copied.");
    } catch {
      setCopyState("Unable to copy QR content.");
    }
  }

  function printQr() {
    const printable = document.getElementById("patient-assignment-qr-print");
    const printWindow = window.open("", "_blank", "width=520,height=680");
    if (!printWindow || !printable) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Patient Assignment QR</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            .wrap { max-width: 420px; margin: 0 auto; text-align: center; }
            .qr { display: inline-block; padding: 18px; border: 1px solid #dbe6f7; border-radius: 24px; }
            h1 { font-size: 22px; margin: 18px 0 8px; }
            p { color: #475569; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="wrap">${printable.innerHTML}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  return (
    <Modal title="Patient Assignment QR" subtitle={patient} onClose={onClose}>
      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[260px_1fr]">
        <div
          id="patient-assignment-qr-print"
          className="rounded-3xl border border-[#dbe6f7] bg-[#f8fbff] p-5 text-center"
        >
          <div className="qr mx-auto inline-flex rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <QRCodeSVG value={payload} size={190} level="M" includeMargin />
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-950">
            Patient Assignment QR
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Scan with the Revive nurse mobile app.
          </p>
        </div>

        <div className="flex flex-col justify-between gap-5">
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-950">
                  Nurse mobile assignment
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Nurses can scan this QR from the mobile app to assign this
                  patient to themselves if the admission is active and
                  unassigned.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Privacy
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This QR code contains only the admission identifier. It does not
              include patient name, phone, diagnosis, room, bed, or clinical
              details.
            </p>
          </div>

          {copyState ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm font-bold ${copyState.includes("Unable") ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
            >
              {copyState}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={copyPayload}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
            >
              <Copy className="h-4 w-4" />
              Copy QR Content
            </button>
            <button
              type="button"
              onClick={printQr}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <Printer className="h-4 w-4" />
              Print QR
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Detail({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#f8fbff] p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {React.createElement(icon, { className: "h-4 w-4 text-blue-700" })}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}
