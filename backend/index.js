import cors from 'cors';
import 'dotenv/config';

console.log("CLERK KEY =", process.env.CLERK_PUBLISHABLE_KEY);
import express from 'express';
import { connectDB } from './config/db.js';

// ⭐ ADD CLERK MIDDLEWARE
import { clerkMiddleware } from "@clerk/express";
import appointmentRouter from './routes/appointmentRouter.js';
import doctorRouter from './routes/doctorRouter.js';
import serviceRouter from './routes/serviceRoutes.js';
import serviceAppointmentRouter from './routes/serviceAppointmentRouter.js';
import patientProfileRouter from "./routes/patientProfileRouter.js";
import nurseRouter from "./routes/nurseRouter.js";
import staffRouter from "./routes/staffRouter.js";
import auditLogRouter from "./routes/auditLogRouter.js";
import performanceRouter from "./routes/performanceRouter.js";
const app = express();
const port = process.env.PORT || 4000;

// ⭐ IMPORTANT: ENABLE CREDENTIALS FOR CLERK COOKIE SESSION
const allowedOrigins = [
  "http://localhost:5173", // user frontend
  "http://localhost:5174", // admin dashboard
  "http://localhost:5176", // admin dashboard dev server
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server & tools like Postman (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true, // ✅ REQUIRED for cookies / Clerk
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// ⭐ Use Clerk middleware globally (does NOT protect routes)
//app.use(clerkMiddleware());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Database Connection
connectDB();

// Static uploads folder


// Routes (unchanged)
app.use("/api/appointments", appointmentRouter);
app.use("/api/doctors", doctorRouter);
app.use("/api/services", serviceRouter);
app.use("/api/service-appointments", serviceAppointmentRouter);
app.use("/api/patient-profile", patientProfileRouter);
app.use("/api/nurses", nurseRouter);
app.use("/api/staff", staffRouter);
app.use("/api/performance", performanceRouter);
app.use("/api/staff-performance", performanceRouter);
app.use("/api/audit-logs", auditLogRouter);
// Test route
app.get('/', (req, res) => {
    res.send('API Working ');
});

app.listen(port, () => {
    console.log(`Server Started on http://localhost:${port}`);
});
