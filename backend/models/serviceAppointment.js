import mongoose from "mongoose";

/**
 * ServiceAppointment model
 * - Hospital / Service based appointment
 * - No doctor
 * - Single major admin (no owner field)
 * - Fully compatible with Service Appointments frontend
 */

const serviceAppointmentSchema = new mongoose.Schema(
  {
    /* =========================
       Patient Info
       ========================= */
    createdBy: {
      type: String,
      default: null, // optional patient user id
      index: true,
    },

    patientName: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },

    age: {
      type: Number,
      min: 0,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other", ""],
      default: "",
    },

    /* =========================
       Service Info
       ========================= */
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    serviceName: {
      type: String,
      required: true, // denormalized for UI speed
    },

    // ✅ NEW: Service Image (snapshot)
    serviceImage: {
      url: { type: String, default: "" },        // Cloudinary / S3 / etc.
      publicId: { type: String, default: "" },   // optional (for delete/update)
    },

    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
      default: null,
    },

    prescriptionFileUrl: {
      type: String,
      default: "",
      trim: true,
    },

    prescriptionStatus: {
      type: String,
      enum: ["Not Required", "Required", "Submitted", "Missing"],
      default: "Not Required",
    },

    fees: {
      type: Number,
      required: true,
      min: 0,
    },

    /* =========================
       Schedule
       ========================= */
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },

    hour: {
      type: Number, // 1–12
      required: true,
    },

    minute: {
      type: Number, // 0–59
      required: true,
    },

    ampm: {
      type: String,
      enum: ["AM", "PM"],
      required: true,
    },

    /* =========================
       Appointment Status
       ========================= */
    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "In Progress",
        "Rescheduled",
        "Completed",
        "Cancelled",
        "Canceled",
      ],
      default: "Pending",
      index: true,
    },

    checkInStatus: {
      type: String,
      enum: ["Not Checked In", "Checked In"],
      default: "Not Checked In",
      index: true,
    },
    checkedInAt: { type: Date, default: null },
    checkedInByNurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nurse",
      default: null,
    },

    rescheduledTo: {
      date: { type: String },
      hour: { type: Number },
      minute: { type: Number },
      ampm: { type: String, enum: ["AM", "PM"] },
    },

    /* =========================
       Payment (Cash / Online)
       ========================= */
    payment: {
      method: {
        type: String,
        enum: ["Cash", "Online"],
        default: "Cash",
      },

      status: {
        type: String,
     enum: ["Pending", "Paid", "Failed", "Refunded"],
        default: "Pending",
      },

      amount: {
        type: Number,
        required: true,
      },

      providerId: {
        type: String, // Stripe payment_intent id
        default: "",
      },

      paidAt: {
        type: Date,
        default: null,
      },

      sessionId: {
        type: String, // Stripe checkout session id
        default: "",
        index: true,
      },

      meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },

   
  },
  { timestamps: true }
);

/* =========================
   Indexes
   ========================= */
serviceAppointmentSchema.index({ date: 1, status: 1 });
serviceAppointmentSchema.index({ serviceId: 1 });
serviceAppointmentSchema.index({ "payment.sessionId": 1 });

const ServiceAppointment =
  mongoose.models.ServiceAppointment ||
  mongoose.model("ServiceAppointment", serviceAppointmentSchema);

export default ServiceAppointment;
