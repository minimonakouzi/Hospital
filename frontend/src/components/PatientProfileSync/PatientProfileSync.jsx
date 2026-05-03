import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import toast, { Toaster } from "react-hot-toast";

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000";
const API_BASE = `${API_ROOT.replace(/\/$/, "")}/api/patient-profile/me`;

const SETUP_ERROR =
  "Your account was created, but we could not finish setting up your patient profile. Please try again.";

function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeAge(value, fallback) {
  if (fallback !== null && fallback !== undefined && fallback !== "") {
    const fallbackNumber = Number(fallback);
    return Number.isFinite(fallbackNumber) ? fallbackNumber : null;
  }

  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeGender(value, fallback) {
  const gender = firstText(fallback, value);
  return ["Male", "Female"].includes(gender) ? gender : "";
}

async function parseJson(res) {
  return res.json().catch(() => null);
}

function buildProfilePayload(profile, user) {
  const metadata = {
    ...(user?.publicMetadata || {}),
    ...(user?.unsafeMetadata || {}),
  };
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  const phone =
    user?.primaryPhoneNumber?.phoneNumber ||
    user?.phoneNumbers?.[0]?.phoneNumber ||
    "";

  return {
    name: firstText(
      user?.fullName,
      `${user?.firstName || ""} ${user?.lastName || ""}`,
      profile?.name,
    ),
    email: firstText(email, profile?.email).toLowerCase(),
    phone: firstText(profile?.phone, metadata.phone, phone),
    age: normalizeAge(metadata.age, profile?.age),
    gender: normalizeGender(metadata.gender, profile?.gender),
    address: firstText(profile?.address, metadata.address),
    emergencyContact: firstText(
      profile?.emergencyContact,
      metadata.emergencyContact,
    ),
    allergies: profile?.allergies || "",
    medicalHistory: profile?.medicalHistory || "",
    notificationsEnabled:
      typeof profile?.notificationsEnabled === "boolean"
        ? profile.notificationsEnabled
        : true,
    imageUrl: firstText(profile?.imageUrl, user?.imageUrl),
  };
}

export default function PatientProfileSync() {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const syncedUserId = useRef("");

  useEffect(() => {
    if (!authLoaded || !userLoaded) return;

    if (!isSignedIn || !user?.id) {
      syncedUserId.current = "";
      return;
    }

    if (syncedUserId.current === user.id) return;

    let cancelled = false;

    async function syncPatientProfile() {
      try {
        const token = await getToken();
        if (!token) throw new Error("Missing Clerk token.");

        const headers = { Authorization: `Bearer ${token}` };
        const getRes = await fetch(API_BASE, { headers });
        const getBody = await parseJson(getRes);

        if (!getRes.ok) {
          throw new Error(getBody?.message || "Patient profile sync failed.");
        }

        const payload = buildProfilePayload(getBody?.profile || {}, user);

        const putRes = await fetch(API_BASE, {
          method: "PUT",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const putBody = await parseJson(putRes);

        if (!putRes.ok) {
          throw new Error(putBody?.message || "Patient profile sync failed.");
        }

        if (!cancelled) syncedUserId.current = user.id;
      } catch (err) {
        console.error("Patient profile sync error:", err);
        if (!cancelled) toast.error(SETUP_ERROR);
      }
    }

    syncPatientProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, getToken, isSignedIn, user, userLoaded]);

  return <Toaster position="top-center" />;
}
