import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ImagePlus,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";

function formatDisplayDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const monthNames = [
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
  const day = String(Number(d));
  const month = monthNames[dateObj.getMonth()] || "";
  return `${day} ${month} ${y}`;
}

function slotToMinutes(slot) {
  if (!slot) return 0;
  let hh = Number(slot.hour || 0);
  const mm = Number(slot.minute || 0);
  const ampm = String(slot.ampm || "AM").toUpperCase();

  if (ampm === "AM" && hh === 12) hh = 0;
  else if (ampm === "PM" && hh !== 12) hh += 12;

  return hh * 60 + mm;
}

function toSlotLabel(slot) {
  return `${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(
    2,
    "0",
  )} ${slot.ampm}`;
}

function toBackendSlotString(slot) {
  return `${formatDisplayDate(slot.date)} • ${String(slot.hour).padStart(
    2,
    "0",
  )}:${String(slot.minute).padStart(2, "0")} ${slot.ampm}`;
}

function parseBackendSlots(rawSlots = []) {
  if (!Array.isArray(rawSlots)) return [];

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

  return rawSlots
    .map((raw, idx) => {
      const value = String(raw || "").trim();

      const custom = value.match(
        /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s*•\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
      );
      if (custom) {
        const day = String(Number(custom[1])).padStart(2, "0");
        const monthIndex = months.findIndex(
          (m) => m.toLowerCase() === custom[2].toLowerCase(),
        );
        const month = String(monthIndex + 1).padStart(2, "0");
        const year = custom[3];
        return {
          id: `slot-${idx}-${Date.now()}`,
          date: `${year}-${month}-${day}`,
          hour: String(Number(custom[4])).padStart(2, "0"),
          minute: String(Number(custom[5])).padStart(2, "0"),
          ampm: custom[6].toUpperCase(),
        };
      }

      const iso = value.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/,
      );
      if (iso) {
        const year = iso[1];
        const month = iso[2];
        const day = iso[3];
        let hh = Number(iso[4] || 10);
        const mm = String(Number(iso[5] || 0)).padStart(2, "0");
        let ampm = "AM";

        if (hh === 0) {
          hh = 12;
          ampm = "AM";
        } else if (hh === 12) {
          ampm = "PM";
        } else if (hh > 12) {
          hh -= 12;
          ampm = "PM";
        }

        return {
          id: `slot-${idx}-${Date.now()}`,
          date: `${year}-${month}-${day}`,
          hour: String(hh).padStart(2, "0"),
          minute: mm,
          ampm,
        };
      }

      return null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return slotToMinutes(a) - slotToMinutes(b);
    });
}

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      {children} {required ? <span className="text-rose-500">*</span> : null}
    </label>
  );
}

function InputBase({
  as = "input",
  className = "",
  icon = null,
  rightIcon = null,
  ...props
}) {
  const Component = as;
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
      ) : null}

      <Component
        {...props}
        className={[
          "w-full rounded-2xl border border-slate-200 bg-[#f7f9fc] text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white",
          as === "textarea" ? "min-h-[120px] px-4 py-3" : "h-11 px-4",
          icon ? "pl-10" : "",
          rightIcon ? "pr-10" : "",
          className,
        ].join(" ")}
      />

      {rightIcon ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          {rightIcon}
        </span>
      ) : null}
    </div>
  );
}

export default function AddService({ apiBase, serviceId }) {
  const API_BASE = apiBase || "http://localhost:4000";
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    serviceName: "",
    about: "",
    price: "",
    availability: "available",
    imageFile: null,
    imagePreview: "",
    instructions: [""],
    slots: [],
  });

  const [slotDate, setSlotDate] = useState("");
  const [slotHour, setSlotHour] = useState("");
  const [slotMinute, setSlotMinute] = useState("00");
  const [slotAmpm, setSlotAmpm] = useState("AM");

  const [hasExistingImage, setHasExistingImage] = useState(false);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [today] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().split("T")[0];
  });

  const slotCount = useMemo(() => form.slots.length, [form.slots]);

  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
    return () => clearTimeout(t);
  }, [toast.show]);

  useEffect(() => {
    let mounted = true;

    async function loadService() {
      if (!serviceId) return;

      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/services/${serviceId}`);
        const body = await res.json().catch(() => null);

        if (!res.ok) {
          showToast("error", body?.message || "Could not load service.");
          return;
        }

        const data = body?.data || body;
        if (!data || !mounted) return;

        const imageUrl = data.imageUrl || data.image || "";

        setForm({
          serviceName: data.name || "",
          about: data.about || data.description || "",
          price:
            data.price !== undefined && data.price !== null
              ? String(data.price)
              : "",
          availability: data.available ? "available" : "unavailable",
          imageFile: null,
          imagePreview: imageUrl,
          instructions:
            Array.isArray(data.instructions) && data.instructions.length
              ? data.instructions
              : [""],
          slots: Array.isArray(data.slots)
            ? parseBackendSlots(data.slots)
            : data.slots && typeof data.slots === "object"
              ? Object.entries(data.slots)
                  .flatMap(([date, times]) =>
                    (Array.isArray(times) ? times : []).map((time, idx) => {
                      const m = String(time).match(
                        /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
                      );
                      return {
                        id: `slot-map-${date}-${idx}`,
                        date,
                        hour: m ? String(Number(m[1])).padStart(2, "0") : "10",
                        minute: m
                          ? String(Number(m[2])).padStart(2, "0")
                          : "00",
                        ampm: m ? m[3].toUpperCase() : "AM",
                      };
                    }),
                  )
                  .sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return slotToMinutes(a) - slotToMinutes(b);
                  })
              : [],
        });

        setHasExistingImage(Boolean(imageUrl));
        setRemoveExistingImage(false);
      } catch (err) {
        console.error("load service error:", err);
        showToast("error", "Could not load service.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadService();

    return () => {
      mounted = false;
    };
  }, [serviceId, API_BASE]);

  function showToast(type, message) {
    setToast({ show: true, type, message });
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: false }));
  }

  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (form.imagePreview && form.imageFile) {
      try {
        URL.revokeObjectURL(form.imagePreview);
      } catch {}
    }

    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));

    setHasExistingImage(false);
    setRemoveExistingImage(false);
    setErrors((prev) => ({ ...prev, image: false }));
  }

  function removeImage() {
    if (form.imagePreview && form.imageFile) {
      try {
        URL.revokeObjectURL(form.imagePreview);
      } catch {}
    }

    setForm((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: "",
    }));

    if (serviceId && hasExistingImage) {
      setRemoveExistingImage(true);
      setHasExistingImage(false);
    }

    if (fileInputRef.current) {
      try {
        fileInputRef.current.value = "";
      } catch {}
    }
  }

  function updateInstruction(index, value) {
    setForm((prev) => ({
      ...prev,
      instructions: prev.instructions.map((item, i) =>
        i === index ? value : item,
      ),
    }));
    setErrors((prev) => ({ ...prev, instructions: false }));
  }

  function addInstruction() {
    setForm((prev) => ({
      ...prev,
      instructions: [...prev.instructions, ""],
    }));
  }

  function removeInstruction(index) {
    setForm((prev) => {
      const next = prev.instructions.filter((_, i) => i !== index);
      return {
        ...prev,
        instructions: next.length ? next : [""],
      };
    });
  }

  function addSlotToForm() {
    if (!slotDate || !slotHour) {
      showToast("error", "Select date and time first.");
      return;
    }

    if (slotDate < today) {
      showToast("error", "Cannot add a slot in the past.");
      return;
    }

    const newSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: slotDate,
      hour: String(slotHour).padStart(2, "0"),
      minute: String(slotMinute).padStart(2, "0"),
      ampm: slotAmpm,
    };

    const duplicate = form.slots.some(
      (s) =>
        s.date === newSlot.date &&
        s.hour === newSlot.hour &&
        s.minute === newSlot.minute &&
        s.ampm === newSlot.ampm,
    );

    if (duplicate) {
      showToast("error", "This slot already exists.");
      return;
    }

    if (slotDate === today) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const slotMinutes = slotToMinutes(newSlot);
      if (slotMinutes <= nowMinutes) {
        showToast("error", "Cannot add a time that already passed today.");
        return;
      }
    }

    setForm((prev) => ({
      ...prev,
      slots: [...prev.slots, newSlot].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return slotToMinutes(a) - slotToMinutes(b);
      }),
    }));

    setSlotHour("");
    setSlotMinute("00");
    setSlotAmpm("AM");
    setErrors((prev) => ({ ...prev, slots: false }));
  }

  function removeSlot(id) {
    setForm((prev) => ({
      ...prev,
      slots: prev.slots.filter((s) => s.id !== id),
    }));
  }

  function validate() {
    const nextErrors = {
      serviceName: !form.serviceName.trim(),
      about: !form.about.trim(),
      price: !String(form.price).trim(),
      instructions: !form.instructions.some((x) => String(x).trim()),
      slots: form.slots.length === 0,
      image:
        !serviceId && !form.imageFile && !form.imagePreview
          ? true
          : !form.imageFile && !form.imagePreview && !hasExistingImage,
    };

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) {
      showToast("error", "Please fill all required fields.");
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("name", form.serviceName.trim());
      fd.append("about", form.about.trim());
      fd.append("price", String(form.price).trim());
      fd.append("availability", form.availability);

      const cleanedInstructions = form.instructions
        .map((x) => String(x).trim())
        .filter(Boolean);

      fd.append("instructions", JSON.stringify(cleanedInstructions));
      fd.append(
        "slots",
        JSON.stringify(form.slots.map((slot) => toBackendSlotString(slot))),
      );

      if (form.imageFile) fd.append("image", form.imageFile);
      if (serviceId && removeExistingImage) fd.append("removeImage", "true");

      const method = serviceId ? "PUT" : "POST";
      const url = serviceId
        ? `${API_BASE}/api/services/${serviceId}`
        : `${API_BASE}/api/services`;

      const res = await fetch(url, {
        method,
        body: fd,
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message || "Failed to save service.");
      }

      showToast(
        "success",
        serviceId
          ? "Service updated successfully."
          : "Service added successfully.",
      );

      if (!serviceId) {
        if (form.imagePreview && form.imageFile) {
          try {
            URL.revokeObjectURL(form.imagePreview);
          } catch {}
        }

        setForm({
          serviceName: "",
          about: "",
          price: "",
          availability: "available",
          imageFile: null,
          imagePreview: "",
          instructions: [""],
          slots: [],
        });

        setHasExistingImage(false);
        setRemoveExistingImage(false);
        setSlotDate("");
        setSlotHour("");
        setSlotMinute("00");
        setSlotAmpm("AM");

        if (fileInputRef.current) {
          try {
            fileInputRef.current.value = "";
          } catch {}
        }
      }
    } catch (err) {
      console.error("submit service error:", err);
      showToast("error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {toast.show ? (
        <div
          className={`fixed right-4 top-4 z-50 flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
            toast.type === "success"
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <div className="mt-0.5">
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
          </div>
          <div className="text-sm font-medium">{toast.message}</div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[#eef4ff] px-6 py-7 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-[1.9rem] font-bold tracking-tight text-slate-900">
                  {serviceId
                    ? "Update Hospital Service"
                    : "Onboard New Hospital Service"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configure service information, patient instructions, pricing,
                  and availability slots.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-8 sm:px-8">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="xl:sticky xl:top-6 xl:self-start">
                <FieldLabel required>Service Image</FieldLabel>

                <div className="rounded-[24px] border border-slate-200 bg-[#f8faff] p-4">
                  <div className="rounded-[20px] border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
                    {form.imagePreview ? (
                      <div className="relative mx-auto h-40 w-40">
                        <img
                          src={form.imagePreview}
                          alt="Service preview"
                          className="h-full w-full rounded-3xl object-cover ring-1 ring-slate-200"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-2 text-white shadow"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-3xl bg-[#eef4ff] text-blue-600">
                        <ImagePlus className="h-11 w-11" />
                      </div>
                    )}

                    <div className="mt-5 text-sm font-semibold text-slate-700">
                      Upload service image
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Supported formats: JPG, PNG, WEBP
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImage}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <Upload className="h-4 w-4" />
                      {form.imagePreview ? "Change image" : "Choose image"}
                    </button>
                  </div>

                  {errors.image ? (
                    <p className="mt-3 text-xs text-rose-500">
                      Service image is required.
                    </p>
                  ) : null}
                </div>
              </aside>

              <div className="space-y-8">
                <section>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <FieldLabel required>Service Name</FieldLabel>
                      <InputBase
                        value={form.serviceName}
                        onChange={(e) =>
                          setField("serviceName", e.target.value)
                        }
                        placeholder="e.g. MRI Scan"
                        className={errors.serviceName ? "border-rose-300" : ""}
                      />
                    </div>

                    <div>
                      <FieldLabel required>Availability</FieldLabel>
                      <InputBase
                        as="select"
                        value={form.availability}
                        onChange={(e) =>
                          setField("availability", e.target.value)
                        }
                        className={`appearance-none ${errors.availability ? "border-rose-300" : ""}`}
                        rightIcon={<ChevronDown className="h-4 w-4" />}
                      >
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                      </InputBase>
                    </div>

                    <div>
                      <FieldLabel required>Service Price ($)</FieldLabel>
                      <InputBase
                        type="number"
                        min="0"
                        value={form.price}
                        onChange={(e) => setField("price", e.target.value)}
                        placeholder="0.00"
                        className={errors.price ? "border-rose-300" : ""}
                      />
                    </div>

                    <div>
                      <FieldLabel>Service Type</FieldLabel>
                      <InputBase placeholder="Hospital service" disabled />
                    </div>

                    <div className="md:col-span-2">
                      <FieldLabel required>Service Description</FieldLabel>
                      <InputBase
                        as="textarea"
                        value={form.about}
                        onChange={(e) => setField("about", e.target.value)}
                        placeholder="Describe the service, procedure, and what patients should expect."
                        className={errors.about ? "border-rose-300" : ""}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-[#fbfcfe] p-5 sm:p-6">
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-slate-900">
                      Patient Instructions
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Add any preparation notes or important guidance.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {form.instructions.map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-1">
                          <InputBase
                            as="textarea"
                            rows={2}
                            value={item}
                            onChange={(e) =>
                              updateInstruction(index, e.target.value)
                            }
                            placeholder={`Instruction ${index + 1}`}
                            className={`min-h-[86px] w-full resize-y ${errors.instructions ? "border-rose-300" : ""}`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeInstruction(index)}
                          className="mt-3 shrink-0 rounded-full bg-rose-50 p-2.5 text-rose-600 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addInstruction}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                    >
                      <Upload className="h-4 w-4" />
                      Add Instruction
                    </button>
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-[#fbfcfe] p-5 sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Availability Slots
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Add available booking times for this service.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <InputBase
                      type="date"
                      min={today}
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                    />

                    <InputBase
                      as="select"
                      value={slotHour}
                      onChange={(e) => setSlotHour(e.target.value)}
                      className="appearance-none"
                      rightIcon={<ChevronDown className="h-4 w-4" />}
                    >
                      <option value="">Hour</option>
                      {Array.from({ length: 12 }).map((_, i) => {
                        const v = String(i + 1).padStart(2, "0");
                        return (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        );
                      })}
                    </InputBase>

                    <InputBase
                      as="select"
                      value={slotMinute}
                      onChange={(e) => setSlotMinute(e.target.value)}
                      className="appearance-none"
                      rightIcon={<ChevronDown className="h-4 w-4" />}
                    >
                      {Array.from({ length: 12 }).map((_, i) => {
                        const v = String(i * 5).padStart(2, "0");
                        return (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        );
                      })}
                    </InputBase>

                    <InputBase
                      as="select"
                      value={slotAmpm}
                      onChange={(e) => setSlotAmpm(e.target.value)}
                      className="appearance-none"
                      rightIcon={<ChevronDown className="h-4 w-4" />}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </InputBase>

                    <button
                      type="button"
                      onClick={addSlotToForm}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <Clock3 className="h-4 w-4" />
                      Add Slot
                    </button>
                  </div>

                  {errors.slots ? (
                    <p className="mt-3 text-xs text-rose-500">
                      Add at least one slot.
                    </p>
                  ) : null}

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {form.slots.length ? (
                      form.slots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-800">
                              {formatDisplayDate(slot.date)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {toSlotLabel(slot)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeSlot(slot.id)}
                            className="ml-3 rounded-full bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="col-span-full text-sm text-slate-500">
                        No slots added yet.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 text-sm text-slate-500">
                    Total slots:{" "}
                    <span className="font-semibold text-slate-800">
                      {slotCount}
                    </span>
                  </div>
                </section>

                <div className="flex justify-center pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`inline-flex min-w-[230px] items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold shadow-sm transition ${
                      loading
                        ? "cursor-not-allowed bg-blue-300 text-white"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : serviceId ? (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        Update Service
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Create Service
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
