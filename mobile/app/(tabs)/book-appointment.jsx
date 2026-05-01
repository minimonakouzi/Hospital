import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { createAppointment } from "../../services/appointments";
import { BASE_URL } from "../../constants/config";

function parseSchedule(scheduleValue) {
  if (!scheduleValue) return {};

  if (typeof scheduleValue === "string") {
    try {
      const parsed = JSON.parse(scheduleValue);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  if (typeof scheduleValue === "object") {
    return scheduleValue;
  }

  return {};
}

function formatDateCard(dateStr) {
  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return {
      full: dateStr,
      day: dateStr.slice(0, 3),
      date: dateStr,
      month: "",
      pretty: dateStr,
    };
  }

  return {
    full: dateStr,
    day: date.toLocaleDateString("en-US", { weekday: "short" }),
    date: String(date.getDate()),
    month: date.toLocaleDateString("en-US", { month: "short" }),
    pretty: date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

function normalizeDoctorFromApi(apiDoctor = {}, fallback = {}) {
  return {
    id: apiDoctor._id || apiDoctor.id || fallback.id || "",
    name: apiDoctor.name || fallback.name || "Doctor",
    specialty:
      apiDoctor.specialization ||
      apiDoctor.speciality ||
      fallback.specialty ||
      "General",
    hospital: apiDoctor.location || fallback.hospital || "Revive Center",
    rating:
      apiDoctor.rating !== undefined && apiDoctor.rating !== null
        ? String(apiDoctor.rating)
        : fallback.rating || "4.9",
    experience: apiDoctor.experience || fallback.experience || "Experience",
    reviews: fallback.reviews || "0 reviews",
    image:
      apiDoctor.imageUrl ||
      apiDoctor.image ||
      fallback.image ||
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
    schedule: parseSchedule(apiDoctor.schedule) || {},
    fee:
      apiDoctor.fee !== undefined && apiDoctor.fee !== null
        ? Number(apiDoctor.fee)
        : fallback.fee || 0,
    about:
      apiDoctor.about || fallback.about || "No doctor description available.",
    qualifications:
      apiDoctor.qualifications || fallback.qualifications || "Specialist",
    location: apiDoctor.location || fallback.location || "Revive Center",
    availability:
      apiDoctor.availability || fallback.availability || "Available",
    patients: apiDoctor.patients || fallback.patients || "0",
    success: apiDoctor.success || fallback.success || "0%",
  };
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function isValidName(name) {
  const trimmed = String(name || "").trim();
  return trimmed.length >= 2;
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

export default function BookAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getToken } = useAuth();
  const { user } = useUser();

  const doctorId = String(params.doctorId || "");

  const fallbackDoctor = useMemo(
    () => ({
      id: doctorId,
      name: String(params.doctorName || "Doctor"),
      specialty: String(params.doctorSpecialty || "General"),
      hospital: String(params.doctorHospital || "Revive Center"),
      rating: String(params.doctorRating || "4.9"),
      experience: String(params.doctorExperience || "Experience"),
      reviews: String(params.doctorReviews || "0 reviews"),
      image: String(
        params.doctorImage ||
          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
      ),
      schedule: parseSchedule(params.schedule),
      fee: Number(params.doctorFee || 0),
      about: String(params.doctorAbout || "No doctor description available."),
      qualifications: String(params.doctorQualifications || "Specialist"),
      location: String(params.doctorHospital || "Revive Center"),
      availability: String(params.doctorAvailability || "Available"),
      patients: String(params.doctorPatients || "0"),
      success: String(params.doctorSuccess || "0%"),
    }),
    [
      doctorId,
      params.doctorName,
      params.doctorSpecialty,
      params.doctorHospital,
      params.doctorRating,
      params.doctorExperience,
      params.doctorReviews,
      params.doctorImage,
      params.schedule,
      params.doctorFee,
      params.doctorAbout,
      params.doctorQualifications,
      params.doctorAvailability,
      params.doctorPatients,
      params.doctorSuccess,
    ],
  );

  const [doctor, setDoctor] = useState(fallbackDoctor);
  const [doctorLoading, setDoctorLoading] = useState(false);

  const [patientName, setPatientName] = useState(user?.fullName || "");
  const [age, setAge] = useState("");
  const [mobile, setMobile] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState(
    user?.primaryEmailAddress?.emailAddress || "",
  );
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  useEffect(() => {
    setPatientName(user?.fullName || "");
    setEmail(user?.primaryEmailAddress?.emailAddress || "");
  }, [user?.fullName, user?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    setDoctor(fallbackDoctor);
    setSelectedDate("");
    setSelectedTime("");
  }, [fallbackDoctor]);

  useEffect(() => {
    let isMounted = true;

    const loadDoctor = async () => {
      if (!doctorId) return;

      try {
        if (
          !fallbackDoctor.schedule ||
          Object.keys(fallbackDoctor.schedule).length === 0
        ) {
          setDoctorLoading(true);
        }

        const response = await fetch(`${BASE_URL}/api/doctors/${doctorId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load doctor details");
        }

        const apiDoctor = data?.data || data?.doctor || data;
        const normalizedDoctor = normalizeDoctorFromApi(
          apiDoctor,
          fallbackDoctor,
        );

        if (isMounted) {
          setDoctor(normalizedDoctor);
        }
      } catch (error) {
        console.log("LOAD SINGLE DOCTOR ERROR:", error);
        if (isMounted) {
          setDoctor(fallbackDoctor);
        }
      } finally {
        if (isMounted) {
          setDoctorLoading(false);
        }
      }
    };

    loadDoctor();

    return () => {
      isMounted = false;
    };
  }, [doctorId, fallbackDoctor]);

  const availableDates = useMemo(() => {
    return Object.keys(doctor.schedule || {}).sort();
  }, [doctor.schedule]);

  const formattedDates = useMemo(() => {
    return availableDates.map(formatDateCard);
  }, [availableDates]);

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const slots = doctor.schedule?.[selectedDate];
    return Array.isArray(slots) ? slots : [];
  }, [doctor.schedule, selectedDate]);

  useEffect(() => {
    if (!availableDates.length) {
      if (selectedDate !== "") setSelectedDate("");
      if (selectedTime !== "") setSelectedTime("");
      return;
    }

    if (!selectedDate || !availableDates.includes(selectedDate)) {
      const firstDate = availableDates[0];
      setSelectedDate(firstDate);

      const firstSlots = Array.isArray(doctor.schedule?.[firstDate])
        ? doctor.schedule[firstDate]
        : [];
      setSelectedTime(firstSlots[0] || "");
      return;
    }

    const currentSlots = Array.isArray(doctor.schedule?.[selectedDate])
      ? doctor.schedule[selectedDate]
      : [];

    if (!selectedTime || !currentSlots.includes(selectedTime)) {
      setSelectedTime(currentSlots[0] || "");
    }
  }, [availableDates, doctor.schedule, selectedDate, selectedTime]);

  const selectedDateDetails = formattedDates.find(
    (item) => item.full === selectedDate,
  );

  const handleConfirmBooking = async () => {
    try {
      if (!doctor.id) {
        Alert.alert("Error", "Doctor ID is missing.");
        return;
      }

      if (!availableDates.length) {
        Alert.alert(
          "Unavailable",
          "This doctor does not have any available dates right now.",
        );
        return;
      }

      if (!isValidName(patientName)) {
        Alert.alert(
          "Invalid name",
          "Please enter a valid patient name with at least 2 characters.",
        );
        return;
      }

      if (!isValidAge(age)) {
        Alert.alert(
          "Invalid age",
          "Please enter a valid age between 1 and 120.",
        );
        return;
      }

      if (!isValidMobile(mobile)) {
        Alert.alert(
          "Invalid mobile number",
          "Please enter a valid mobile number with 8 to 15 digits.",
        );
        return;
      }

      if (!gender) {
        Alert.alert("Missing gender", "Please select a gender.");
        return;
      }

      if (!isValidEmail(email)) {
        Alert.alert(
          "Invalid email",
          "Please enter a valid email address or leave it empty.",
        );
        return;
      }

      if (!selectedDate) {
        Alert.alert("No date", "Please select an available date.");
        return;
      }

      if (!availableDates.includes(selectedDate)) {
        Alert.alert(
          "Invalid date",
          "The selected date is no longer available. Please choose another one.",
        );
        return;
      }

      if (!selectedTime) {
        Alert.alert("No time", "Please select an available time slot.");
        return;
      }

      if (!timeSlots.includes(selectedTime)) {
        Alert.alert(
          "Invalid time",
          "The selected time is no longer available. Please choose another one.",
        );
        return;
      }

      setLoading(true);

      const token = await getToken({ template: "default", skipCache: true });

      if (!token) {
        Alert.alert("Error", "No Clerk token was returned.");
        return;
      }

      const appointmentData = {
        doctorId: doctor.id,
        patientName: patientName.trim(),
        mobile: onlyDigits(mobile),
        age: Number(age),
        gender: gender.trim(),
        email: normalizeEmail(email),
        date: selectedDate,
        time: selectedTime,
        paymentMethod,
        fee: doctor.fee || 0,
      };

      await createAppointment(token, appointmentData);

      Alert.alert(
        "Booking Confirmed",
        `${doctor.name}\n${selectedDate} at ${selectedTime}`,
        [
          {
            text: "View Appointments",
            onPress: () => router.push("/(tabs)/appointments"),
          },
          {
            text: "OK",
            onPress: () => router.push("/(tabs)"),
          },
        ],
      );
    } catch (error) {
      console.log("BOOKING ERROR FULL:", error);
      Alert.alert("Error", error.message || "Could not create appointment.");
    } finally {
      setLoading(false);
    }
  };

  const renderTimeSlot = (time) => {
    const isSelected = selectedTime === time;

    return (
      <TouchableOpacity
        key={time}
        style={[styles.timeSlot, isSelected && styles.selectedTimeSlot]}
        onPress={() => setSelectedTime(time)}
      >
        <Ionicons
          name="time-outline"
          size={14}
          color={isSelected ? "#FFFFFF" : "#5B6472"}
        />
        <Text style={[styles.timeText, isSelected && styles.selectedTimeText]}>
          {time}
        </Text>
      </TouchableOpacity>
    );
  };

  const showInitialLoader =
    doctorLoading && Object.keys(fallbackDoctor.schedule || {}).length === 0;

  if (showInitialLoader) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#0D63D8" />
          <Text style={styles.loadingScreenText}>
            Loading doctor details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Ionicons name="calendar-outline" size={25} color="#000000" />
          <Text style={styles.pageHeaderText}>Book Your Appointment</Text>
        </View>

        <View style={styles.topDoctorCard}>
          <View style={styles.topDoctorLeft}>
            <View style={styles.imageGlow}>
              <Image
                source={{ uri: doctor.image }}
                style={styles.topDoctorImage}
              />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="heart-outline" size={18} color="#FF5B7F" />
                <Text style={styles.statValue}>{doctor.success}</Text>
                <Text style={styles.statLabel}>Success</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="ribbon-outline" size={18} color="#F5A623" />
                <Text style={styles.statValue}>{doctor.experience}</Text>
                <Text style={styles.statLabel}>Experience</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="people-outline" size={18} color="#2A63FF" />
                <Text style={styles.statValue}>{doctor.patients}</Text>
                <Text style={styles.statLabel}>Patients</Text>
              </View>
            </View>
          </View>

          <View style={styles.topDoctorRight}>
            <Text style={styles.topDoctorName}>{doctor.name}</Text>

            <View style={styles.specialtyBadge}>
              <Ionicons name="flash-outline" size={14} color="#FFFFFF" />
              <Text style={styles.specialtyBadgeText}>{doctor.specialty}</Text>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>Qualifications</Text>
                <Text style={styles.infoCardValue}>
                  {doctor.qualifications}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>Location</Text>
                <Text style={styles.infoCardValue}>{doctor.location}</Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>Consultation Fee</Text>
                <Text style={styles.infoCardFee}>${doctor.fee || 0}</Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>Availability</Text>
                <Text style={styles.infoCardValue}>{doctor.availability}</Text>
              </View>
            </View>

            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>About Doctor</Text>
              <Text style={styles.aboutText}>{doctor.about}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderGroup}>
            <Ionicons name="calendar-outline" size={16} color="#1C4DFF" />
            <Text style={styles.sectionHeaderText}>Select Date</Text>
          </View>

          <View style={styles.sectionHeaderGroup}>
            <Ionicons name="time-outline" size={16} color="#1C4DFF" />
            <Text style={styles.sectionHeaderText}>Available Time Slots</Text>
          </View>
        </View>

        <View style={styles.topGrid}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
            style={styles.dateRowWrap}
          >
            {formattedDates.length === 0 ? (
              <View style={styles.noDateBox}>
                <Text style={styles.noDateText}>No available dates</Text>
              </View>
            ) : (
              formattedDates.map((item) => {
                const isSelected = selectedDate === item.full;

                return (
                  <TouchableOpacity
                    key={item.full}
                    style={[
                      styles.dateCard,
                      isSelected && styles.selectedDateCard,
                    ]}
                    onPress={() => {
                      setSelectedDate(item.full);
                      const slots = doctor.schedule?.[item.full] || [];
                      setSelectedTime(
                        Array.isArray(slots) ? slots[0] || "" : "",
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.dateDayText,
                        isSelected && styles.selectedDateDayText,
                      ]}
                    >
                      {item.day}
                    </Text>

                    <Text
                      style={[
                        styles.dateNumberText,
                        isSelected && styles.selectedDateNumberText,
                      ]}
                    >
                      {item.date}
                    </Text>

                    <Text
                      style={[
                        styles.dateMonthText,
                        isSelected && styles.selectedDateMonthText,
                      ]}
                    >
                      {item.month}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={styles.timeWrap}>
            {timeSlots.length === 0 ? (
              <View style={styles.noTimeBox}>
                <Text style={styles.noTimeText}>
                  No available time slots for this date.
                </Text>
              </View>
            ) : (
              <View style={styles.timeGrid}>
                {timeSlots.map(renderTimeSlot)}
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomGrid}>
          <View style={styles.leftCard}>
            <Text style={styles.cardTitle}>Patient Details</Text>

            <View style={styles.twoInputsRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Patient Name"
                value={patientName}
                onChangeText={setPatientName}
              />

              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Age"
                value={age}
                onChangeText={(text) => setAge(onlyDigits(text))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.twoInputsRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Mobile Number"
                value={mobile}
                onChangeText={(text) => setMobile(onlyDigits(text))}
                keyboardType="phone-pad"
              />

              <View style={styles.genderRow}>
                {["Male", "Female"].map((option) => {
                  const active = gender === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.genderChip,
                        active && styles.genderChipActive,
                      ]}
                      onPress={() => setGender(option)}
                    >
                      <Text
                        style={[
                          styles.genderChipText,
                          active && styles.genderChipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.rightCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Selected Doctor:</Text>
              <Text style={styles.summaryValue}>{doctor.name}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Doctor Speciality:</Text>
              <Text style={styles.summaryValue}>{doctor.specialty}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Selected Date:</Text>
              <Text style={styles.summaryValue}>
                {selectedDateDetails?.pretty || "Not selected"}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Selected Time:</Text>
              <Text style={styles.summaryValue}>
                {selectedTime || "Not selected"}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Consultation Fee:</Text>
              <Text style={styles.feeValue}>${doctor.fee || 0}</Text>
            </View>

            <View style={styles.paymentWrap}>
              <Text style={styles.paymentLabel}>Payment:</Text>

              <View style={styles.paymentButtons}>
                <TouchableOpacity
                  style={[
                    styles.paymentChip,
                    paymentMethod === "Cash" && styles.paymentChipActive,
                  ]}
                  onPress={() => setPaymentMethod("Cash")}
                >
                  <Text
                    style={[
                      styles.paymentChipText,
                      paymentMethod === "Cash" && styles.paymentChipTextActive,
                    ]}
                  >
                    Cash
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentChip,
                    paymentMethod === "Online" && styles.paymentChipActive,
                  ]}
                  onPress={() => setPaymentMethod("Online")}
                >
                  <Text
                    style={[
                      styles.paymentChipText,
                      paymentMethod === "Online" &&
                        styles.paymentChipTextActive,
                    ]}
                  >
                    Online
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.disabledButton]}
              onPress={handleConfirmBooking}
              disabled={loading || !selectedDate || !selectedTime}
            >
              <Ionicons name="call-outline" size={18} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>
                {loading ? "Confirming..." : "Confirm Booking"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },
  container: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 34,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#F6F8FC",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingScreenText: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "600",
    color: "#4E596A",
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  pageHeaderText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000000",
  },
  topDoctorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E6ECF5",
    padding: 16,
    marginBottom: 18,
  },
  topDoctorLeft: {
    alignItems: "center",
    marginBottom: 18,
  },
  imageGlow: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#CFE7FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#46A4FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  topDoctorImage: {
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: "#E8EEF9",
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 16,
    width: "100%",
    justifyContent: "space-between",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6ECF5",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E2B3C",
    marginTop: 6,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#6C7483",
    marginTop: 3,
    textAlign: "center",
  },
  topDoctorRight: {
    flex: 1,
  },
  topDoctorName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1C4DFF",
    marginBottom: 10,
    textAlign: "center",
  },
  specialtyBadge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1E9BFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  specialtyBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  infoGrid: {
    gap: 10,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6ECF5",
    borderRadius: 16,
    padding: 14,
  },
  infoCardLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1C4DFF",
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 14,
    color: "#39485A",
  },
  infoCardFee: {
    fontSize: 16,
    fontWeight: "800",
    color: "#E04949",
  },
  aboutCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6ECF5",
    borderRadius: 16,
    padding: 14,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1C4DFF",
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: "#4E596A",
    lineHeight: 21,
  },
  sectionHeaderRow: {
    gap: 10,
    marginBottom: 12,
  },
  sectionHeaderGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C4DFF",
  },
  topGrid: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E6ECF5",
    marginBottom: 14,
  },
  dateRowWrap: {
    marginBottom: 14,
  },
  dateRow: {
    paddingRight: 8,
  },
  dateCard: {
    width: 78,
    height: 102,
    borderRadius: 22,
    backgroundColor: "#F3F6FB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E1E7F0",
  },
  selectedDateCard: {
    backgroundColor: "#2990FF",
    borderColor: "#2990FF",
  },
  dateDayText: {
    fontSize: 13,
    color: "#6C7483",
    marginBottom: 6,
  },
  selectedDateDayText: {
    color: "#EAF4FF",
  },
  dateNumberText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E2B3C",
    lineHeight: 30,
  },
  selectedDateNumberText: {
    color: "#FFFFFF",
  },
  dateMonthText: {
    fontSize: 12,
    color: "#6C7483",
    marginTop: 4,
  },
  selectedDateMonthText: {
    color: "#EAF4FF",
  },
  timeWrap: {
    marginTop: 2,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeSlot: {
    minWidth: 110,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 18,
    backgroundColor: "#F9FBFE",
    borderWidth: 1,
    borderColor: "#C9D6E7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  selectedTimeSlot: {
    backgroundColor: "#2990FF",
    borderColor: "#2990FF",
  },
  timeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#485466",
  },
  selectedTimeText: {
    color: "#FFFFFF",
  },
  noDateBox: {
    backgroundColor: "#F3F6FB",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  noDateText: {
    color: "#4E596A",
    fontSize: 15,
    fontWeight: "600",
  },
  noTimeBox: {
    backgroundColor: "#F3F6FB",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  noTimeText: {
    color: "#4E596A",
    fontSize: 15,
    fontWeight: "600",
  },
  bottomGrid: {
    gap: 14,
  },
  leftCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E6ECF5",
  },
  rightCard: {
    backgroundColor: "#EEF3FB",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E1E7F0",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1C4DFF",
    marginBottom: 14,
  },
  twoInputsRow: {
    gap: 10,
    marginBottom: 10,
  },
  input: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#DCE4F0",
    marginBottom: 10,
  },
  halfInput: {
    width: "100%",
    marginBottom: 0,
  },
  genderRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
  },
  genderChip: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE4F0",
  },
  genderChipActive: {
    backgroundColor: "#2990FF",
    borderColor: "#2990FF",
  },
  genderChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#485466",
  },
  genderChipTextActive: {
    color: "#FFFFFF",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 14,
    color: "#4E596A",
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1C4DFF",
    textAlign: "right",
  },
  feeValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#E04949",
    textAlign: "right",
  },
  paymentWrap: {
    marginTop: 8,
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1C4DFF",
    marginBottom: 8,
  },
  paymentButtons: {
    flexDirection: "row",
    gap: 8,
  },
  paymentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE4F0",
  },
  paymentChipActive: {
    backgroundColor: "#2A63FF",
    borderColor: "#2A63FF",
  },
  paymentChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2A63FF",
  },
  paymentChipTextActive: {
    color: "#FFFFFF",
  },
  confirmButton: {
    height: 50,
    borderRadius: 18,
    backgroundColor: "#B9BCC7",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
