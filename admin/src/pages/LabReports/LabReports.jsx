import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout/AdminLayout";
import {
  createAdminLabReport,
  deleteAdminLabReport,
  fetchAdminLabReports,
  updateAdminLabReport,
} from "../../api/staffLabReportApi";
import LookupSelect, {
  admissionLabel,
  appointmentLabel,
  doctorLabel,
  patientLabel,
  serviceAppointmentLabel,
  staffLabel,
} from "../../components/LookupSelect/LookupSelect";
import useSavedLookups from "../../hooks/useSavedLookups";
import { getReportFileUrl, openBackendFile } from "../../utils/fileUrl";
import { reportPayloadFromForm } from "../../utils/reportPayload";

const testTypes = [
  "All",
  "Blood Test",
  "Urine Test",
  "Diabetes Test",
  "Cholesterol Test",
  "Infection Test",
  "Other",
];
const statuses = ["All", "Requested", "In Progress", "Completed", "Reviewed"];
const createTypes = testTypes.slice(1);
const createStatuses = statuses.slice(1);
const flags = ["", "Normal", "High", "Low", "Critical"];
const emptyRow = {
  testName: "",
  value: "",
  unit: "",
  referenceRange: "",
  flag: "",
};
const emptyForm = {
  patientId: "",
  requestedByDoctorId: "",
  uploadedByStaffId: "",
  appointmentId: "",
  admissionId: "",
  serviceAppointmentId: "",
  testType: "Blood Test",
  title: "",
  description: "",
  specimen: "",
  requestedDate: "",
  resultDate: "",
  results: [{ ...emptyRow }],
  resultSummary: "",
  interpretation: "",
  fileUrl: "",
  fileName: "",
  file: null,
  status: "Requested",
  notes: "",
};
const inputClass =
  "admin-input";
const selectClass = "admin-select";

const getId = (item = {}) => item._id || item.id || "";
const fmtDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString()
    : "-";
};
const name = (item, fallback = "Patient") =>
  item?.name || item?.email || item?.phone || item?.patientCode || fallback;

function normalize(report = emptyForm) {
  return {
    ...emptyForm,
    ...report,
    patientId: getId(report.patientId) || report.patientId || "",
    requestedByDoctorId:
      getId(report.requestedByDoctorId) || report.requestedByDoctorId || "",
    uploadedByStaffId:
      getId(report.uploadedByStaffId) || report.uploadedByStaffId || "",
    appointmentId: getId(report.appointmentId) || report.appointmentId || "",
    admissionId: getId(report.admissionId) || report.admissionId || "",
    serviceAppointmentId:
      getId(report.serviceAppointmentId) || report.serviceAppointmentId || "",
    requestedDate: report.requestedDate
      ? String(report.requestedDate).slice(0, 10)
      : "",
    resultDate: report.resultDate ? String(report.resultDate).slice(0, 10) : "",
    results:
      Array.isArray(report.results) && report.results.length
        ? report.results.map((row) => ({ ...emptyRow, ...row }))
        : [{ ...emptyRow }],
  };
}

function payloadFrom(form) {
  const payload = { ...form };
  payload.results = (form.results || []).filter((row) =>
    Object.values(row).some((value) => String(value || "").trim() !== ""),
  );
  return reportPayloadFromForm(payload);
}

function badgeClass(value) {
  if (value === "Critical") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (value === "High") return "bg-orange-50 text-orange-700 ring-orange-100";
  if (value === "Low") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (value === "Completed" || value === "Reviewed" || value === "Normal") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }
  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function Badge({ children }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${badgeClass(
        children,
      )}`}
    >
      {children || "-"}
    </span>
  );
}

export default function LabReports() {
  const { getToken } = useAuth();
  const { lookups, lookupLoading, lookupError } = useSavedLookups({
    authMode: "admin",
    getToken,
    includeStaff: true,
  });
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    testType: "All",
    status: "All",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const body = await fetchAdminLabReports(filters, getToken);
      setReports(Array.isArray(body.data) ? body.data : []);
    } catch (err) {
      setReports([]);
      setMessage({
        type: "error",
        text: err.message || "Unable to load lab reports.",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, getToken]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const summary = useMemo(
    () => ({
      total: reports.length,
      requested: reports.filter((report) => report.status === "Requested")
        .length,
      progress: reports.filter((report) => report.status === "In Progress")
        .length,
      completed: reports.filter((report) => report.status === "Completed")
        .length,
      reviewed: reports.filter((report) => report.status === "Reviewed").length,
    }),
    [reports],
  );

  function openCreate() {
    setForm(emptyForm);
    setModal("create");
  }

  function openEdit(report) {
    setForm(normalize(report));
    setModal("edit");
  }

  async function submit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = payloadFrom(form);
      const body =
        modal === "edit"
          ? await updateAdminLabReport(getId(form), payload, getToken)
          : await createAdminLabReport(payload, getToken);
      setMessage({ type: "success", text: body.message || "Lab report saved." });
      setModal(null);
      setForm(emptyForm);
      await loadReports();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Unable to save lab report.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove(report) {
    if (!window.confirm(`Delete ${report.reportCode || "this lab report"}?`)) {
      return;
    }
    try {
      setSaving(true);
      const body = await deleteAdminLabReport(getId(report), getToken);
      setMessage({ type: "success", text: body.message || "Lab report deleted." });
      await loadReports();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Unable to delete lab report.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout
      title="Lab Reports"
      subtitle="View, create, update, and manage hospital laboratory reports."
    >
      <div className="grid gap-5">
        <button
          type="button"
          onClick={openCreate}
          className="w-fit rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Create Lab Report
        </button>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Total" value={summary.total} />
          <Stat label="Requested" value={summary.requested} />
          <Stat label="In Progress" value={summary.progress} />
          <Stat label="Completed" value={summary.completed} />
          <Stat label="Reviewed" value={summary.reviewed} />
        </section>

        <section className="rounded-3xl border border-[#dbe6f7] bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_230px_180px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-11`}
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder="Search lab reports..."
              />
            </div>
            <Select
              value={filters.testType}
              options={testTypes}
              onChange={(testType) =>
                setFilters((current) => ({ ...current, testType }))
              }
            />
            <Select
              value={filters.status}
              options={statuses}
              onChange={(status) =>
                setFilters((current) => ({ ...current, status }))
              }
            />
          </div>
        </section>

        {message.text ? (
          <Notice
            message={message}
            close={() => setMessage({ type: "", text: "" })}
          />
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white">
          {loading ? (
            <div className="p-12 text-center text-blue-700">
              <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
              Loading lab reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-blue-700" />
              <b>No lab reports found.</b>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-[#f8fbff] text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4 text-left">Report</th>
                    <th className="px-5 py-4 text-left">Patient</th>
                    <th className="px-5 py-4 text-left">Doctor</th>
                    <th className="px-5 py-4 text-left">Dates</th>
                    <th className="px-5 py-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((report) => (
                    <tr key={getId(report)} className="align-top">
                      <td className="px-5 py-4">
                        <b className="text-blue-700">
                          {report.reportCode || "Lab Report"}
                        </b>
                        <p className="mt-1 font-bold text-slate-950">
                          {report.title || "Untitled lab report"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge>{report.testType}</Badge>
                          <Badge>{report.status}</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {name(report.patientId, "Patient")}
                      </td>
                      <td className="px-5 py-4">
                        {name(report.requestedByDoctorId, "Doctor")}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p>Requested {fmtDate(report.requestedDate)}</p>
                        <p>Result {fmtDate(report.resultDate)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelected(report)}
                            className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                          >
                            <Eye className="mr-1 inline h-3.5 w-3.5" />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(report)}
                            className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700"
                          >
                            <Pencil className="mr-1 inline h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(report)}
                            className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                          >
                            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                            Delete
                          </button>
                          <ReportFileButton report={report} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {modal ? (
          <LabForm
            title={modal === "edit" ? "Edit Lab Report" : "Create Lab Report"}
            form={form}
            setForm={setForm}
            submit={submit}
            saving={saving}
            close={() => setModal(null)}
            lookups={lookups}
            lookupLoading={lookupLoading}
            lookupError={lookupError}
          />
      ) : null}
      {selected ? (
        <Detail report={selected} close={() => setSelected(null)} />
      ) : null}
    </AdminLayout>
  );
}

function Select({ value, options, onChange }) {
  return (
    <select
      className={selectClass}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-blue-700">{value}</p>
    </div>
  );
}

function Notice({ message, close }) {
  const ok = message.type === "success";
  return (
    <div
      className={`flex justify-between rounded-2xl border p-4 text-sm font-bold ${
        ok
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-rose-100 bg-rose-50 text-rose-700"
      }`}
    >
      <span>
        {ok ? (
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
        ) : (
          <AlertCircle className="mr-2 inline h-4 w-4" />
        )}
        {message.text}
      </span>
      <button type="button" onClick={close}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function LabForm({ title, form, setForm, submit, saving, close, lookups, lookupLoading, lookupError }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{title}</h2>
          </div>
          <button type="button" onClick={close}>
            <X />
          </button>
        </div>
        {lookupError ? (
          <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">
            {lookupError}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <LookupSelect label="Patient" required allowEmpty={false} value={form.patientId} onChange={(value) => setForm((current) => ({ ...current, patientId: value }))} options={lookups.patients} getLabel={patientLabel} loading={lookupLoading} />
          <LookupSelect label="Requested By Doctor" value={form.requestedByDoctorId} onChange={(value) => setForm((current) => ({ ...current, requestedByDoctorId: value }))} options={lookups.doctors} getLabel={doctorLabel} loading={lookupLoading} />
          <LookupSelect label="Uploaded By Staff" value={form.uploadedByStaffId} onChange={(value) => setForm((current) => ({ ...current, uploadedByStaffId: value }))} options={lookups.staff} getLabel={staffLabel} loading={lookupLoading} />
          <LookupSelect label="Appointment" value={form.appointmentId} onChange={(value) => setForm((current) => ({ ...current, appointmentId: value }))} options={lookups.appointments} getLabel={appointmentLabel} loading={lookupLoading} />
          <LookupSelect label="Admission" value={form.admissionId} onChange={(value) => setForm((current) => ({ ...current, admissionId: value }))} options={lookups.admissions} getLabel={admissionLabel} loading={lookupLoading} />
          <LookupSelect label="Service Appointment" value={form.serviceAppointmentId} onChange={(value) => setForm((current) => ({ ...current, serviceAppointmentId: value }))} options={lookups.serviceAppointments} getLabel={serviceAppointmentLabel} loading={lookupLoading} />
          {["title", "specimen"].map((key) => (
            <label key={key} className="admin-field">
              {key}
              <input required={key === "title"} className={inputClass} value={form[key] || ""} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
            </label>
          ))}
          <FileField form={form} setForm={setForm} />
          <label className="admin-field">
            Test Type
            <Select
              value={form.testType || "Blood Test"}
              options={createTypes}
              onChange={(testType) =>
                setForm((current) => ({ ...current, testType }))
              }
            />
          </label>
          <label className="admin-field">
            Status
            <Select
              value={form.status || "Requested"}
              options={createStatuses}
              onChange={(status) =>
                setForm((current) => ({ ...current, status }))
              }
            />
          </label>
          <label className="admin-field">
            requestedDate
            <input
              type="date"
              className={inputClass}
              value={form.requestedDate || ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  requestedDate: event.target.value,
                }))
              }
            />
          </label>
          <label className="admin-field">
            resultDate
            <input
              type="date"
              className={inputClass}
              value={form.resultDate || ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, resultDate: event.target.value }))
              }
            />
          </label>
          {["description", "resultSummary", "interpretation", "notes"].map(
            (key) => (
              <label key={key} className="admin-field md:col-span-2">
                {key}
                <textarea
                  className="admin-textarea min-h-20"
                  value={form[key] || ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                />
              </label>
            ),
          )}
        </div>

        <ResultRows form={form} setForm={setForm} />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            className="h-11 rounded-2xl border px-4 font-bold"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="h-11 rounded-2xl bg-blue-600 px-4 font-bold text-white disabled:opacity-60"
          >
            <Send className="mr-2 inline h-4 w-4" />
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function ResultRows({ form, setForm }) {
  function update(index, key, value) {
    setForm((current) => {
      const rows = [...(current.results || [])];
      rows[index] = { ...emptyRow, ...rows[index], [key]: value };
      return { ...current, results: rows };
    });
  }

  function add() {
    setForm((current) => ({
      ...current,
      results: [...(current.results || []), { ...emptyRow }],
    }));
  }

  function remove(index) {
    setForm((current) => {
      const rows = [...(current.results || [])];
      rows.splice(index, 1);
      return { ...current, results: rows.length ? rows : [{ ...emptyRow }] };
    });
  }

  return (
    <div className="mt-5 rounded-3xl border border-[#dbe6f7] bg-[#f8fbff] p-4">
      <div className="flex justify-between gap-3">
        <h3 className="font-semibold text-slate-950">Result Rows</h3>
        <button
          type="button"
          onClick={add}
          className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-100"
        >
          Add Row
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {(form.results || [{ ...emptyRow }]).map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-2xl bg-white p-3 md:grid-cols-[1.1fr_0.8fr_0.7fr_1fr_0.8fr_auto]"
          >
            {["testName", "value", "unit", "referenceRange"].map((key) => (
              <input
                key={key}
                className={inputClass}
                placeholder={key}
                value={row[key] || ""}
                onChange={(event) => update(index, key, event.target.value)}
              />
            ))}
            <select
              className={selectClass}
              value={row.flag || ""}
              onChange={(event) => update(index, "flag", event.target.value)}
            >
              {flags.map((flag) => (
                <option key={flag} value={flag}>
                  {flag || "Flag"}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(index)}
              className="h-11 rounded-2xl bg-rose-50 px-3 text-xs font-bold text-rose-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ report, close }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-sm font-black text-blue-700">
              {report.reportCode || "Lab Report"}
            </p>
            <h2 className="text-xl font-black text-slate-950">
              {report.title || "Lab report"}
            </h2>
          </div>
          <button type="button" onClick={close}>
            <X />
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Info label="Test Type" value={report.testType} />
          <Info label="Status" value={report.status} />
          <Info label="Patient" value={name(report.patientId, "Patient")} />
          <Info
            label="Doctor"
            value={name(report.requestedByDoctorId, "Doctor")}
          />
          <Info label="Specimen" value={report.specimen || "-"} />
          <Info label="Result Date" value={fmtDate(report.resultDate)} />
          <Info label="Description" value={report.description || "-"} wide />
          <div className="rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4 md:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Results
            </p>
            {(report.results || []).length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <tbody>
                    {report.results.map((row, index) => (
                      <tr key={index} className="border-b border-slate-200">
                        <td className="py-2 font-bold">{row.testName || "-"}</td>
                        <td>{row.value || "-"}</td>
                        <td>{row.unit || "-"}</td>
                        <td>{row.referenceRange || "-"}</td>
                        <td>
                          <Badge>{row.flag || "Normal"}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No result rows recorded.
              </p>
            )}
          </div>
          <Info label="Summary" value={report.resultSummary || "-"} wide />
          <Info
            label="Interpretation"
            value={report.interpretation || "-"}
            wide
          />
          <Info label="Notes" value={report.notes || "-"} wide />
          <ReportFileButton report={report} full />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, wide }) {
  return (
    <div
      className={`rounded-2xl border border-[#dbe6f7] bg-[#f8fbff] p-4 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
        {value || "-"}
      </p>
    </div>
  );
}

function FileField({ form, setForm }) {
  return (
    <label className="admin-field">
      Report file
      <input
        type="file"
        accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
        className={`${inputClass} h-auto py-2`}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            file: event.target.files?.[0] || null,
          }))
        }
      />
      <span className="text-xs font-semibold text-slate-500">
        {form.file?.name || form.fileName || "No file attached"}
      </span>
    </label>
  );
}

function ReportFileButton({ report, full = false }) {
  const fileUrl = getReportFileUrl(report);

  if (!fileUrl) {
    return (
      <span
        className={
          full
            ? "inline-flex h-11 items-center justify-center rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-500 md:w-fit"
            : "rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500"
        }
      >
        No file attached
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openBackendFile(fileUrl)}
      className={
        full
          ? "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white md:w-fit"
          : "rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
      }
    >
      <Download className={full ? "h-4 w-4" : "mr-1 inline h-3.5 w-3.5"} />
      {full ? "View / Download" : "File"}
    </button>
  );
}
