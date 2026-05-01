import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getMyAppointments } from "../../services/appointments";
import { getMyServiceAppointments } from "../../services/serviceAppointments";
import { getMyPatientProfile } from "../../services/patientProfile";

function buildDoctorAppointmentDate(dateString, timeString) {
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

function buildServiceAppointmentDate(item) {
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

function normalizeDoctorAppointment(item) {
  const doctor = item?.doctorId || {};
  const appointmentDate = buildDoctorAppointmentDate(item?.date, item?.time);

  return {
    id: item?._id || item?.id || Math.random().toString(),
    type: "doctor",
    title: doctor?.name || item?.doctorName || "Doctor",
    subtitle:
      doctor?.specialization ||
      item?.speciality ||
      item?.doctorSpecialty ||
      "General",
    location: doctor?.location || item?.doctorHospital || "Revive Center",
    date: item?.date || "",
    time: item?.time || "",
    status: item?.status || "Pending",
    appointmentDate,
  };
}

function normalizeServiceAppointment(item) {
  const appointmentDate = buildServiceAppointmentDate(item);

  const hour = Number(item?.hour);
  const minute = Number(item?.minute);
  const ampm = String(item?.ampm || "").toUpperCase();

  let formattedTime = item?.time || "";
  if (
    !formattedTime &&
    Number.isFinite(hour) &&
    Number.isFinite(minute) &&
    (ampm === "AM" || ampm === "PM")
  ) {
    formattedTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0",
    )} ${ampm}`;
  }

  return {
    id: item?._id || item?.id || Math.random().toString(),
    type: "service",
    title: item?.serviceName || "Service",
    subtitle: "Hospital Service",
    location: "Revive Center",
    date: item?.date || "",
    time: formattedTime || "Time not available",
    status: item?.status || "Pending",
    appointmentDate,
  };
}

function getStatusMeta(status) {
  const normalized = String(status || "Pending").toLowerCase();

  if (normalized === "confirmed") {
    return { label: "Confirmed", color: "#0B8F83", icon: "checkmark-circle" };
  }

  if (normalized === "completed") {
    return { label: "Completed", color: "#1C4DFF", icon: "medical" };
  }

  if (normalized === "canceled" || normalized === "cancelled") {
    return { label: "Canceled", color: "#D64545", icon: "close-circle" };
  }

  if (normalized === "rescheduled") {
    return { label: "Rescheduled", color: "#5B5BD6", icon: "refresh-circle" };
  }

  return { label: "Pending", color: "#D9822B", icon: "time" };
}

function formatCardDate(dateString, timeString) {
  if (!dateString) return "Date not available";

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return `${dateString}${timeString ? ` ${timeString}` : ""}`;
  }

  const readable = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${readable}${timeString ? ` ${timeString}` : ""}`;
}

export default function HomeScreen() {
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");

  const firstName = user?.firstName?.trim() || "";
  const lastName = user?.lastName?.trim() || "";
  const emailName =
    user?.primaryEmailAddress?.emailAddress?.split("@")[0]?.trim() || "";

  const fullName =
    (user?.fullName && user.fullName.trim()) ||
    `${firstName} ${lastName}`.trim() ||
    firstName ||
    emailName ||
    "Patient";

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const clerkImage = user?.imageUrl || user?.profileImageUrl || "";

  const profileImageSource = useMemo(() => {
    if (profileImageUrl) return { uri: profileImageUrl };
    if (clerkImage) return { uri: clerkImage };
    return null;
  }, [profileImageUrl, clerkImage]);

  const loadPatientProfile = async () => {
    try {
      const token = await getToken({ template: "default", skipCache: true });

      if (!token) {
        setProfileImageUrl("");
        return;
      }

      const profile = await getMyPatientProfile(token);
      setProfileImageUrl(profile?.imageUrl || "");
    } catch (error) {
      console.log("HOME PROFILE LOAD ERROR:", error);
      setProfileImageUrl("");
    }
  };

  const loadAppointments = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoadingUpcoming(true);

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

      const mergedAppointments = [
        ...doctorAppointments,
        ...serviceAppointments,
      ];

      setAppointments(mergedAppointments);
    } catch (error) {
      console.log("HOME APPOINTMENTS ERROR:", error);
      setAppointments([]);
    } finally {
      setLoadingUpcoming(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPatientProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
      loadPatientProfile();
    }, []),
  );

  const upcomingAppointment = useMemo(() => {
    const now = new Date();

    return appointments
      .filter((item) => {
        const status = String(item.status || "").toLowerCase();
        return (
          item.appointmentDate &&
          item.appointmentDate >= now &&
          status !== "canceled" &&
          status !== "cancelled" &&
          status !== "completed"
        );
      })
      .sort((a, b) => a.appointmentDate - b.appointmentDate)[0];
  }, [appointments]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/(auth)/login");
    } catch (error) {
      console.log("LOGOUT ERROR:", error);
      Alert.alert("Error", "Could not sign out right now.");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAppointments(true), loadPatientProfile()]);
    setRefreshing(false);
  };

  const statusMeta = getStatusMeta(upcomingAppointment?.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FB" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              {profileImageSource ? (
                <Image
                  source={profileImageSource}
                  style={styles.logoProfileImage}
                />
              ) : (
                <Ionicons name="person" size={20} color="#FFFFFF" />
              )}
            </View>

            <View>
              <Text style={styles.logoText}>Medical Portal</Text>
              <Text style={styles.logoSubText}>Patient Dashboard</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#1C4DFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.greetingCard}>
          <View style={styles.greetingTopRow}>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={14} color="#1C4DFF" />
              <Text style={styles.dateBadgeText}>{formattedDate}</Text>
            </View>
          </View>

          <Text style={styles.greetingText}>Hello, {fullName}</Text>
          <Text style={styles.greetingSubtext}>
            Stay on top of your care with easy access to your appointments and
            services.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.appointmentCard}
          onPress={() => router.push("/(tabs)/appointments")}
        >
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>UPCOMING APPOINTMENT</Text>
            </View>

            <View style={styles.doctorImagePlaceholder}>
              <Ionicons name="person-outline" size={22} color="#FFFFFF" />
            </View>
          </View>

          {loadingUpcoming ? (
            <View style={styles.loadingCardWrap}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.loadingCardText}>Loading appointment...</Text>
            </View>
          ) : upcomingAppointment ? (
            <>
              <Text style={styles.doctorName}>{upcomingAppointment.title}</Text>

              <Text style={styles.doctorSpecialty}>
                {upcomingAppointment.subtitle}
              </Text>

              <View style={styles.statusRow}>
                <Ionicons
                  name={statusMeta.icon}
                  size={14}
                  color={statusMeta.color}
                />
                <Text style={[styles.statusText, { color: statusMeta.color }]}>
                  {statusMeta.label}
                </Text>
              </View>

              <View style={styles.appointmentInfoBox}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.infoText}>
                    {formatCardDate(
                      upcomingAppointment.date,
                      upcomingAppointment.time,
                    )}
                  </Text>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoItem}>
                  <Ionicons name="location-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.infoText}>
                    {upcomingAppointment.location}
                  </Text>
                </View>
              </View>

              <View style={styles.bottomHintRow}>
                <Text style={styles.bottomHintText}>
                  Tap to view all appointment details
                </Text>
                <Ionicons name="arrow-forward" size={15} color="#DDEBFF" />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.doctorName}>No upcoming appointments</Text>

              <Text style={styles.doctorSpecialty}>
                You do not have any scheduled doctor or service bookings right
                now.
              </Text>

              <View style={styles.appointmentInfoBox}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.infoText}>
                    Choose your preferred date
                  </Text>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoItem}>
                  <Ionicons name="layers-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.infoText}>Browse available services</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.bookNowButton}
                onPress={() => router.push("/(tabs)/services")}
              >
                <Text style={styles.bookNowButtonText}>Book Now</Text>
                <Ionicons name="arrow-forward" size={16} color="#1C4DFF" />
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/(tabs)/doctors")}
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#E4ECF8" }]}>
              <Ionicons name="medical-outline" size={24} color="#1664D9" />
            </View>
            <Text style={styles.quickCardTitle}>Doctors</Text>
            <Text style={styles.quickCardSubtitle}>Browse specialists</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/(tabs)/appointments")}
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#DDF3EF" }]}>
              <Ionicons name="calendar-outline" size={24} color="#0B8F83" />
            </View>
            <Text style={styles.quickCardTitle}>Appointments</Text>
            <Text style={styles.quickCardSubtitle}>View your bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/(tabs)/services")}
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#FFF1E4" }]}>
              <Ionicons name="layers-outline" size={24} color="#D9822B" />
            </View>
            <Text style={styles.quickCardTitle}>Book Visit</Text>
            <Text style={styles.quickCardSubtitle}>Book a service</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickCard} onPress={handleLogout}>
            <View style={[styles.quickIconBox, { backgroundColor: "#FDECEC" }]}>
              <Ionicons name="log-out-outline" size={24} color="#D64545" />
            </View>
            <Text style={styles.quickCardTitle}>Logout</Text>
            <Text style={styles.quickCardSubtitle}>Sign out safely</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
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
  },
  contentContainer: {
    paddingBottom: 24,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E7ECF3",
    backgroundColor: "#F5F7FB",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0D63D8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  logoProfileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1541B7",
  },
  logoSubText: {
    marginTop: 2,
    fontSize: 12,
    color: "#6A7485",
    fontWeight: "600",
  },

  logoutButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  greetingCard: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: "#0D63D8",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  greetingTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  dateBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#1C4DFF",
    fontWeight: "700",
  },
  greetingText: {
    fontSize: 29,
    fontWeight: "800",
    color: "#07142B",
    lineHeight: 36,
  },
  greetingSubtext: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#5E6878",
  },

  appointmentCard: {
    marginTop: 18,
    marginHorizontal: 20,
    backgroundColor: "#0D63D8",
    borderRadius: 28,
    padding: 18,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  doctorImagePlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCardWrap: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  loadingCardText: {
    marginLeft: 10,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  doctorName: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  doctorSpecialty: {
    marginTop: 6,
    fontSize: 14,
    color: "#DCEBFF",
    lineHeight: 20,
  },
  statusRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  appointmentInfoBox: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoText: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  infoDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginHorizontal: 12,
  },
  bottomHintRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomHintText: {
    color: "#DDEBFF",
    fontSize: 11,
    fontWeight: "600",
  },
  bookNowButton: {
    marginTop: 18,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bookNowButtonText: {
    color: "#1C4DFF",
    fontWeight: "800",
    fontSize: 14,
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 14,
    marginHorizontal: 20,
    fontSize: 19,
    fontWeight: "800",
    color: "#07142B",
  },
  quickActionsGrid: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  quickIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#07142B",
  },
  quickCardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6A7485",
    lineHeight: 17,
  },
  bottomSpace: {
    height: 8,
  },
});
