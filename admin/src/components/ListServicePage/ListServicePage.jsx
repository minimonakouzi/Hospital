import React, { useState, useRef, useEffect } from "react";
import {
  Image as ImageIcon,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronDown,
  Search,
  Calendar,
  Plus,
} from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { adminAuthHeaders } from "../../utils/adminAuthHeaders";

export default function ListServicePage({ apiBase }) {
  const { getToken } = useAuth();
  const API_BASE = apiBase || "http://localhost:4000";

  const [services, setServices] = useState([]);
  const [openDetails, setOpenDetails] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [editForm, setEditForm] = useState(null);
  const fileRef = useRef();

  const [toasts, setToasts] = useState([]);

  function addToast(
    message,
    type = "success",
    ttl = 3000,
    position = "bottom-right",
    animated = false,
  ) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type, position, animated }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const todayISO = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();

  function sortSlotsForDisplay(slots = []) {
    if (!Array.isArray(slots)) return [];

    const today = new Date();
    const todayVal = Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const dateOnlyVal = (dateStr) => {
      if (!dateStr || typeof dateStr !== "string")
        return Number.POSITIVE_INFINITY;
      const parts = dateStr.split("-");
      if (parts.length !== 3) return Number.POSITIVE_INFINITY;
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d))
        return Number.POSITIVE_INFINITY;
      return Date.UTC(y, m, d);
    };

    const arr = slots.slice();

    arr.sort((a, b) => {
      const aDateVal = dateOnlyVal(a.date);
      const bDateVal = dateOnlyVal(b.date);

      const aIsPast = aDateVal < todayVal;
      const bIsPast = bDateVal < todayVal;

      if (aIsPast !== bIsPast) return aIsPast ? -1 : 1;

      if (aIsPast && bIsPast && aDateVal !== bDateVal) {
        return bDateVal - aDateVal;
      }

      if (!aIsPast && !bIsPast && aDateVal !== bDateVal) {
        return aDateVal - bDateVal;
      }

      const aTs = slotDateTimeToMs(a) || Number.POSITIVE_INFINITY;
      const bTs = slotDateTimeToMs(b) || Number.POSITIVE_INFINITY;
      return aTs - bTs;
    });

    return arr;
  }

  async function fetchServices() {
    try {
      const res = await fetch(`${API_BASE}/api/services`);
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Failed to fetch services", body);
        addToast("Failed to load services", "error");
        setServices([]);
        return;
      }

      const items = (body && (body.data || body.services || body.items)) || [];

      const normalized = items.map((s) => ({
        id: s._id || s.id,
        name: s.name,
        about: s.about || "",
        instructions: s.instructions || s.preInstructions || [],
        instructionsText: (s.instructions || s.preInstructions || []).join(
          "\n",
        ),
        price: s.price ?? s.fee ?? 0,
        available: s.available ?? s.availability === "Available",
        image: s.image || s.imageUrl || s.imageSrc || s.imageSmall || "",
        slots: Array.isArray(s.slots)
          ? convertSlotsForUI(s.slots)
          : s.slots && typeof s.slots === "object"
            ? convertSlotsMapToArray(s.slots)
            : [],
        _raw: s,
      }));

      setServices(normalized);
    } catch (err) {
      console.error("fetchServices error", err);
      addToast("Network error while loading services", "error");
      setServices([]);
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  function convertSlotsForUI(slotStrings = []) {
    return (slotStrings || []).map((s, idx) => {
      const raw = String(s || "");
      const m = raw.match(
        /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s*•\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i,
      );

      if (m) {
        const day = m[1].padStart(2, "0");
        const monthShort = m[2];
        const year = m[3];
        const hour = String(Number(m[4]));
        const minute = String(m[5]).padStart(2, "0");
        const ampm = (m[6] || "AM").toUpperCase();
        const mi = months.findIndex(
          (mm) => mm.toLowerCase() === monthShort.toLowerCase(),
        );
        const monthNum = mi >= 0 ? String(mi + 1).padStart(2, "0") : "01";
        const date = `${year}-${monthNum}-${day}`;
        return { id: `s-${idx}`, date, hour, minute, ampm, raw };
      }

      const isoMatch = raw.match(
        /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})?)?/,
      );

      if (isoMatch) {
        const datePart = isoMatch[1];
        let hour = "10";
        let minute = "00";
        let ampm = "AM";

        if (isoMatch[2]) {
          const hh = Number(isoMatch[2]);
          const mm = String(Number(isoMatch[3] || "0")).padStart(2, "0");
          minute = mm;

          if (hh === 0) {
            hour = "12";
            ampm = "AM";
          } else if (hh === 12) {
            hour = "12";
            ampm = "PM";
          } else if (hh > 12) {
            hour = String(hh - 12);
            ampm = "PM";
          } else {
            hour = String(hh);
            ampm = "AM";
          }
        }

        return { id: `s-${idx}`, date: datePart, hour, minute, ampm, raw };
      }

      const timeOnly = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeOnly) {
        const hour = String(Number(timeOnly[1]));
        const minute = String(timeOnly[2]).padStart(2, "0");
        const ampm = (timeOnly[3] || "AM").toUpperCase();
        return {
          id: `s-${idx}`,
          date: "",
          hour,
          minute,
          ampm,
          raw,
        };
      }

      return {
        id: `s-${idx}`,
        date: "",
        hour: "10",
        minute: "00",
        ampm: "AM",
        raw,
      };
    });
  }

  function convertSlotsMapToArray(slotsMap) {
    try {
      const out = [];
      if (slotsMap instanceof Map) {
        for (const [date, arr] of slotsMap.entries()) {
          (arr || []).forEach((t, idx) => {
            const parsed = parseFrontendSlotString(date, t);
            out.push({ id: `${date}-${idx}`, ...parsed, raw: t });
          });
        }
      } else {
        for (const date of Object.keys(slotsMap || {})) {
          (slotsMap[date] || []).forEach((t, idx) => {
            const parsed = parseFrontendSlotString(date, t);
            out.push({ id: `${date}-${idx}`, ...parsed, raw: t });
          });
        }
      }
      return out;
    } catch (e) {
      return [];
    }
  }

  function parseFrontendSlotString(date, timeStr) {
    const slot = {
      date: date || "",
      hour: "10",
      minute: "00",
      ampm: "AM",
      raw: timeStr,
    };

    if (!timeStr) return slot;
    const raw = String(timeStr);

    const isoMatch = raw.match(
      /[T\s](\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})?$/,
    );
    if (isoMatch) {
      const hh24 = Number(isoMatch[1]);
      const mm = String(Number(isoMatch[2])).padStart(2, "0");

      if (hh24 === 0) {
        slot.hour = "12";
        slot.ampm = "AM";
      } else if (hh24 === 12) {
        slot.hour = "12";
        slot.ampm = "PM";
      } else if (hh24 > 12) {
        slot.hour = String(hh24 - 12);
        slot.ampm = "PM";
      } else {
        slot.hour = String(hh24);
        slot.ampm = "AM";
      }

      slot.minute = mm;
      return slot;
    }

    const m = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (m) {
      slot.hour = String(Number(m[1]));
      slot.minute = String(m[2]).padStart(2, "0");
      slot.ampm = (m[3] || "AM").toUpperCase();
    }

    return slot;
  }

  function toggleDetails(id) {
    setOpenDetails((prev) => ({ [id]: !prev[id] }));
  }

  async function startEdit(service) {
    let latest = service;

    if (service.id) {
      try {
        const res = await fetch(`${API_BASE}/api/services/${service.id}`);
        const body = await res.json().catch(() => null);
        if (res.ok && body) {
          latest = body.data || body.service || body;
        }
      } catch {}
    }

    const normalized = {
      id: latest._id || latest.id,
      name: latest.name || "",
      about: latest.about || "",
      instructionsText: (
        latest.instructions ||
        latest.preInstructions ||
        []
      ).join("\n"),
      price: latest.price ?? latest.fee ?? 0,
      available:
        latest.available ?? latest.availability === "Available" ?? true,
      imagePreview: latest.imageUrl || latest.image || latest.imageSrc || "",
      imageFile: null,
      slots: sortSlotsForDisplay(
        Array.isArray(latest.slots)
          ? convertSlotsForUI(latest.slots)
          : convertSlotsMapToArray(latest.slots),
      ),
    };

    setEditingId(normalized.id);
    setEditForm(normalized);
    setOpenDetails({ [normalized.id]: true });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function validateSlots(slots = []) {
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];

      if (!slot) {
        return {
          valid: false,
          message: "Please fill all slot date/time fields.",
        };
      }
      if (!slot.date || !/^\d{4}-\d{2}-\d{2}$/.test(slot.date)) {
        return {
          valid: false,
          message:
            "Please provide a valid date (year-month-day) for all slots. Example: 2025-12-31.",
        };
      }
      if (!slot.hour || !/^(?:[1-9]|1[0-2])$/.test(String(slot.hour))) {
        return {
          valid: false,
          message: "Please select hour (1-12) for all slots.",
        };
      }
      if (!slot.minute || !/^\d{2}$/.test(String(slot.minute))) {
        return {
          valid: false,
          message: "Please select minute (00-59) for all slots.",
        };
      }

      const mm = Number(slot.minute);
      if (isNaN(mm) || mm < 0 || mm > 59) {
        return {
          valid: false,
          message: "Please select a valid minute (00-59) for all slots.",
        };
      }

      if (!slot.ampm || (slot.ampm !== "AM" && slot.ampm !== "PM")) {
        return {
          valid: false,
          message: "Please select AM or PM for all slots.",
        };
      }

      const slotTs = slotDateTimeToMs(slot);
      if (slotTs <= Date.now()) {
        return {
          valid: false,
          message:
            "One or more slots are in the past. Please pick future date/time for all slots.",
        };
      }
    }

    return { valid: true };
  }

  function findDuplicateInSlots(slots = []) {
    const seen = new Set();
    for (let s of slots) {
      const key = `${s.date}|${s.hour}|${String(s.minute).padStart(2, "0")}|${s.ampm}`;
      if (seen.has(key)) return key;
      seen.add(key);
    }
    return null;
  }

  function slotsToFormattedStrings(slots = []) {
    return (slots || []).map((s) => {
      if (typeof s === "string") return s;
      if (s.raw && typeof s.raw === "string" && s.raw.includes("•"))
        return s.raw;

      const parts = (s.date || "").split("-");
      const year = parts[0] || "";
      const monthNum = Number(parts[1] || "1");
      const day = parts[2] ? String(Number(parts[2])).padStart(2, "0") : "";
      const monthName = months[monthNum - 1] || months[0];
      const hour = String(s.hour || "10").padStart(2, "0");
      const minute = String(s.minute || "00").padStart(2, "0");
      const ampm = (s.ampm || "AM").toUpperCase();

      if (!day || !year) {
        return s.raw || `${hour}:${minute} ${ampm}`;
      }

      return `${day} ${monthName} ${year} • ${hour}:${minute} ${ampm}`;
    });
  }

  function slotDateTimeToMs(slot) {
    const [y, m, d] = (slot.date || "").split("-");
    if (!y || !m || !d) return 0;

    let h = Number(slot.hour || 0);
    const mm = Number(slot.minute || 0);
    const ap = (slot.ampm || "AM").toUpperCase();

    if (ap === "AM") {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h = h + 12;
    }

    return new Date(Number(y), Number(m) - 1, Number(d), h, mm, 0, 0).getTime();
  }

  async function saveEdit() {
    if (!editForm) return;

    if ((editForm.slots || []).length > 0) {
      const validation = validateSlots(editForm.slots || []);
      if (!validation.valid) {
        addToast(validation.message, "error");
        return;
      }

      const dupKey = findDuplicateInSlots(editForm.slots || []);
      if (dupKey) {
        const [date, hour, minute, ampm] = dupKey.split("|");
        addToast(
          `Duplicate slot detected: ${formatDateHuman(
            date,
          )} — ${hour}:${minute} ${ampm}`,
          "error",
          4000,
          "top-right",
          true,
        );
        return;
      }
    }

    try {
      const fd = new FormData();
      fd.append("name", editForm.name || "");
      fd.append("about", editForm.about || "");
      fd.append("price", String(Number(editForm.price || 0)));
      fd.append(
        "availability",
        editForm.available ? "available" : "unavailable",
      );

      const instructions = (editForm.instructionsText || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      fd.append("instructions", JSON.stringify(instructions));

      const slotsFormatted = slotsToFormattedStrings(editForm.slots || []);
      fd.append("slots", JSON.stringify(slotsFormatted));

      if (editForm.imageFile) {
        fd.append("image", editForm.imageFile);
      }

      const id = editForm.id;
      const res = await fetch(`${API_BASE}/api/services/${id}`, {
        method: "PUT",
        headers: await adminAuthHeaders(getToken),
        body: fd,
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Save failed:", body);
        addToast(body?.message || "Failed to save service", "error");
        return;
      }

      const updatedRaw = body?.data || body?.service || null;

      setServices((list) =>
        list.map((s) =>
          s.id === id
            ? {
                id,
                name: editForm.name,
                about: editForm.about,
                instructions,
                instructionsText: instructions.join("\n"),
                price: Number(editForm.price) || 0,
                available: !!editForm.available,
                image:
                  updatedRaw?.imageUrl ||
                  updatedRaw?.image ||
                  editForm.imagePreview ||
                  s.image,
                slots:
                  updatedRaw?.slots && Array.isArray(updatedRaw.slots)
                    ? convertSlotsForUI(updatedRaw.slots)
                    : editForm.slots || s.slots,
                _raw: updatedRaw || s._raw,
              }
            : s,
        ),
      );

      addToast("Service updated successfully", "success");
      cancelEdit();
    } catch (err) {
      console.error("saveEdit error", err);
      addToast("Network error while saving", "error");
    }
  }

  async function removeService(id) {
    if (!window.confirm("Are you sure you want to remove this service?"))
      return;

    try {
      const res = await fetch(`${API_BASE}/api/services/${id}`, {
        method: "DELETE",
        headers: await adminAuthHeaders(getToken),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Delete failed", body);
        addToast(body?.message || "Failed to remove service", "error");
        return;
      }

      setServices((s) => s.filter((x) => x.id !== id));
      setOpenDetails({});
      addToast("Service removed", "success");
    } catch (err) {
      console.error("removeService error", err);
      addToast("Network error while removing", "error");
    }
  }

  function onImageFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (editForm?.imagePreview && editForm.imagePreview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(editForm.imagePreview);
      } catch {}
    }

    const url = URL.createObjectURL(f);
    setEditForm((prev) => ({ ...prev, imagePreview: url, imageFile: f }));
  }

  function addNewSlot() {
    const nextId =
      (editForm.slots?.reduce((a, b) => {
        const idA = Number(String(a.id || "0").replace(/\D/g, "")) || 0;
        const idB = Number(String(b.id || "0").replace(/\D/g, "")) || 0;
        return Math.max(idA, idB);
      }, 0) || 0) + 1;

    const newSlot = {
      id: `s-${nextId}`,
      date: todayISO,
      hour: "10",
      minute: "00",
      ampm: "AM",
    };

    setEditForm((p) => ({ ...p, slots: [...(p.slots || []), newSlot] }));
  }

  function updateSlot(slotId, field, value) {
    setEditForm((p) => {
      if (field === "date" && value) {
        if (value < todayISO) {
          addToast(
            "Cannot select a past date. Choose today or a future date.",
            "error",
          );
          return p;
        }
      }

      const newSlots = (p.slots || []).map((s) =>
        s.id === slotId ? { ...s, [field]: value } : s,
      );

      const dupKey = findDuplicateInSlots(newSlots || []);
      if (dupKey) {
        const [date, hour, minute, ampm] = dupKey.split("|");
        addToast(
          `Duplicate slot detected: ${formatDateHuman(
            date,
          )} — ${hour}:${minute} ${ampm}`,
          "error",
          3500,
          "top-right",
          true,
        );
      }

      return { ...p, slots: newSlots };
    });
  }

  function removeSlot(slotId) {
    setEditForm((p) => ({
      ...p,
      slots: (p.slots || []).filter((s) => s.id !== slotId),
    }));
  }

  const filtered = services
    .filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((s) => {
      if (filterMode === "all") return true;
      if (filterMode === "available") return s.available === true;
      if (filterMode === "unavailable") return s.available === false;
      return true;
    });

  function formatDateHuman(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const mi = Number(m) - 1;
    const mon = months[mi] || m;
    return `${String(Number(d))} ${mon} ${y}`;
  }

  function availabilityPill(isAvailable) {
    return isAvailable
      ? "inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600"
      : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";
  }

  function renderToast(t) {
    return (
      <div
        key={t.id}
        className={`rounded-2xl border px-4 py-3 shadow-lg ${
          t.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-rose-200 bg-rose-50 text-rose-700"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              t.type === "success"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {t.type === "success" ? <Check size={14} /> : <X size={14} />}
          </div>
          <div className="flex-1 text-sm font-medium">{t.message}</div>
          <button
            onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
            className="text-slate-400 transition hover:text-slate-600"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 md:p-6">
      <div className="mx-auto max-w-[1680px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[2rem] font-bold tracking-[-0.03em] text-slate-900">
              Healthcare Services
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Search, modify, and manage your clinical service offerings.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Search size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                className="w-full min-w-[180px] bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterMode("all")}
            type="button"
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              filterMode === "all"
                ? "bg-blue-700 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Services
          </button>
          <button
            onClick={() => setFilterMode("available")}
            type="button"
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              filterMode === "available"
                ? "bg-blue-700 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterMode("unavailable")}
            type="button"
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              filterMode === "unavailable"
                ? "bg-blue-700 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Inactive
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((svc) => {
            const isOpen = !!openDetails[svc.id];
            const isEditing = editingId === svc.id;

            return (
              <div
                key={svc.id}
                className={`overflow-hidden rounded-[28px] border bg-white shadow-sm transition ${
                  isOpen
                    ? "border-blue-300 shadow-[0_10px_30px_rgba(37,99,235,0.10)]"
                    : "border-slate-200"
                }`}
              >
                {/* Card top */}
                <div
                  onClick={() => toggleDetails(svc.id)}
                  className="flex cursor-pointer items-start gap-4 px-4 py-4 md:px-5"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {svc.image ? (
                      <img
                        src={svc.image}
                        alt={svc.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={18} className="text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-lg font-semibold text-slate-900">
                            {svc.name}
                          </h2>
                          <span className={availabilityPill(svc.available)}>
                            {svc.available ? "Available" : "Unavailable"}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                          {svc.about || "No description provided."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Calendar size={14} />
                        <span className="text-slate-500">
                          {svc.slots.length} slot
                          {svc.slots.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="font-semibold text-blue-700">
                        ${svc.price}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                      isOpen
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {/* Details */}
                {isOpen && (
                  <div className="border-t border-slate-200 px-4 py-5 md:px-5">
                    {isEditing ? (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[140px_minmax(0,1fr)]">
                          <div className="space-y-3">
                            <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                              {editForm?.imagePreview ? (
                                <img
                                  src={editForm.imagePreview}
                                  alt="preview"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ImageIcon
                                  size={22}
                                  className="text-slate-400"
                                />
                              )}
                            </div>

                            <input
                              ref={fileRef}
                              onChange={onImageFileChange}
                              type="file"
                              accept="image/*"
                              className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Service Name
                              </label>
                              <input
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                value={editForm.name}
                                onChange={(e) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    name: e.target.value,
                                  }))
                                }
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Price
                              </label>
                              <input
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                value={editForm.price}
                                onChange={(e) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    price: e.target.value,
                                  }))
                                }
                                type="number"
                                placeholder="Price"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Availability
                              </label>
                              <select
                                value={editForm.available ? "true" : "false"}
                                onChange={(e) =>
                                  setEditForm((p) => ({
                                    ...p,
                                    available: e.target.value === "true",
                                  }))
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              >
                                <option value="true">Available</option>
                                <option value="false">Unavailable</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Clinical Overview
                          </label>
                          <textarea
                            className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            value={editForm.about}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                about: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Patient Requirements (one per line)
                          </label>
                          <textarea
                            className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            value={editForm.instructionsText}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                instructionsText: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-[#f8fafc] p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Upcoming Schedule Slots
                            </label>
                            <button
                              onClick={addNewSlot}
                              type="button"
                              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                              <Plus size={14} />
                              Add slot
                            </button>
                          </div>

                          <div className="space-y-3">
                            {(editForm.slots || []).map((slot) => (
                              <div
                                key={slot.id}
                                className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[180px_1fr_90px]"
                              >
                                <input
                                  type="date"
                                  value={slot.date}
                                  onChange={(e) =>
                                    updateSlot(slot.id, "date", e.target.value)
                                  }
                                  required
                                  min={todayISO}
                                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />

                                <div className="grid grid-cols-3 gap-2">
                                  <select
                                    value={slot.hour}
                                    onChange={(e) =>
                                      updateSlot(
                                        slot.id,
                                        "hour",
                                        e.target.value,
                                      )
                                    }
                                    required
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                  >
                                    {Array.from(
                                      { length: 12 },
                                      (_, i) => i + 1,
                                    ).map((h) => (
                                      <option key={h} value={String(h)}>
                                        {h}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={slot.minute}
                                    onChange={(e) =>
                                      updateSlot(
                                        slot.id,
                                        "minute",
                                        e.target.value,
                                      )
                                    }
                                    required
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                  >
                                    {Array.from(
                                      { length: 60 },
                                      (_, i) => i,
                                    ).map((m) => (
                                      <option
                                        key={m}
                                        value={String(m).padStart(2, "0")}
                                      >
                                        {String(m).padStart(2, "0")}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={slot.ampm}
                                    onChange={(e) =>
                                      updateSlot(
                                        slot.id,
                                        "ampm",
                                        e.target.value,
                                      )
                                    }
                                    required
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                  >
                                    <option>AM</option>
                                    <option>PM</option>
                                  </select>
                                </div>

                                <button
                                  onClick={() => removeSlot(slot.id)}
                                  className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-3">
                          <button
                            onClick={cancelEdit}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEdit}
                            className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-900">
                            Clinical Overview
                          </h3>
                          <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-4 text-sm leading-6 text-slate-600">
                            {svc.about || "No description provided."}
                          </div>
                        </div>

                        <div>
                          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-900">
                            Patient Requirements
                          </h3>
                          {svc.instructions.length ? (
                            <ul className="space-y-2 text-sm text-slate-600">
                              {svc.instructions.map((p, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-400" />
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-slate-400">
                              No instructions added.
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-900">
                            Upcoming Schedule Slots
                          </h3>

                          {svc.slots.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-[#fafbfc] px-4 py-6 text-sm text-slate-400">
                              No slots scheduled
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              {sortSlotsForDisplay(svc.slots).map(
                                (slot, index) => (
                                  <div
                                    key={slot.id}
                                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                  >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-700">
                                      {index + 1}
                                    </div>
                                    <div className="text-sm text-slate-600">
                                      {formatDateHuman(slot.date)} — {slot.hour}
                                      :{String(slot.minute).padStart(2, "0")}{" "}
                                      {slot.ampm}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap justify-end gap-3">
                          <button
                            onClick={() => startEdit(svc)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>

                          <button
                            onClick={() => removeService(svc.id)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="mt-10 rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
            No services match your search.
          </div>
        )}

        {/* Toasts */}
        <div className="fixed right-4 top-4 z-50 space-y-3">
          {toasts
            .filter((t) => t.position === "top-right")
            .map((t) => renderToast(t))}
        </div>

        <div className="fixed bottom-4 right-4 z-50 space-y-3">
          {toasts
            .filter((t) => t.position === "bottom-right")
            .map((t) => renderToast(t))}
        </div>
      </div>
    </div>
  );
}
