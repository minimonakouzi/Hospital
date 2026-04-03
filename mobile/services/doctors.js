import { BASE_URL } from "../constants/config";

export const getDoctors = async () => {
  const response = await fetch(`${BASE_URL}/api/doctors`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  console.log("DOCTORS RESPONSE:", data);

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch doctors");
  }

  return Array.isArray(data) ? data : data.doctors || [];
};