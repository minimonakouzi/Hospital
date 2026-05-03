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
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getServices } from "../../services/services";

function countAllSlots(slots) {
  const values = Object.values(slots || {});
  return values.reduce((sum, arr) => {
    if (!Array.isArray(arr)) return sum;
    return sum + arr.length;
  }, 0);
}

function normalizeService(service) {
  return {
    id: service?._id || service?.id || "",
    name: service?.name || "Service",
    shortDescription: service?.shortDescription || "",
    about: service?.about || "",
    price:
      service?.price !== undefined && service?.price !== null
        ? Number(service.price)
        : 0,
    available:
      service?.available !== undefined ? Boolean(service.available) : true,
    image:
      service?.imageUrl ||
      service?.image ||
      "",
    slots:
      service?.slots && typeof service.slots === "object" ? service.slots : {},
  };
}

export default function ServicesScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [servicesData, setServicesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadServices = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await getServices();
      const normalized = (data || []).map(normalizeService);
      setServicesData(normalized);
    } catch (error) {
      console.log("LOAD SERVICES ERROR:", error);
      Alert.alert("Error", "Could not load services.");
      setServicesData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const filteredServices = useMemo(() => {
    const text = searchText.toLowerCase().trim();
    if (!text) return servicesData;
    return servicesData.filter(
        (service) =>
        service.name.toLowerCase().includes(text) ||
        service.shortDescription.toLowerCase().includes(text) ||
        service.about.toLowerCase().includes(text),
    );
  }, [servicesData, searchText]);

  const openBookService = (service) => {
    router.push({
      pathname: "/(tabs)/book-service",
      params: {
        serviceId: service.id,
        serviceName: service.name,
        serviceAbout: service.about,
        serviceShortDescription: service.shortDescription,
        servicePrice: String(service.price || 0),
        serviceImage: service.image,
        serviceAvailable: String(service.available),
        slots: JSON.stringify(service.slots || {}),
      },
    });
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
            onRefresh={() => loadServices(true)}
            colors={["#1C4DFF"]}
            tintColor={"#1C4DFF"}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#07142B" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Services</Text>
            <Text style={styles.subtitle}>Find & book hospital services</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={20} color="#7A8597" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for services"
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#7A8597"
            />
          </View>
        </View>

        {/* --- CONTENT --- */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0D63D8" />
            <Text style={styles.loadingText}>
              Loading available services...
            </Text>
          </View>
        ) : filteredServices.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="file-tray-outline" size={48} color="#93A1B5" />
            <Text style={styles.emptyTitle}>No Services Found</Text>
            <Text style={styles.emptyText}>
              There are no services matching your search. Try a different term
              or change the filter options.
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            {filteredServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => openBookService(service)}
              >
                {service.image ? (
                  <Image
                    source={{ uri: service.image }}
                    style={styles.cardImage}
                  />
                ) : (
                  <View style={styles.cardImagePlaceholder}>
                    <Ionicons name="layers-outline" size={34} color="#7D8CA3" />
                  </View>
                )}
                <View
                  style={[
                    styles.badge,
                    service.available
                      ? styles.badgeAvailable
                      : styles.badgeUnavailable,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      service.available
                        ? styles.badgeTextAvailable
                        : styles.badgeTextUnavailable,
                    ]}
                  >
                    {service.available ? "Available" : "Unavailable"}
                  </Text>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {service.name}
                  </Text>

                  {service.shortDescription ? (
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {service.shortDescription}
                    </Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="cash-outline" size={16} color="#4E596A" />
                      <Text style={styles.metaText}>${service.price}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={16} color="#4E596A" />
                      <Text style={styles.metaText}>
                        {countAllSlots(service.slots)} slots available
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => openBookService(service)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.bookButtonText}>Book Service</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F7FB" },
  container: { flex: 1 },
  contentContainer: { paddingBottom: 30 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 28, fontWeight: "900", color: "#07142B" },
  subtitle: { marginTop: 2, fontSize: 14, color: "#5E6878", fontWeight: "500" },
  searchRow: {
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchWrap: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#07142B", fontWeight: "500" },
  searchActionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingWrap: { paddingTop: 80, alignItems: "center", gap: 12 },
  loadingText: { fontSize: 15, color: "#6A7485", fontWeight: "600" },
  emptyWrap: {
    paddingTop: 80,
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#07142B" },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6A7485",
    textAlign: "center",
    fontWeight: "500",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  card: {
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 5,
  },
  cardImage: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#E7EDF7",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { padding: 16 },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#07142B",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5E6878",
    fontWeight: "500",
    marginBottom: 16,
  }, // Added margin bottom
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  badgeAvailable: { backgroundColor: "rgba(231, 248, 243, 0.95)" },
  badgeUnavailable: { backgroundColor: "rgba(253, 236, 236, 0.95)" },
  badgeText: { fontSize: 11, fontWeight: "900" },
  badgeTextAvailable: { color: "#0B8F83" },
  badgeTextUnavailable: { color: "#D64545" },

  // Style Change: Reverted meta row style
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: "#4E596A",
    fontWeight: "600",
  },

  bookButton: {
    backgroundColor: "#1C4DFF",
    borderRadius: 16,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bookButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
