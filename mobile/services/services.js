import { BASE_URL } from "../constants/config";

export const getServices = async () => {
  const response = await fetch(`${BASE_URL}/api/services`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch services");
  }

  return Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.services)
        ? data.services
        : [];
};

export const getServiceById = async (serviceId) => {
  const response = await fetch(`${BASE_URL}/api/services/${serviceId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch service details");
  }

  return data?.data || data?.service || data;
};