import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@clerk/clerk-expo";
import { getMyAppointments } from "../../services/appointments";
import { getMyServiceAppointments } from "../../services/serviceAppointments";

function parseDoctorAppointmentDate(dateString, timeString) {
  if (!dateString) return null;

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  if (timeString) {
    const match = String(timeString).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      let hour = Number(match[1]);
      const minute = Number(match[2]);
      const ampm = match[3].toUpperCase();

      if (ampm === "PM" && hour !== 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;

      date.setHours(hour, minute, 0, 0);
    }
  }

  return date;
}

function parseServiceAppointmentDate(item) {
  const dateString = item?.date;
  if (!dateString) return null;

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const hour = Number(item?.hour);
  const minute = Number(item?.minute);
  const ampm = String(item?.ampm || "").toUpperCase();

  if (
    Number.isFinite(hour) &&
    Number.isFinite(minute) &&
    (ampm === "AM" || ampm === "PM")
  ) {
    let finalHour = hour;
    if (ampm === "PM" && finalHour !== 12) finalHour += 12;
    if (ampm === "AM" && finalHour === 12) finalHour = 0;

    date.setHours(finalHour, minute, 0, 0);
  }

  return date;
}

function formatApiDate(dateString) {
  if (!dateString) return "Date not available";

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatServiceTime(item) {
  if (item?.time && String(item.time).trim()) {
    return String(item.time).trim();
  }

  const hour = Number(item?.hour);
  const minute = Number(item?.minute);
  const ampm = String(item?.ampm || "").toUpperCase();

  if (
    Number.isFinite(hour) &&
    Number.isFinite(minute) &&
    (ampm === "AM" || ampm === "PM")
  ) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0",
    )} ${ampm}`;
  }

  return "Time not available";
}

function getDoctorImageUri(item) {
  const doctor = item?.doctorId || {};
  const doctorImageValue = item?.doctorImage;

  if (typeof doctor?.imageUrl === "string" && doctor.imageUrl.trim()) {
    return doctor.imageUrl;
  }

  if (typeof item?.doctorImageUrl === "string" && item.doctorImageUrl.trim()) {
    return item.doctorImageUrl;
  }

  if (typeof doctorImageValue === "string" && doctorImageValue.trim()) {
    return doctorImageValue;
  }

  if (
    doctorImageValue &&
    typeof doctorImageValue === "object" &&
    typeof doctorImageValue.url === "string" &&
    doctorImageValue.url.trim()
  ) {
    return doctorImageValue.url;
  }

  if (
    doctorImageValue &&
    typeof doctorImageValue === "object" &&
    typeof doctorImageValue.imageUrl === "string" &&
    doctorImageValue.imageUrl.trim()
  ) {
    return doctorImageValue.imageUrl;
  }

  return "";
}

function getServiceImageUri(item) {
  const serviceImage = item?.serviceImage;

  if (
    typeof item?.serviceImageUrl === "string" &&
    item.serviceImageUrl.trim()
  ) {
    return item.serviceImageUrl;
  }

  if (typeof serviceImage === "string" && serviceImage.trim()) {
    return serviceImage;
  }

  if (
    serviceImage &&
    typeof serviceImage === "object" &&
    typeof serviceImage.url === "string" &&
    serviceImage.url.trim()
  ) {
    return serviceImage.url;
  }

  return "";
}

function getStatusMeta(status) {
  const normalized = String(status || "Pending").toLowerCase();

  if (normalized === "confirmed") {
    return {
      label: "Confirmed",
      bg: "#E7F8F3",
      text: "#0B8F83",
      icon: "checkmark-circle-outline",
    };
  }

  if (normalized === "completed") {
    return {
      label: "Completed",
      bg: "#E8F0FF",
      text: "#1C4DFF",
      icon: "medical-outline",
    };
  }

  if (normalized === "rescheduled") {
    return {
      label: "Rescheduled",
      bg: "#EEF2FF",
      text: "#5B5BD6",
      icon: "refresh-circle-outline",
    };
  }

  if (normalized === "canceled" || normalized === "cancelled") {
    return {
      label: "Canceled",
      bg: "#FDECEC",
      text: "#D64545",
      icon: "close-circle-outline",
    };
  }

  return {
    label: "Pending",
    bg: "#FFF5E8",
    text: "#D9822B",
    icon: "time-outline",
  };
}

function normalizeDoctorAppointment(item) {
  const doctor = item?.doctorId || {};
  const statusMeta = getStatusMeta(item?.status);

  return {
    id: item?._id || item?.id || Math.random().toString(),
    type: "doctor",
    name: doctor?.name || item?.doctorName || "Doctor appointment",
    specialty:
      doctor?.specialization ||
      item?.speciality ||
      item?.doctorSpecialty ||
      "Not specified",
    location: doctor?.location || item?.doctorHospital || "",
    image: getDoctorImageUri(item),
    dateText: formatApiDate(item?.date),
    time: item?.time || "Time not available",
    status: statusMeta.label,
    statusMeta,
    appointmentDate: parseDoctorAppointmentDate(item?.date, item?.time),
  };
}

function normalizeServiceAppointment(item) {
  const statusMeta = getStatusMeta(item?.status);

  return {
    id: item?._id || item?.id || Math.random().toString(),
    type: "service",
    name: item?.serviceName || "Service appointment",
    specialty: item?.serviceCategory || item?.category || "Not specified",
    location: item?.location || item?.serviceLocation || "",
    image: getServiceImageUri(item),
    dateText: formatApiDate(item?.date),
    time: formatServiceTime(item),
    status: statusMeta.label,
    statusMeta,
    appointmentDate: parseServiceAppointmentDate(item),
  };
}

function isUpcoming(item) {
  if (!item.appointmentDate) return false;
  if (item.status === "Canceled" || item.status === "Completed") return false;
  return item.appointmentDate >= new Date();
}

function isPending(item) {
  return item.status === "Pending" || item.status === "Rescheduled";
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const loadAppointments = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      if (!isSignedIn) {
        setAppointments([]);
        return;
      }

      const token = await getToken({ template: "default", skipCache: true });

      if (!token) {
        setAppointments([]);
        return;
      }

      const [doctorData, serviceData] = await Promise.all([
        getMyAppointments(token),
        getMyServiceAppointments(token),
      ]);

      const doctorAppointments = (doctorData?.appointments || []).map(
        normalizeDoctorAppointment,
      );

      const serviceAppointments = (
        serviceData?.appointments ||
        serviceData?.data ||
        []
      ).map(normalizeServiceAppointment);

      const merged = [...doctorAppointments, ...serviceAppointments].sort(
        (a, b) =>
          (b.appointmentDate?.getTime() || 0) -
          (a.appointmentDate?.getTime() || 0),
      );

      setAppointments(merged);
    } catch (error) {
      console.log("LOAD APPOINTMENTS ERROR:", error);
      Alert.alert("Error", error.message || "Could not load appointments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [isSignedIn]),
  );

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter(isUpcoming)
        .sort((a, b) => a.appointmentDate - b.appointmentDate),
    [appointments],
  );

  const completedAppointments = useMemo(
    () => appointments.filter((item) => item.status === "Completed"),
    [appointments],
  );

  const canceledAppointments = useMemo(
    () => appointments.filter((item) => item.status === "Canceled"),
    [appointments],
  );

  const pendingAppointments = useMemo(
    () => appointments.filter(isPending),
    [appointments],
  );

  const canceledPendingAppointments = useMemo(
    () => [...canceledAppointments, ...pendingAppointments],
    [canceledAppointments, pendingAppointments],
  );

  const stats = useMemo(
    () => ({
      all: appointments.length,
      upcoming: upcomingAppointments.length,
      completed: completedAppointments.length,
      pending: pendingAppointments.length,
      canceledPending: canceledPendingAppointments.length,
    }),
    [
      appointments,
      upcomingAppointments,
      completedAppointments,
      canceledAppointments,
      pendingAppointments,
      canceledPendingAppointments,
    ],
  );

  const filterOptions = useMemo(() => {
    const options = [
      { label: "All", count: stats.all },
      { label: "Upcoming", count: stats.upcoming },
      { label: "Completed", count: stats.completed },
    ];

    if (stats.canceledPending > 0) {
      options.push({
        label: "Cancelled/Pending",
        count: stats.canceledPending,
      });
    }

    return options;
  }, [stats]);

  const filteredAppointments = useMemo(() => {
    if (activeFilter === "Upcoming") return upcomingAppointments;
    if (activeFilter === "Completed") return completedAppointments;
    if (activeFilter === "Cancelled/Pending") return canceledPendingAppointments;
    return appointments;
  }, [
    activeFilter,
    appointments,
    upcomingAppointments,
    completedAppointments,
    canceledPendingAppointments,
  ]);

  const nextAppointment = upcomingAppointments[0] || null;

  const renderFilterChip = (label, count) => {
    const active = activeFilter === label;

    return (
      <TouchableOpacity
        key={label}
        style={[styles.filterChip, active && styles.filterChipActive]}
        onPress={() => setActiveFilter(label)}
      >
        <Text
          style={[styles.filterChipText, active && styles.filterChipTextActive]}
        >
          {label}
        </Text>
        <View style={[styles.filterCount, active && styles.filterCountActive]}>
          <Text
            style={[
              styles.filterCountText,
              active && styles.filterCountTextActive,
            ]}
          >
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAppointmentCard = (appointment) => {
    const meta = appointment.statusMeta;

    return (
      <View key={`${appointment.type}-${appointment.id}`} style={styles.card}>
        {appointment.image ? (
          <Image source={{ uri: appointment.image }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons
              name={
                appointment.type === "service"
                  ? "layers-outline"
                  : "person-outline"
              }
              size={30}
              color="#7D8CA3"
            />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.typeBadge,
                appointment.type === "service"
                  ? styles.serviceTypeBadge
                  : styles.doctorTypeBadge,
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  appointment.type === "service"
                    ? styles.serviceTypeBadgeText
                    : styles.doctorTypeBadgeText,
                ]}
              >
                {appointment.type === "service" ? "Service" : "Doctor"}
              </Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={11} color={meta.text} />
              <Text style={[styles.statusText, { color: meta.text }]}>
                {appointment.status}
              </Text>
            </View>
          </View>

          <Text style={styles.doctorName}>{appointment.name}</Text>
          <Text style={styles.doctorSpecialty}>{appointment.specialty}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={13} color="#6C7685" />
            <Text style={styles.infoText}>{appointment.dateText}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={13} color="#6C7685" />
            <Text style={styles.infoText}>{appointment.time}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name={
                appointment.type === "service"
                  ? "layers-outline"
                  : "location-outline"
              }
              size={13}
              color="#6C7685"
            />
            <Text style={styles.infoText}>
              {appointment.location || "Not specified"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAppointments(true)}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(tabs)")}
          >
            <Ionicons name="arrow-back" size={24} color="#1C4DFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>My Appointments</Text>
        </View>

        <View style={styles.topActions}>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/doctors")}
            >
              <Ionicons name="add" size={18} color="#0D63D8" />
              <Text style={styles.actionButtonText}>Book Doctor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/(tabs)/services")}
            >
              <Ionicons name="layers-outline" size={18} color="#0D63D8" />
              <Text style={styles.actionButtonText}>Book Service</Text>
            </TouchableOpacity>
          </View>
        </View>

        {nextAppointment && (activeFilter === "Upcoming" || activeFilter === "All") && (
          <View style={styles.highlightCard}>
            <View style={styles.highlightHeader}>
              <Text style={styles.highlightBadge}>NEXT APPOINTMENT</Text>
              <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            </View>

            <Text style={styles.highlightDoctor}>{nextAppointment.name}</Text>
            <Text style={styles.highlightSpecialty}>
              {nextAppointment.specialty}
            </Text>

            <View style={styles.highlightInfoRow}>
              <View style={styles.highlightInfoItem}>
                <Ionicons name="time-outline" size={18} color="#FFFFFF" />
                <Text style={styles.highlightInfoText}>
                  {nextAppointment.time}
                </Text>
              </View>

              <View style={styles.highlightDivider} />

              <View style={styles.highlightInfoItem}>
                <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                <Text style={styles.highlightInfoText}>
                  {nextAppointment.dateText}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.filtersRow}>
          {filterOptions.map((filter) =>
            renderFilterChip(filter.label, filter.count),
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{activeFilter} Appointments</Text>

          <TouchableOpacity onPress={() => loadAppointments(true)}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="large" color="#0D63D8" />
            <Text style={styles.emptyTitle}>Loading appointments...</Text>
          </View>
        ) : filteredAppointments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={34} color="#9AA6B6" />
            <Text style={styles.emptyTitle}>
              No {activeFilter.toLowerCase()} appointments
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === "Upcoming" || activeFilter === "All"
                ? "Book a doctor or service appointment and it will appear here."
                : `You do not have any ${activeFilter.toLowerCase()} appointments yet.`}
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => router.push("/(tabs)/doctors")}
              >
                <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
                <Text style={styles.emptyActionText}>Book Doctor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyActionButton, styles.emptyActionButtonAlt]}
                onPress={() => router.push("/(tabs)/services")}
              >
                <Ionicons name="layers-outline" size={16} color="#0D63D8" />
                <Text style={styles.emptyActionTextAlt}>Book Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cardsWrap}>
            {filteredAppointments.map(renderAppointmentCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  contentContainer: {
    paddingBottom: 28,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 4,
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#07142B",
  },
  headerBrand: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1C4DFF",
  },
  topActions: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#E8F0FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: {
    color: "#0D63D8",
    fontSize: 14,
    fontWeight: "800",
  },
  highlightCard: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: "#1C4DFF",
    borderRadius: 24,
    padding: 18,
  },
  highlightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  highlightBadge: {
    color: "#DDE7FF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  highlightDoctor: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  highlightSpecialty: {
    marginTop: 4,
    fontSize: 14,
    color: "#EAF0FF",
  },
  highlightInfoRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  highlightInfoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  highlightInfoText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  highlightDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 12,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    marginTop: 18,
    gap: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#EDF2FB",
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: "#0D63D8",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#425066",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  filterCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#DCE6F7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  filterCountActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#425066",
  },
  filterCountTextActive: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#07142B",
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D63D8",
  },
  emptyCard: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "800",
    color: "#07142B",
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6C7685",
    textAlign: "center",
  },
  emptyActions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  emptyActionButton: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: "#0D63D8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
  },
  emptyActionButtonAlt: {
    backgroundColor: "#E8F0FF",
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  emptyActionTextAlt: {
    color: "#0D63D8",
    fontSize: 13,
    fontWeight: "900",
  },
  cardsWrap: {
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    flexDirection: "row",
  },
  cardImage: {
    width: 110,
    height: 150,
    backgroundColor: "#E9EDF5",
  },
  cardImagePlaceholder: {
    width: 110,
    height: 150,
    backgroundColor: "#E9EDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "flex-start",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  doctorTypeBadge: {
    backgroundColor: "#E8F0FF",
  },
  serviceTypeBadge: {
    backgroundColor: "#E7F8F3",
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  doctorTypeBadgeText: {
    color: "#1C4DFF",
  },
  serviceTypeBadgeText: {
    color: "#0B8F83",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  doctorName: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: "800",
    color: "#07142B",
  },
  doctorSpecialty: {
    marginTop: 4,
    fontSize: 13,
    color: "#5F6B7A",
    fontWeight: "600",
  },
  infoRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#6C7685",
    fontWeight: "600",
  },
});
