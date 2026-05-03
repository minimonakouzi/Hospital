import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  AlertCircle,
  BedDouble,
  Building2,
  CheckCircle2,
  DoorOpen,
  Filter,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout/AdminLayout";
import {
  createBed,
  createRoom,
  createWard,
  deleteBed,
  deleteRoom,
  deleteWard,
  fetchWardStats,
  fetchWards,
  updateBed,
  updateRoom,
  updateWard,
} from "../../api/wardApi";

const WARD_TYPES = ["General", "ICU", "Emergency", "Surgery", "Maternity", "Pediatric"];
const WARD_STATUSES = ["Active", "Under Maintenance", "Closed"];
const ROOM_TYPES = ["Private", "Shared", "ICU", "Emergency"];
const ROOM_STATUSES = ["Available", "Full", "Maintenance"];
const BED_STATUSES = ["Available", "Occupied", "Cleaning", "Maintenance"];

const emptyWardForm = {
  wardName: "",
  wardType: "General",
  floorNumber: "",
  description: "",
  status: "Active",
};

const emptyRoomForm = {
  roomNumber: "",
  roomType: "Shared",
  floorNumber: "",
  status: "Available",
};

const emptyBedForm = {
  bedNumber: "",
  bedStatus: "Available",
  notes: "",
};

function itemId(item) {
  if (!item || typeof item !== "object") return "";
  return item._id || item.id || "";
}

function statusClasses(status = "") {
  if (["Active", "Available"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }
  if (["Occupied", "Full", "Critical"].includes(status)) {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }
  if (["Cleaning", "Under Maintenance", "Maintenance"].includes(status)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }
  if (status === "Closed") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClasses(status)}`}>
      {status || "Unknown"}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "admin-input";
const selectClass = "admin-select";

function Modal({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 py-4 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, tone = "blue" }) {
  const color = tone === "green" ? "text-emerald-700 bg-emerald-50" : "text-blue-700 bg-blue-50";
  return (
    <div className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${color}`}>
          {React.createElement(icon, { className: "h-5 w-5" })}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Notice({ notice, onClose }) {
  if (!notice.text) return null;
  const success = notice.type === "success";
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
        success
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-rose-100 bg-rose-50 text-rose-700"
      }`}
    >
      <div className="flex min-w-0 items-start gap-2">
        {success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
        <span>{notice.text}</span>
      </div>
      <button type="button" onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function WardManagement() {
  const { getToken } = useAuth();
  const [wards, setWards] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    wardType: "",
    floorNumber: "",
    status: "",
    bedStatus: "",
  });

  const loadWardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [wardBody, statsBody] = await Promise.all([
        fetchWards(filters, getToken),
        fetchWardStats(getToken),
      ]);
      setWards(Array.isArray(wardBody?.data) ? wardBody.data : []);
      setStats(statsBody?.stats || null);
    } catch (err) {
      console.error("load ward management error:", err);
      setWards([]);
      setStats(null);
      setError(err?.message || "Unable to load ward management data.");
    } finally {
      setLoading(false);
    }
  }, [filters, getToken]);

  useEffect(() => {
    loadWardData();
  }, [loadWardData]);

  const floorOptions = useMemo(() => {
    return [...new Set(wards.map((ward) => ward.floorNumber).filter(Boolean))].sort();
  }, [wards]);

  function openWardModal(ward = null) {
    setModal({
      type: "ward",
      mode: ward ? "edit" : "create",
      ward,
      form: ward
        ? {
            wardName: ward.wardName || "",
            wardType: ward.wardType || "General",
            floorNumber: ward.floorNumber || "",
            description: ward.description || "",
            status: ward.status || "Active",
          }
        : { ...emptyWardForm },
    });
  }

  function openRoomModal(ward, room = null) {
    setModal({
      type: "room",
      mode: room ? "edit" : "create",
      ward,
      room,
      form: room
        ? {
            roomNumber: room.roomNumber || "",
            roomType: room.roomType || "Shared",
            floorNumber: room.floorNumber || ward?.floorNumber || "",
            status: room.status || "Available",
          }
        : { ...emptyRoomForm, floorNumber: ward?.floorNumber || "" },
    });
  }

  function openBedModal(ward, room, bed = null) {
    setModal({
      type: "bed",
      mode: bed ? "edit" : "create",
      ward,
      room,
      bed,
      form: bed
        ? {
            bedNumber: bed.bedNumber || "",
            bedStatus: bed.bedStatus || "Available",
            notes: bed.notes || "",
          }
        : { ...emptyBedForm },
    });
  }

  function updateModalField(name, value) {
    setModal((current) =>
      current
        ? {
            ...current,
            form: { ...current.form, [name]: value },
          }
        : current,
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!modal) return;

    try {
      setSaving(true);
      setNotice({ type: "", text: "" });

      if (modal.type === "ward") {
        const body =
          modal.mode === "edit"
            ? await updateWard(itemId(modal.ward), modal.form, getToken)
            : await createWard(modal.form, getToken);
        setNotice({ type: "success", text: body?.message || "Ward saved successfully." });
      }

      if (modal.type === "room") {
        const wardId = itemId(modal.ward);
        if (!wardId) throw new Error("Select a ward before saving a room.");
        const body =
          modal.mode === "edit"
            ? await updateRoom(wardId, itemId(modal.room), modal.form, getToken)
            : await createRoom(wardId, modal.form, getToken);
        setNotice({ type: "success", text: body?.message || "Room saved successfully." });
      }

      if (modal.type === "bed") {
        const wardId = itemId(modal.ward);
        const roomId = itemId(modal.room);
        if (!wardId || !roomId) throw new Error("Select a ward and room before saving a bed.");
        const body =
          modal.mode === "edit"
            ? await updateBed(wardId, roomId, itemId(modal.bed), modal.form, getToken)
            : await createBed(wardId, roomId, modal.form, getToken);
        setNotice({ type: "success", text: body?.message || "Bed saved successfully." });
      }

      setModal(null);
      await loadWardData();
    } catch (err) {
      console.error("save ward setup error:", err);
      setNotice({ type: "error", text: err?.message || "Unable to save changes." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;

    try {
      setSaving(true);
      setNotice({ type: "", text: "" });
      const { type, ward, room, bed } = confirmDelete;
      let body;

      if (type === "ward") body = await deleteWard(itemId(ward), getToken);
      if (type === "room") body = await deleteRoom(itemId(ward), itemId(room), getToken);
      if (type === "bed") body = await deleteBed(itemId(ward), itemId(room), itemId(bed), getToken);

      setConfirmDelete(null);
      setNotice({ type: "success", text: body?.message || "Deleted successfully." });
      await loadWardData();
    } catch (err) {
      console.error("delete ward setup error:", err);
      setNotice({ type: "error", text: err?.message || "Unable to delete this item." });
    } finally {
      setSaving(false);
    }
  }

  const summary = stats || {
    totalWards: 0,
    totalRooms: 0,
    totalBeds: 0,
    availableBeds: 0,
    occupiedBeds: 0,
    occupancyPercentage: 0,
  };

  return (
    <AdminLayout
      title="Ward Management"
      subtitle="Manage hospital wards, rooms, beds, and occupancy setup."
    >
      <div className="mx-auto grid max-w-7xl gap-5">
        <section className="rounded-3xl border border-[#dbe6f7] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6f7] bg-[#eef4fb] px-3 py-1 text-xs font-bold text-blue-700">
                <Building2 className="h-3.5 w-3.5" />
                Admin setup
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                Ward Management
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Build and maintain the ward, room, and bed structure used for future admissions.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadWardData}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#dbe6f7] bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-[#f8fbff]"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => openWardModal()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Ward
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Total Wards" value={summary.totalWards || 0} icon={Building2} />
          <StatCard label="Total Rooms" value={summary.totalRooms || 0} icon={DoorOpen} />
          <StatCard label="Total Beds" value={summary.totalBeds || 0} icon={BedDouble} />
          <StatCard label="Available" value={summary.availableBeds || 0} icon={CheckCircle2} tone="green" />
          <StatCard label="Occupied" value={summary.occupiedBeds || 0} icon={Layers3} />
          <StatCard label="Occupancy" value={`${summary.occupancyPercentage || 0}%`} icon={Filter} />
        </section>

        <section className="rounded-3xl border border-[#dbe6f7] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_180px_150px_190px_190px_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                className={`${inputClass} pl-11`}
                placeholder="Search ward name, description, floor..."
              />
            </div>
            <select
              value={filters.wardType}
              onChange={(event) => setFilters((prev) => ({ ...prev, wardType: event.target.value }))}
              className={selectClass}
            >
              <option value="">All ward types</option>
              {WARD_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
            <select
              value={filters.floorNumber}
              onChange={(event) => setFilters((prev) => ({ ...prev, floorNumber: event.target.value }))}
              className={selectClass}
            >
              <option value="">All floors</option>
              {floorOptions.map((floor) => <option key={floor}>{floor}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className={selectClass}
            >
              <option value="">All ward statuses</option>
              {WARD_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
            <select
              value={filters.bedStatus}
              onChange={(event) => setFilters((prev) => ({ ...prev, bedStatus: event.target.value }))}
              className={selectClass}
            >
              <option value="">All bed statuses</option>
              {BED_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setFilters({ search: "", wardType: "", floorNumber: "", status: "", bedStatus: "" })}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Clear
            </button>
          </div>
        </section>

        <Notice notice={notice} onClose={() => setNotice({ type: "", text: "" })} />

        {error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4">
          {loading ? (
            <div className="flex items-center justify-center rounded-3xl border border-[#dbe6f7] bg-white px-4 py-16 text-sm font-bold text-blue-700 shadow-sm">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading ward structure...
            </div>
          ) : wards.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#bcd2f2] bg-white px-5 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                <Building2 className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-950">No wards found</h2>
              <p className="mt-2 text-sm text-slate-500">
                Create the first ward to start building rooms and beds.
              </p>
              <button
                type="button"
                onClick={() => openWardModal()}
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                Add Ward
              </button>
            </div>
          ) : (
            wards.map((ward) => (
              <WardCard
                key={itemId(ward)}
                ward={ward}
                onEditWard={() => openWardModal(ward)}
                onDeleteWard={() => setConfirmDelete({ type: "ward", ward })}
                onAddRoom={() => openRoomModal(ward)}
                onEditRoom={(room) => openRoomModal(ward, room)}
                onDeleteRoom={(room) => setConfirmDelete({ type: "room", ward, room })}
                onAddBed={(room) => openBedModal(ward, room)}
                onEditBed={(room, bed) => openBedModal(ward, room, bed)}
                onDeleteBed={(room, bed) => setConfirmDelete({ type: "bed", ward, room, bed })}
              />
            ))
          )}
        </section>
      </div>

      {modal ? (
        <SetupFormModal
          modal={modal}
          saving={saving}
          onClose={() => setModal(null)}
          onChange={updateModalField}
          onSubmit={handleSubmit}
        />
      ) : null}

      {confirmDelete ? (
        <ConfirmDeleteModal
          item={confirmDelete}
          saving={saving}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </AdminLayout>
  );
}

function WardCard({
  ward,
  onEditWard,
  onDeleteWard,
  onAddRoom,
  onEditRoom,
  onDeleteRoom,
  onAddBed,
  onEditBed,
  onDeleteBed,
}) {
  const rooms = Array.isArray(ward.rooms) ? ward.rooms : [];
  const wardBeds = Array.isArray(ward.beds) ? ward.beds : [];
  const occupied = wardBeds.filter((bed) => bed.bedStatus === "Occupied").length;
  const total = wardBeds.length;
  const percent = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return (
    <article className="overflow-hidden rounded-3xl border border-[#dbe6f7] bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-[#fbfdff] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-950">{ward.wardName || "Unnamed Ward"}</h2>
              <StatusBadge status={ward.status} />
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                {ward.wardType || "Ward"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Floor {ward.floorNumber || "-"} {ward.description ? `| ${ward.description}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Plus} label="Add Room" onClick={onAddRoom} primary />
            <ActionButton icon={Pencil} label="Edit" onClick={onEditWard} />
            <ActionButton icon={Trash2} label="Delete" onClick={onDeleteWard} danger />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_240px] md:items-center">
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
          </div>
          <div className="text-sm font-semibold text-slate-600 md:text-right">
            {occupied} of {total} beds occupied ({percent}%)
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f8fbff] px-4 py-8 text-center text-sm text-slate-500">
            No rooms in this ward yet.
          </div>
        ) : (
          rooms.map((room) => (
            <RoomPanel
              key={itemId(room)}
              room={room}
              onEdit={() => onEditRoom(room)}
              onDelete={() => onDeleteRoom(room)}
              onAddBed={() => onAddBed(room)}
              onEditBed={(bed) => onEditBed(room, bed)}
              onDeleteBed={(bed) => onDeleteBed(room, bed)}
            />
          ))
        )}
      </div>
    </article>
  );
}

function RoomPanel({ room, onEdit, onDelete, onAddBed, onEditBed, onDeleteBed }) {
  const beds = Array.isArray(room.beds) ? room.beds : [];

  return (
    <div className="rounded-3xl border border-slate-200 bg-[#f8fbff] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <DoorOpen className="h-5 w-5 text-blue-700" />
            <h3 className="font-bold text-slate-950">Room {room.roomNumber || "-"}</h3>
            <StatusBadge status={room.status} />
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              {room.roomType || "Room"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Floor {room.floorNumber || "-"} | {beds.length} beds</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton icon={Plus} label="Add Bed" onClick={onAddBed} primary />
          <ActionButton icon={Pencil} label="Edit" onClick={onEdit} />
          <ActionButton icon={Trash2} label="Delete" onClick={onDelete} danger />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {beds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-4">
            No beds in this room yet.
          </div>
        ) : (
          beds.map((bed) => (
            <div key={itemId(bed)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-blue-700" />
                    <p className="font-bold text-slate-950">Bed {bed.bedNumber || "-"}</p>
                  </div>
                  <div className="mt-2"><StatusBadge status={bed.bedStatus} /></div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onEditBed(bed)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteBed(bed)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {bed.notes ? <p className="mt-3 text-xs leading-5 text-slate-500">{bed.notes}</p> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, primary = false, danger = false }) {
  const classes = primary
    ? "bg-blue-600 text-white hover:bg-blue-700"
    : danger
      ? "border border-rose-100 bg-white text-rose-700 hover:bg-rose-50"
      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold transition ${classes}`}
    >
      {React.createElement(icon, { className: "h-4 w-4" })}
      {label}
    </button>
  );
}

function SetupFormModal({ modal, saving, onClose, onChange, onSubmit }) {
  const title = `${modal.mode === "edit" ? "Edit" : "Add"} ${
    modal.type === "ward" ? "Ward" : modal.type === "room" ? "Room" : "Bed"
  }`;
  const subtitle =
    modal.type === "ward"
      ? "Add ward details."
      : modal.type === "room"
        ? `Ward: ${modal.ward?.wardName || "Selected ward"}`
        : `Room ${modal.room?.roomNumber || ""} in ${modal.ward?.wardName || "selected ward"}`;

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2">
          {modal.type === "ward" ? (
            <>
              <Field label="Ward Name">
                <input className={inputClass} value={modal.form.wardName} onChange={(e) => onChange("wardName", e.target.value)} required />
              </Field>
              <Field label="Ward Type">
                <select className={selectClass} value={modal.form.wardType} onChange={(e) => onChange("wardType", e.target.value)} required>
                  {WARD_TYPES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Floor Number">
                <input className={inputClass} value={modal.form.floorNumber} onChange={(e) => onChange("floorNumber", e.target.value)} required />
              </Field>
              <Field label="Status">
                <select className={selectClass} value={modal.form.status} onChange={(e) => onChange("status", e.target.value)}>
                  {WARD_STATUSES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
                <span>Description</span>
                <textarea
                  className="admin-textarea min-h-24 resize-none"
                  value={modal.form.description}
                  onChange={(e) => onChange("description", e.target.value)}
                />
              </label>
            </>
          ) : null}

          {modal.type === "room" ? (
            <>
              <Field label="Room Number">
                <input className={inputClass} value={modal.form.roomNumber} onChange={(e) => onChange("roomNumber", e.target.value)} required />
              </Field>
              <Field label="Room Type">
                <select className={selectClass} value={modal.form.roomType} onChange={(e) => onChange("roomType", e.target.value)} required>
                  {ROOM_TYPES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Floor Number">
                <input className={inputClass} value={modal.form.floorNumber} onChange={(e) => onChange("floorNumber", e.target.value)} required />
              </Field>
              <Field label="Status">
                <select className={selectClass} value={modal.form.status} onChange={(e) => onChange("status", e.target.value)}>
                  {ROOM_STATUSES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
            </>
          ) : null}

          {modal.type === "bed" ? (
            <>
              <Field label="Bed Number">
                <input className={inputClass} value={modal.form.bedNumber} onChange={(e) => onChange("bedNumber", e.target.value)} required />
              </Field>
              <Field label="Bed Status">
                <select className={selectClass} value={modal.form.bedStatus} onChange={(e) => onChange("bedStatus", e.target.value)}>
                  {BED_STATUSES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
                <span>Notes</span>
                <textarea
                  className="admin-textarea min-h-24 resize-none"
                  value={modal.form.notes}
                  onChange={(e) => onChange("notes", e.target.value)}
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmDeleteModal({ item, saving, onClose, onConfirm }) {
  const label =
    item.type === "ward"
      ? item.ward?.wardName || "this ward"
      : item.type === "room"
        ? `Room ${item.room?.roomNumber || ""}`
        : `Bed ${item.bed?.bedNumber || ""}`;

  return (
    <Modal title={`Delete ${item.type}`} subtitle="The backend will block this if it is unsafe." onClose={onClose}>
      <div className="px-5 py-5">
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          Are you sure you want to delete {label}? This action cannot be undone.
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onConfirm}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete
        </button>
      </div>
    </Modal>
  );
}
