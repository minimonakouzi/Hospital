import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Platform, // Enhanced: Import Platform for platform-specific styles
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { getServiceById } from "../../services/services";
import { createServiceAppointment } from "../../services/serviceAppointments";

// --- Helper Functions (No changes needed here) ---
function parseSlots(slotsValue) {
  if (!slotsValue) return {};
  if (typeof slotsValue === "string") {
    try {
      const parsed = JSON.parse(slotsValue);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof slotsValue === "object") return slotsValue;
  return {};
}

function normalizeService(apiService = {}, fallback = {}) {
  return {
    id: apiService._id || apiService.id || fallback.id || "",
    name: apiService.name || fallback.name || "Service",
    shortDescription:
      apiService.shortDescription ||
      fallback.shortDescription ||
      "No short description available.",
    about:
      apiService.about || fallback.about || "No service description available.",
    price:
      apiService.price !== undefined && apiService.price !== null
        ? Number(apiService.price)
        : fallback.price || 0,
    image:
      apiService.imageUrl ||
      fallback.image ||
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    available:
      apiService.available !== undefined
        ? apiService.available
        : fallback.available !== false,
    slots: parseSlots(apiService.slots || fallback.slots),
    instructions: Array.isArray(apiService.instructions)
      ? apiService.instructions
      : Array.isArray(fallback.instructions)
        ? fallback.instructions
        : [],
  };
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}
function isValidEmail(email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalized) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}
function isValidName(name) {
  return String(name || "").trim().length >= 2;
}
function isValidAge(age) {
  const trimmed = String(age || "").trim();
  if (!trimmed) return false;
  const ageNumber = Number(trimmed);
  return Number.isInteger(ageNumber) && ageNumber >= 1 && ageNumber <= 120;
}
function isValidMobile(mobile) {
  const digits = onlyDigits(mobile);
  return digits.length >= 8 && digits.length <= 15;
}
function splitTimeString(timeStr) {
  const match = String(timeStr || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    ampm: match[3].toUpperCase(),
  };
}
// --- End Helper Functions ---

export default function BookServiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getToken } = useAuth();
  const { user } = useUser();

  const serviceId = String(params.serviceId || "");

  const fallbackService = useMemo(
    () => ({
      id: serviceId,
      name: String(params.serviceName || "Service"),
      shortDescription: String(
        params.serviceShortDescription || "No short description available.",
      ),
      about: String(params.serviceAbout || "No service description available."),
      price: Number(params.servicePrice || 0),
      image: String(
        params.serviceImage ||
          "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
      ),
      available: String(params.serviceAvailable || "true") !== "false",
      slots: parseSlots(params.slots),
      instructions: [],
    }),
    [
      serviceId,
      params.serviceName,
      params.serviceShortDescription,
      params.serviceAbout,
      params.servicePrice,
      params.serviceImage,
      params.serviceAvailable,
      params.slots,
    ],
  );

  const [service, setService] = useState(fallbackService);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  const [patientName, setPatientName] = useState(user?.fullName || "");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState(
    user?.primaryEmailAddress?.emailAddress || "",
  );
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Hooks (No major changes) ---
  useEffect(() => {
    setPatientName(user?.fullName || "");
    setEmail(user?.primaryEmailAddress?.emailAddress || "");
  }, [user?.fullName, user?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    const loadService = async () => {
      if (!serviceId) {
        setServiceLoading(false);
        return;
      }
      try {
        setServiceLoading(true);
        const data = await getServiceById(serviceId);
        setService(normalizeService(data, fallbackService));
      } catch (error) {
        console.log("LOAD SERVICE DETAILS ERROR:", error);
        setService(fallbackService);
      } finally {
        setServiceLoading(false);
      }
    };
    loadService();
  }, [serviceId, fallbackService]);

  const availableDates = useMemo(
    () =>
      Object.keys(service.slots || {}).filter((date) => {
        const slots = service.slots?.[date];
        return Array.isArray(slots) && slots.length > 0;
      }),
    [service.slots],
  );

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const slots = service.slots?.[selectedDate];
    return Array.isArray(slots) ? slots : [];
  }, [service.slots, selectedDate]);

  useEffect(() => {
    if (!availableDates.length) {
      if (selectedDate !== "") setSelectedDate("");
      if (selectedTime !== "") setSelectedTime("");
      return;
    }
    if (!selectedDate || !availableDates.includes(selectedDate)) {
      const firstDate = availableDates[0];
      setSelectedDate(firstDate);
      const firstSlots = Array.isArray(service.slots?.[firstDate])
        ? service.slots[firstDate]
        : [];
      setSelectedTime(firstSlots[0] || "");
      return;
    }
    const currentSlots = Array.isArray(service.slots?.[selectedDate])
      ? service.slots[selectedDate]
      : [];
    if (!selectedTime || !currentSlots.includes(selectedTime)) {
      setSelectedTime(currentSlots[0] || "");
    }
  }, [availableDates, service.slots, selectedDate, selectedTime]);

  const instructions = useMemo(
    () =>
      Array.isArray(service.instructions) && service.instructions.length > 0
        ? service.instructions
        : [
            "Please arrive 10 minutes before your appointment.",
            "Bring any previous medical reports if available.",
          ],
    [service.instructions],
  );
  // --- End Hooks ---

  // --- Main booking handler (No major changes) ---
  const handleConfirmBooking = async () => {
    try {
      if (!service.id) {
        Alert.alert("Error", "Service ID is missing.");
        return;
      }
      if (!service.available) {
        Alert.alert("Unavailable", "This service is not available right now.");
        return;
      }
      if (!availableDates.length) {
        Alert.alert(
          "Unavailable",
          "This service does not have any available dates right now.",
        );
        return;
      }
      if (!isValidName(patientName)) {
        Alert.alert("Invalid name", "Please enter a valid full name.");
        return;
      }
      if (!isValidMobile(mobile)) {
        Alert.alert("Invalid mobile", "Please enter a valid mobile number.");
        return;
      }
      if (!isValidAge(age)) {
        Alert.alert(
          "Invalid age",
          "Please enter a valid age between 1 and 120.",
        );
        return;
      }
      if (!gender) {
        Alert.alert("Missing gender", "Please select gender.");
        return;
      }
      if (!isValidEmail(email)) {
        Alert.alert(
          "Invalid email",
          "Please enter a valid email or leave it empty.",
        );
        return;
      }
      if (!selectedDate) {
        Alert.alert("Missing date", "Please select a date.");
        return;
      }
      if (!selectedTime) {
        Alert.alert("Missing time", "Please select a time slot.");
        return;
      }
      const timeParts = splitTimeString(selectedTime);
      if (!timeParts) {
        Alert.alert("Invalid time", "Selected time format is invalid.");
        return;
      }

      setLoading(true);
      const token = await getToken({ template: "default", skipCache: true });
      if (!token) {
        Alert.alert("Error", "Authentication token not found.");
        return;
      }

      const appointmentData = {
        serviceId: service.id,
        serviceName: service.name,
        patientName: patientName.trim(),
        mobile: onlyDigits(mobile),
        age: Number(age),
        gender,
        email: String(email || "").trim(),
        date: selectedDate,
        time: selectedTime,
        hour: timeParts.hour,
        minute: timeParts.minute,
        ampm: timeParts.ampm,
        paymentMethod,
        amount: service.price || 0,
        fees: service.price || 0,
        serviceImageUrl: service.image,
      };

      await createServiceAppointment(token, appointmentData);

      Alert.alert(
        "Booking Confirmed!",
        `Your appointment for ${service.name} is set for ${selectedDate} at ${selectedTime}.`,
        [
          {
            text: "View Appointments",
            onPress: () => router.push("/(tabs)/appointments"),
          },
          {
            text: "Done",
            onPress: () => router.push("/(tabs)/services"),
            style: "cancel",
          },
        ],
      );
    } catch (error) {
      console.log("SERVICE BOOKING ERROR:", error);
      Alert.alert(
        "Booking Failed",
        error.message || "Could not create service booking. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  // --- End handler ---

  if (serviceLoading && !service.id) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#245BDB" />
          <Text style={styles.loadingText}>Loading service details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal
        visible={aboutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>About This Service</Text>
              <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#5E6878" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalServiceName}>{service.name}</Text>
            <Text style={styles.modalDescription}>{service.about}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAboutModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Image source={{ uri: service.image }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#07142B" />
          </TouchableOpacity>
          <View style={styles.heroBottom}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {service.shortDescription}
            </Text>
          </View>
        </View>

        {/* Enhanced: Combined About and Price into a single, more elegant card */}
        <View style={styles.detailsCard}>
          <TouchableOpacity
            style={styles.detailsRow}
            onPress={() => setAboutModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.detailsIconContainer}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="#245BDB"
              />
            </View>
            <Text style={styles.detailsLabel}>About this Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#8A92A3" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.detailsRow}>
            <View style={styles.detailsIconContainer}>
              <Ionicons name="cash-outline" size={22} color="#245BDB" />
            </View>
            <Text style={styles.detailsLabel}>Price</Text>
            <Text style={styles.priceValue}>${service.price || 0}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pre-Test Instructions</Text>
          {instructions.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.instructionRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.instructionText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={24} color="#245BDB" />
            <Text style={styles.sectionTitle}>Your Details</Text>
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Full Name *"
              placeholderTextColor="#8A92A3"
              value={patientName}
              onChangeText={setPatientName}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Mobile *"
              placeholderTextColor="#8A92A3"
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={(text) => setMobile(onlyDigits(text))}
            />
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Age *"
              placeholderTextColor="#8A92A3"
              keyboardType="number-pad"
              value={age}
              onChangeText={(text) => setAge(onlyDigits(text))}
            />
            <View style={[styles.genderBox, styles.halfInput]}>
              <Text style={styles.genderLabel}>Gender *</Text>
              <View style={styles.genderOptions}>
                {["Male", "Female"].map((item) => {
                  const active = gender === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.genderChip,
                        active && styles.genderChipActive,
                      ]}
                      onPress={() => setGender(item)}
                    >
                      <Text
                        style={[
                          styles.genderChipText,
                          active && styles.genderChipTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Email (optional)"
            placeholderTextColor="#8A92A3"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.paymentTitle}>Payment Method</Text>
          <View style={styles.paymentRow}>
            {["Cash", "Online"].map((item) => {
              const active = paymentMethod === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.paymentChip,
                    active && styles.paymentChipActive,
                  ]}
                  onPress={() => setPaymentMethod(item)}
                >
                  <Text
                    style={[
                      styles.paymentChipText,
                      active && styles.paymentChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Date & Time *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {availableDates.length === 0 ? (
              <View style={styles.noDataBox}>
                <Text style={styles.noDataText}>No available dates</Text>
              </View>
            ) : (
              availableDates.map((date) => {
                const active = selectedDate === date;
                return (
                  <TouchableOpacity
                    key={date}
                    style={[styles.dateChip, active && styles.dateChipActive]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text
                      style={[
                        styles.dateChipText,
                        active && styles.dateChipTextActive,
                      ]}
                    >
                      {date}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {timeSlots.length === 0 ? (
            <View style={styles.noDataBox}>
              <Text style={styles.noDataText}>
                No available time slots for this date.
              </Text>
            </View>
          ) : (
            <View style={styles.timeGrid}>
              {timeSlots.map((time) => {
                const active = selectedTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeChip, active && styles.timeChipActive]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={active ? "#FFFFFF" : "#245BDB"}
                    />
                    <Text
                      style={[
                        styles.timeChipText,
                        active && styles.timeChipTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Name</Text>
            <Text style={styles.summaryValue}>
              {patientName?.trim() || "Not filled"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mobile</Text>
            <Text style={styles.summaryValue}>
              {mobile?.trim() || "Not filled"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date & Time</Text>
            <Text style={styles.summaryValue}>
              {selectedDate && selectedTime
                ? `${selectedDate} at ${selectedTime}`
                : "Not selected"}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment</Text>
            <Text style={styles.summaryValue}>{paymentMethod}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 12 }]}>
            <Text style={[styles.summaryLabel, styles.summaryTotalLabel]}>
              Total Price
            </Text>
            <Text style={styles.summaryPrice}>${service.price || 0}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            loading && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Confirm Booking</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Enhanced: Refined styles for a more modern, mobile-friendly look
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F7FB" },
  container: { flex: 1 },
  contentContainer: { paddingBottom: 40, paddingTop: 10 },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#6C7685", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7, 20, 43, 0.6)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20 },
  modalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#07142B" },
  modalServiceName: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#245BDB",
  },
  modalDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: "#4E596A",
  },
  modalCloseButton: {
    marginTop: 20,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#245BDB",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  heroCard: {
    marginHorizontal: 16,
    height: 200,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#DDE7F8",
  },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
    backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)",
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: { position: "absolute", left: 16, right: 16, bottom: 16 },
  serviceName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  serviceDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#ECF3FF",
    fontWeight: "500",
  },
  // Enhanced: A single card for core details with shadows
  detailsCard: {
    marginHorizontal: 16,
    marginTop: -30, // Pulls the card up over the hero image slightly
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    // --- Shadow styles ---
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 8,
  },
  detailsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF3FB",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: "#07142B" },
  priceValue: { fontSize: 18, fontWeight: "800", color: "#245BDB" },
  divider: { height: 1, backgroundColor: "#F0F2F5", marginHorizontal: 16 },
  // Enhanced: Unified card style for all sections
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    // --- Shadow styles ---
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#07142B" },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  bullet: { fontSize: 14, color: "#245BDB", marginRight: 10, lineHeight: 20 },
  instructionText: { flex: 1, fontSize: 13, lineHeight: 20, color: "#5E6878" },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  input: {
    height: 50,
    backgroundColor: "#F4F7FC",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#07142B",
    fontWeight: "500",
  },
  halfInput: { flex: 1 },
  genderBox: {
    backgroundColor: "#F4F7FC",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: "center",
  },
  genderLabel: {
    fontSize: 11,
    color: "#7A8597",
    marginBottom: 4,
    fontWeight: "600",
    paddingLeft: 4,
  },
  genderOptions: { flexDirection: "row", gap: 6 },
  genderChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#E8EEF8",
    alignItems: "center",
    justifyContent: "center",
  },
  genderChipActive: { backgroundColor: "#245BDB" },
  genderChipText: { fontSize: 12, fontWeight: "700", color: "#4E596A" },
  genderChipTextActive: { color: "#FFFFFF" },
  paymentTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#07142B",
  },
  paymentRow: { flexDirection: "row", gap: 10 },
  paymentChip: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EEF3FB",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentChipActive: { backgroundColor: "#245BDB" },
  paymentChipText: { fontSize: 14, fontWeight: "700", color: "#3E4B61" },
  paymentChipTextActive: { color: "#FFFFFF" },
  dateRow: { paddingTop: 12, paddingBottom: 16, gap: 10 },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E9F0",
  },
  dateChipActive: { backgroundColor: "#245BDB", borderColor: "#245BDB" },
  dateChipText: { fontSize: 14, fontWeight: "700", color: "#334155" },
  dateChipTextActive: { color: "#FFFFFF" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E9F0",
  },
  timeChipActive: { backgroundColor: "#0D63D8", borderColor: "#0D63D8" },
  timeChipText: { fontSize: 13, fontWeight: "700" },
  timeChipTextActive: { color: "#FFFFFF" },
  noDataBox: {
    backgroundColor: "#F4F7FC",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    alignItems: "center",
  },
  noDataText: { fontSize: 13, fontWeight: "500", color: "#6C7685" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  summaryLabel: { fontSize: 14, color: "#6C7685", fontWeight: "500" },
  summaryValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "600",
    color: "#07142B",
  },
  summaryTotalLabel: { fontWeight: "700", color: "#07142B" },
  summaryPrice: { fontSize: 18, fontWeight: "800", color: "#245BDB" },
  confirmButton: {
    marginHorizontal: 16,
    marginTop: 24,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#0D63D8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
