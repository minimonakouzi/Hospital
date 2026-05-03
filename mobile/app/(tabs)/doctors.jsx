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
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getDoctors } from "../../services/doctors";

export default function DoctorsScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [doctorsData, setDoctorsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const data = await getDoctors();

      const normalizedDoctors = (data || []).map((doctor) => ({
        id: doctor._id || doctor.id,
        name: doctor.name || "Unknown Doctor",
        specialty: doctor.specialization || "Not specified",
        category: doctor.specialization || "",
        hospital: doctor.location || "",
        price:
          doctor.fee !== undefined && doctor.fee !== null
            ? `$${doctor.fee}`
            : "Not specified",
        fee: Number(doctor.fee || 0),
        rating: doctor.rating ? String(doctor.rating) : "",
        experience: doctor.experience || "Experience not available",
        reviews: doctor.reviews ? String(doctor.reviews) : "",
        image: doctor.imageUrl || "",
        verified: Boolean(doctor.verified),
        schedule: doctor.schedule || {},
        about: doctor.about || "",
        qualifications: doctor.qualifications || "",
        availability: doctor.availability || "",
        patients: doctor.patients || "",
        success: doctor.success || "",
      }));

      setDoctorsData(normalizedDoctors);
    } catch (error) {
      console.log("LOAD DOCTORS ERROR:", error);
      Alert.alert("Error", "Could not load doctors.");
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = useMemo(() => {
    const text = searchText.toLowerCase().trim();

    return doctorsData.filter((doctor) => {
      return (
        !text ||
        doctor.name.toLowerCase().includes(text) ||
        doctor.specialty.toLowerCase().includes(text) ||
        doctor.hospital.toLowerCase().includes(text) ||
        doctor.category.toLowerCase().includes(text)
      );
    });
  }, [doctorsData, searchText]);

  const handleBookDoctor = (doctor) => {
    router.push({
      pathname: "/(tabs)/book-appointment",
      params: {
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty,
        doctorHospital: doctor.hospital,
        doctorRating: doctor.rating,
        doctorExperience: doctor.experience,
        doctorReviews: doctor.reviews,
        doctorImage: doctor.image,
        doctorFee: String(doctor.fee || 0),
        doctorAbout: doctor.about,
        doctorQualifications: doctor.qualifications,
        doctorAvailability: doctor.availability,
        doctorPatients: String(doctor.patients || ""),
        doctorSuccess: String(doctor.success || ""),
        schedule: JSON.stringify(doctor.schedule || {}),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(tabs)")}
          >
            <Ionicons name="arrow-back" size={24} color="#1C4DFF" />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Doctors</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#6E7888" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for doctors "
              placeholderTextColor="#6E7888"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

        </View>

        <Text style={styles.sectionTitle}>Available Doctors</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0D63D8" />
            <Text style={styles.loadingText}>Loading doctors...</Text>
          </View>
        ) : (
          filteredDoctors.map((doctor) => (
            <View key={doctor.id} style={styles.doctorCard}>
              {doctor.image ? (
                <Image
                  source={{ uri: doctor.image }}
                  style={styles.doctorImage}
                />
              ) : (
                <View style={styles.doctorImagePlaceholder}>
                  <Ionicons name="person-outline" size={28} color="#7D8CA3" />
                </View>
              )}

              <View style={styles.doctorContent}>
                <View style={styles.doctorTopRow}>
                  <Text style={styles.doctorName} numberOfLines={1}>
                    {doctor.name}
                  </Text>

                  {doctor.rating ? (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#F4B400" />
                      <Text style={styles.ratingText}>{doctor.rating}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.doctorSpecialty} numberOfLines={1}>
                  {doctor.specialty}
                </Text>

                {doctor.hospital ? (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-sharp" size={14} color="#4E596A" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {doctor.hospital}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.locationRow}>
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color="#4E596A"
                    />
                    <Text style={styles.locationText} numberOfLines={1}>
                      Not specified
                    </Text>
                  </View>
                )}

                <View style={styles.doctorBottomRow}>
                  <Text style={styles.priceText}>{doctor.price}</Text>

                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => handleBookDoctor(doctor)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.bookButtonText}>Book</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {doctor.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#0B8F83" />
                </View>
              )}
            </View>
          ))
        )}

        {!loading && filteredDoctors.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={30} color="#9AA6B6" />
            <Text style={styles.emptyTitle}>No doctors found</Text>
            <Text style={styles.emptySubtitle}>
              Try another name or specialty.
            </Text>
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
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E7ECF3",
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#07142B",
  },
  headerBrand: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1541B7",
  },
  searchRow: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    height: 54,
    backgroundColor: "#E8EEF9",
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#1D2736",
  },
  filterButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#E8EEF9",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "800",
    color: "#07142B",
  },
  loadingWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#4E596A",
    fontWeight: "600",
  },
  doctorCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    position: "relative",
    alignItems: "center",
  },
  doctorImage: {
    width: 76,
    height: 92,
    borderRadius: 16,
    backgroundColor: "#D7E8F1",
    marginRight: 12,
  },
  doctorImagePlaceholder: {
    width: 76,
    height: 92,
    borderRadius: 16,
    backgroundColor: "#E7EDF7",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  doctorContent: {
    flex: 1,
    justifyContent: "space-between",
    minHeight: 92,
  },
  doctorTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  doctorName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#07142B",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDF2FB",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#253244",
  },
  doctorSpecialty: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#1C4DFF",
  },
  locationRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#4E596A",
    flex: 1,
  },
  doctorBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceText: {
    fontSize: 13,
    color: "#1D2736",
    fontWeight: "700",
  },
  bookButton: {
    backgroundColor: "#0D63D8",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 14,
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  verifiedBadge: {
    position: "absolute",
    left: 70,
    bottom: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#07142B",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6E7888",
    textAlign: "center",
  },
});
