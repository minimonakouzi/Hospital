import { BASE_URL } from "../constants/config";

export const createServiceAppointment = async (token, appointmentData) => {
  const response = await fetch(`${BASE_URL}/api/service-appointments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(appointmentData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create service appointment");
  }

  return data;
};

export const getMyServiceAppointments = async (token) => {
  const response = await fetch(`${BASE_URL}/api/service-appointments/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch service appointments");
  }

  return {
    ...data,
    appointments: data?.appointments || data?.data || [],
  };
};