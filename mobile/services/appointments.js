import { BASE_URL } from "../constants/config";

export const createAppointment = async (token, appointmentData) => {
  const response = await fetch(`${BASE_URL}/api/appointments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(appointmentData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create appointment");
  }

  return data;
};

export const getMyAppointments = async (token) => {
  const response = await fetch(`${BASE_URL}/api/appointments/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch appointments");
  }

  return data;
};