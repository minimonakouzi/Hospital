import React from "react";

const inputClass =
  "admin-select";

export function itemId(item = {}) {
  return item?._id || item?.id || "";
}

export function formatDate(value = "") {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function patientLabel(item = {}) {
  if (!item || typeof item !== "object") return "Unknown patient";
  return [item.name || "Unnamed patient", item.patientCode, item.email, item.phone]
    .filter(Boolean)
    .join(" | ");
}

export function doctorLabel(item = {}) {
  if (!item || typeof item !== "object") return "Doctor";
  return [item.name || "Doctor", item.specialization, item.email].filter(Boolean).join(" | ");
}

export function staffLabel(item = {}) {
  if (!item || typeof item !== "object") return "Staff member";
  return [item.name || "Staff member", item.role || item.department, item.email].filter(Boolean).join(" | ");
}

export function admissionLabel(item = {}) {
  if (!item || typeof item !== "object") return "Admission";
  const patient = item.patientId || {};
  const location = [
    item.wardId?.wardName,
    item.roomId?.roomNumber ? `Room ${item.roomId.roomNumber}` : "",
    item.bedId?.bedNumber ? `Bed ${item.bedId.bedNumber}` : "",
  ].filter(Boolean).join(" / ");
  return [patient.name || patient.patientCode || "Patient", location || "Location not set", formatDate(item.admissionDate)].join(" | ");
}

export function appointmentLabel(item = {}) {
  if (!item || typeof item !== "object") return "Appointment";
  const doctor = item.doctorId || {};
  return [item.patientName || "Patient", item.doctorName || doctor.name || "Doctor", item.date || "No date", item.status].filter(Boolean).join(" | ");
}

export function serviceAppointmentLabel(item = {}) {
  if (!item || typeof item !== "object") return "Service appointment";
  const service = item.serviceId || {};
  return [item.serviceName || service.name || "Service", item.patientName || "Patient", item.date || "No date", item.status].filter(Boolean).join(" | ");
}

export function serviceLabel(item = {}) {
  if (!item || typeof item !== "object") return "Service";
  return [item.name || "Service", item.available === false ? "Unavailable" : ""].filter(Boolean).join(" | ");
}

export default function LookupSelect({
  label,
  value,
  onChange,
  options = [],
  getLabel,
  required = false,
  loading = false,
  allowEmpty = true,
  emptyLabel = "None / Not linked",
}) {
  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const labelFor = typeof getLabel === "function" ? getLabel : String;

  return (
    <label className="admin-field">
      {label}
      <select
        required={required}
        className={inputClass}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
      >
        {allowEmpty ? <option value="">{loading ? "Loading saved data..." : emptyLabel}</option> : null}
        {!allowEmpty && loading ? <option value="">Loading saved data...</option> : null}
        {safeOptions.map((item, index) => (
          <option key={itemId(item) || index} value={itemId(item)}>
            {labelFor(item)}
          </option>
        ))}
      </select>
    </label>
  );
}
