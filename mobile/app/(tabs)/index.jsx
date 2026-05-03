import React, { useCallback, useMemo, useState } from "react";
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
import {
  getMyLabReports,
  getMyRadiologyReports,
} from "../../services/reports";
import { getMyBills } from "../../services/billing";
import { getMyNotifications } from "../../services/notifications";

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
    title: doctor?.name || item?.doctorName || "Doctor appointment",
    subtitle:
      doctor?.specialization ||
      item?.speciality ||
      item?.doctorSpecialty ||
      "Doctor appointment",
    location: doctor?.location || item?.doctorHospital || "",
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
    title: item?.serviceName || "Service appointment",
    subtitle: item?.serviceCategory || item?.category || "Service appointment",
    location: item?.location || item?.serviceLocation || "",
    date: item?.date || "",
    time: formattedTime || "",
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

function getSettledValue(result, fallback) {
  return result?.status === "fulfilled" ? result.value : fallback;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortDate(value) {
  const date = normalizeDate(value);
  if (!date) return "Date not available";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(value) {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function isActiveAppointment(item) {
  const status = String(item?.status || "").toLowerCase();
  return (
    status !== "canceled" &&
    status !== "cancelled" &&
    status !== "completed"
  );
}

function normalizeReport(item, reportType) {
  const source = item || {};
  const doctor = source.doctorId || source.doctor || {};
  const date =
    source.reportDate ||
    source.resultDate ||
    source.requestedDate ||
    source.createdAt ||
    source.updatedAt ||
    "";

  return {
    id: source._id || source.id || `${reportType}-${date}-${source.reportCode || ""}`,
    type: reportType,
    code: source.reportCode || source.code || "",
    title:
      source.title ||
      source.reportTitle ||
      source.testName ||
      source.testType ||
      source.scanType ||
      source.examName ||
      `${reportType} report`,
    status: source.status || "",
    doctorName: doctor?.name || source.doctorName || "",
    date,
    sortDate: normalizeDate(date)?.getTime() || 0,
  };
}

function normalizeBill(item) {
  const source = item || {};
  const service =
    source.serviceAppointmentId?.serviceName ||
    source.appointmentId?.serviceName ||
    source.serviceName ||
    "";
  const date = source.billDate || source.invoiceDate || source.createdAt || "";
  const totalAmount = Number(
    source.totalAmount ?? source.amount ?? source.total ?? 0,
  );
  const paidAmount = Number(source.paidAmount ?? source.amountPaid ?? 0);
  const remainingAmount = Number(
    source.remainingAmount ??
      source.dueAmount ??
      source.balance ??
      totalAmount - paidAmount,
  );

  return {
    id: source._id || source.id || `bill-${date}-${source.billCode || ""}`,
    code: source.billCode || source.invoiceNo || source.code || "",
    type: source.billType || source.category || service || "Bill",
    status: source.paymentStatus || source.status || "Pending",
    totalAmount,
    remainingAmount: Math.max(remainingAmount, 0),
    date,
    sortDate: normalizeDate(date)?.getTime() || 0,
  };
}

function isUnpaidBill(item) {
  const status = String(item?.status || "").toLowerCase();
  return (
    status !== "paid" &&
    status !== "settled" &&
    (item?.remainingAmount > 0 || status === "pending" || status === "unpaid")
  );
}

function normalizeNotification(item) {
  const source = item || {};
  const date = source.createdAt || source.date || source.updatedAt || "";

  return {
    id: source._id || source.id || `notification-${date}-${source.title || ""}`,
    title: source.title || source.type || "Notification",
    message: source.message || source.body || source.description || "",
    type: source.type || source.category || "",
    read: Boolean(source.readAt || source.isRead || source.read),
    date,
    sortDate: normalizeDate(date)?.getTime() || 0,
  };
}

export default function HomeScreen() {
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState([]);
  const [patientProfile, setPatientProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [bills, setBills] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [dashboardError, setDashboardError] = useState("");

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
  const profileName =
    patientProfile?.name ||
    `${patientProfile?.firstName || ""} ${patientProfile?.lastName || ""}`.trim();
  const displayName = profileName || fullName;

  const profileImageSource = useMemo(() => {
    if (profileImageUrl) return { uri: profileImageUrl };
    if (clerkImage) return { uri: clerkImage };
    return null;
  }, [profileImageUrl, clerkImage]);

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoadingUpcoming(true);
      setDashboardError("");

      const token = await getToken({ template: "default", skipCache: true });

      if (!token) {
        setPatientProfile(null);
        setProfileImageUrl("");
        setAppointments([]);
        setReports([]);
        setBills([]);
        setNotifications([]);
        setDashboardError("Please sign in again to refresh your dashboard.");
        return;
      }

      const results = await Promise.allSettled([
        getMyPatientProfile(token),
        getMyAppointments(token),
        getMyServiceAppointments(token),
        getMyLabReports(token),
        getMyRadiologyReports(token),
        getMyBills(token),
        getMyNotifications(token),
      ]);

      const [
        profileResult,
        doctorResult,
        serviceResult,
        labResult,
        radiologyResult,
        billsResult,
        notificationsResult,
      ] = results;

      const profile = getSettledValue(profileResult, null);
      const doctorData = getSettledValue(doctorResult, {});
      const serviceData = getSettledValue(serviceResult, {});
      const labReports = getSettledValue(labResult, []);
      const radiologyReports = getSettledValue(radiologyResult, []);
      const billData = getSettledValue(billsResult, []);
      const notificationData = getSettledValue(notificationsResult, {
        notifications: [],
      });

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

      const mergedReports = [
        ...(Array.isArray(labReports) ? labReports : []).map((item) =>
          normalizeReport(item, "Lab"),
        ),
        ...(Array.isArray(radiologyReports) ? radiologyReports : []).map((item) =>
          normalizeReport(item, "Radiology"),
        ),
      ];

      const safeBills = (Array.isArray(billData) ? billData : []).map(
        normalizeBill,
      );
      const safeNotifications = (
        Array.isArray(notificationData?.notifications)
          ? notificationData.notifications
          : []
      ).map(normalizeNotification);

      setPatientProfile(profile);
      setProfileImageUrl(profile?.imageUrl || "");
      setAppointments(mergedAppointments);
      setReports(mergedReports);
      setBills(safeBills);
      setNotifications(safeNotifications);

      const failedSections = results.filter(
        (result) => result.status === "rejected",
      );
      if (failedSections.length === results.length) {
        setDashboardError("Could not refresh your dashboard right now.");
      } else if (failedSections.length > 0) {
        setDashboardError("Some dashboard sections could not be refreshed.");
      }
    } catch (error) {
      console.log("HOME DASHBOARD ERROR:", error);
      setPatientProfile(null);
      setProfileImageUrl("");
      setAppointments([]);
      setReports([]);
      setBills([]);
      setNotifications([]);
      setDashboardError("Could not refresh your dashboard right now.");
    } finally {
      setLoadingUpcoming(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, []),
  );

  const upcomingAppointments = useMemo(() => {
    const now = new Date();

    return appointments
      .filter((item) => {
        return (
          item.appointmentDate &&
          item.appointmentDate >= now &&
          isActiveAppointment(item)
        );
      })
      .sort((a, b) => a.appointmentDate - b.appointmentDate);
  }, [appointments]);

  const upcomingAppointment = upcomingAppointments[0];
  const recentReportsCount = reports.length;
  const unpaidBills = bills.filter(isUnpaidBill);
  const unreadNotifications = notifications.filter((item) => !item.read);
  const latestReport = [...reports].sort((a, b) => b.sortDate - a.sortDate)[0];
  const latestBill = [...bills].sort((a, b) => b.sortDate - a.sortDate)[0];
  const latestUnreadNotification = [...unreadNotifications].sort(
    (a, b) => b.sortDate - a.sortDate,
  )[0];

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
    await loadDashboard(true);
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
              <Text style={styles.logoText}>REVIVE</Text>
              <Text style={styles.logoSubText}>Patient Portal</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push("/(tabs)/notifications")}
            >
              <Ionicons name="notifications-outline" size={22} color="#1C4DFF" />
              {unreadNotifications.length > 0 && (
                <View style={styles.bellBadge} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerIconButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#1C4DFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greetingCard}>
          <View style={styles.greetingTopRow}>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={14} color="#1C4DFF" />
              <Text style={styles.dateBadgeText}>{formattedDate}</Text>
            </View>
          </View>

          <Text style={styles.greetingText}>Hello, {displayName}</Text>
          <Text style={styles.greetingSubtext}>
            Here is your health overview.
          </Text>
        </View>

        {dashboardError ? (
          <View style={styles.noticeCard}>
            <View style={styles.noticeIcon}>
              <Ionicons name="information-circle-outline" size={20} color="#1C4DFF" />
            </View>
            <View style={styles.noticeTextWrap}>
              <Text style={styles.noticeTitle}>Dashboard update</Text>
              <Text style={styles.noticeText}>{dashboardError}</Text>
            </View>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadDashboard()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
                    {upcomingAppointment.location ||
                      (upcomingAppointment.type === "service"
                        ? "Service appointment"
                        : "Doctor appointment")}
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

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: "#E8F0FF" }]}>
              <Ionicons name="calendar-outline" size={18} color="#1C4DFF" />
            </View>
            <Text style={styles.summaryValue}>
              {loadingUpcoming ? "..." : upcomingAppointments.length}
            </Text>
            <Text style={styles.summaryLabel}>Upcoming</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: "#E7F8F3" }]}>
              <Ionicons name="document-text-outline" size={18} color="#0B8F83" />
            </View>
            <Text style={styles.summaryValue}>
              {loadingUpcoming ? "..." : recentReportsCount}
            </Text>
            <Text style={styles.summaryLabel}>Reports</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: "#FFF5E8" }]}>
              <Ionicons name="receipt-outline" size={18} color="#D9822B" />
            </View>
            <Text style={styles.summaryValue}>
              {loadingUpcoming ? "..." : unpaidBills.length}
            </Text>
            <Text style={styles.summaryLabel}>Bills due</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: "#F0ECFF" }]}>
              <Ionicons name="notifications-outline" size={18} color="#5B5BD6" />
            </View>
            <Text style={styles.summaryValue}>
              {loadingUpcoming ? "..." : unreadNotifications.length}
            </Text>
            <Text style={styles.summaryLabel}>Unread</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/(tabs)/doctors")}
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#E4ECF8" }]}>
              <Ionicons name="medical-outline" size={24} color="#1664D9" />
            </View>
            <Text style={styles.quickCardTitle}>Book Doctor</Text>
            <Text style={styles.quickCardSubtitle}>Browse specialists</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/(tabs)/services")}
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#DDF3EF" }]}>
              <Ionicons name="layers-outline" size={24} color="#0B8F83" />
            </View>
            <Text style={styles.quickCardTitle}>Book Service</Text>
            <Text style={styles.quickCardSubtitle}>Choose hospital care</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/(tabs)/appointments")}
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#EEF4FF" }]}>
              <Ionicons name="calendar-outline" size={24} color="#1C4DFF" />
            </View>
            <Text style={styles.quickCardTitle}>My Appointments</Text>
            <Text style={styles.quickCardSubtitle}>View your bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/(tabs)/reports")}
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#E8F0FF" }]}>
              <Ionicons name="document-text-outline" size={24} color="#1C4DFF" />
            </View>
            <Text style={styles.quickCardTitle}>Reports</Text>
            <Text style={styles.quickCardSubtitle}>View medical files</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/(tabs)/billing")}
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#E7F8F3" }]}>
              <Ionicons name="receipt-outline" size={24} color="#0B8F83" />
            </View>
            <Text style={styles.quickCardTitle}>Billing</Text>
            <Text style={styles.quickCardSubtitle}>View bills and dues</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push("/(tabs)/prescriptions")}
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#EEF4FF" }]}>
              <Ionicons name="clipboard-outline" size={24} color="#1C4DFF" />
            </View>
            <Text style={styles.quickCardTitle}>Prescriptions</Text>
            <Text style={styles.quickCardSubtitle}>View medications</Text>
          </TouchableOpacity>

        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>

        <View style={styles.activityList}>
          {latestReport ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.activityCard}
              onPress={() => router.push("/(tabs)/reports")}
            >
              <View style={[styles.activityIcon, { backgroundColor: "#E8F0FF" }]}>
                <Ionicons name="document-text-outline" size={20} color="#1C4DFF" />
              </View>
              <View style={styles.activityBody}>
                <Text style={styles.activityTitle}>{latestReport.title}</Text>
                <Text style={styles.activityMeta}>
                  {latestReport.type} report
                  {latestReport.code ? ` - ${latestReport.code}` : ""}
                </Text>
              </View>
              <Text style={styles.activityDate}>
                {formatShortDate(latestReport.date)}
              </Text>
            </TouchableOpacity>
          ) : null}

          {latestBill ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.activityCard}
              onPress={() => router.push("/(tabs)/billing")}
            >
              <View style={[styles.activityIcon, { backgroundColor: "#FFF5E8" }]}>
                <Ionicons name="receipt-outline" size={20} color="#D9822B" />
              </View>
              <View style={styles.activityBody}>
                <Text style={styles.activityTitle}>{latestBill.type}</Text>
                <Text style={styles.activityMeta}>
                  {latestBill.status} - Due{" "}
                  {formatMoney(latestBill.remainingAmount)}
                </Text>
              </View>
              <Text style={styles.activityDate}>
                {formatShortDate(latestBill.date)}
              </Text>
            </TouchableOpacity>
          ) : null}

          {latestUnreadNotification ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.activityCard}
              onPress={() => router.push("/(tabs)/notifications")}
            >
              <View style={[styles.activityIcon, { backgroundColor: "#F0ECFF" }]}>
                <Ionicons name="notifications-outline" size={20} color="#5B5BD6" />
              </View>
              <View style={styles.activityBody}>
                <Text style={styles.activityTitle}>
                  {latestUnreadNotification.title}
                </Text>
                <Text style={styles.activityMeta} numberOfLines={1}>
                  {latestUnreadNotification.message || "Unread notification"}
                </Text>
              </View>
              <Text style={styles.activityDate}>
                {formatShortDate(latestUnreadNotification.date)}
              </Text>
            </TouchableOpacity>
          ) : null}

          {!latestReport && !latestBill && !latestUnreadNotification ? (
            <View style={styles.emptyActivityCard}>
              <Ionicons name="pulse-outline" size={22} color="#1C4DFF" />
              <Text style={styles.emptyActivityText}>
                Your latest reports, bills, and notifications will appear here.
              </Text>
            </View>
          ) : null}
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

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  bellBadge: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D64545",
    borderWidth: 1.5,
    borderColor: "#F5F7FB",
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
  noticeCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCE7FF",
  },
  noticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#07142B",
  },
  noticeText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: "#5E6878",
  },
  retryButton: {
    marginLeft: 10,
    borderRadius: 999,
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: "#1C4DFF",
    fontSize: 12,
    fontWeight: "800",
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
  summaryGrid: {
    paddingHorizontal: 20,
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E7ECF3",
    shadowColor: "#0D63D8",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#07142B",
  },
  summaryLabel: {
    marginTop: 3,
    fontSize: 12,
    color: "#6A7485",
    fontWeight: "700",
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
  activityList: {
    paddingHorizontal: 20,
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7ECF3",
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityBody: {
    flex: 1,
    paddingRight: 10,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#07142B",
  },
  activityMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: "#6A7485",
  },
  activityDate: {
    maxWidth: 78,
    textAlign: "right",
    fontSize: 11,
    lineHeight: 15,
    color: "#7B8494",
    fontWeight: "700",
  },
  emptyActivityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E7ECF3",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emptyActivityText: {
    flex: 1,
    color: "#5E6878",
    fontSize: 13,
    lineHeight: 19,
  },
  bottomSpace: {
    height: 8,
  },
});
