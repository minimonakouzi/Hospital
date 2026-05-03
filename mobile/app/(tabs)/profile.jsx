import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Switch,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useFocusEffect, useRouter } from "expo-router";
import { getMyAppointments } from "../../services/appointments";
import { getMyServiceAppointments } from "../../services/serviceAppointments";
import {
  getMyPatientProfile,
  saveMyPatientProfile,
} from "../../services/patientProfile";

const defaultProfile = {
  firstName: "",
  lastName: "",
  imageUri: "",
  phone: "",
  age: "",
  gender: "",
  address: "",
  emergencyContact: "",
  allergies: "",
  medicalHistory: "",
  notificationsEnabled: true,
};

const GENDER_OPTIONS = ["Male", "Female"];
const PROFILE_TOP_PADDING =
  Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 18 : 18;

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeProfile(value) {
  return { ...defaultProfile, ...(value || {}) };
}

function CollapsibleSection({ title, icon, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const rotation = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.spring(rotation, {
      toValue,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
    setOpen(!open);
  };

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.sectionCard}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          styles.sectionHeader,
          pressed && { opacity: 0.75 },
        ]}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIconWrap}>
            <Ionicons name={icon} size={16} color="#0D63D8" />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color="#93A1B5" />
        </Animated.View>
      </Pressable>

      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <>
      <Text style={styles.inputLabel}>{label}</Text>
      <Text style={styles.readOnlyText}>
        {value ? String(value) : "Not specified"}
      </Text>
    </>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { signOut, getToken, isSignedIn } = useAuth();

  const [profile, setProfile] = useState(defaultProfile);
  const [originalProfile, setOriginalProfile] = useState(defaultProfile);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [doctorAppointmentsCount, setDoctorAppointmentsCount] = useState(0);
  const [serviceAppointmentsCount, setServiceAppointmentsCount] = useState(0);

  const fullName =
    `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
    user?.fullName?.trim() ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "Patient";

  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";

  const clerkImage = user?.imageUrl || user?.profileImageUrl || "";

  const avatarSource = useMemo(() => {
    if (profile.imageUri) return { uri: profile.imageUri };
    if (clerkImage) return { uri: clerkImage };
    return null;
  }, [profile.imageUri, clerkImage]);

  const updateField = (key, value) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);

      const clerkFirstName = user?.firstName || "";
      const clerkLastName = user?.lastName || "";

      if (!isSignedIn) {
        const fallbackProfile = normalizeProfile({
          firstName: clerkFirstName,
          lastName: clerkLastName,
        });
        setProfile(fallbackProfile);
        setOriginalProfile(fallbackProfile);
        return;
      }

      const token = await getToken({ template: "default", skipCache: true });

      if (!token) {
        const fallbackProfile = normalizeProfile({
          firstName: clerkFirstName,
          lastName: clerkLastName,
        });
        setProfile(fallbackProfile);
        setOriginalProfile(fallbackProfile);
        return;
      }

      const backendProfile = await getMyPatientProfile(token);

      const loadedProfile = normalizeProfile({
        firstName: clerkFirstName,
        lastName: clerkLastName,
        imageUri: backendProfile?.imageUrl || "",
        phone: backendProfile?.phone || "",
        age:
          backendProfile?.age === null || backendProfile?.age === undefined
            ? ""
            : String(backendProfile.age),
        gender: backendProfile?.gender || "",
        address: backendProfile?.address || "",
        emergencyContact: backendProfile?.emergencyContact || "",
        allergies: backendProfile?.allergies || "",
        medicalHistory: backendProfile?.medicalHistory || "",
        notificationsEnabled:
          typeof backendProfile?.notificationsEnabled === "boolean"
            ? backendProfile.notificationsEnabled
            : true,
      });

      setProfile(loadedProfile);
      setOriginalProfile(loadedProfile);
    } catch (err) {
      console.log("LOAD PROFILE ERROR:", err);
      const fallbackProfile = normalizeProfile({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
      });
      setProfile(fallbackProfile);
      setOriginalProfile(fallbackProfile);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoadingStats(true);

      if (!isSignedIn) {
        setDoctorAppointmentsCount(0);
        setServiceAppointmentsCount(0);
        return;
      }

      const token = await getToken({ template: "default", skipCache: true });

      if (!token) {
        setDoctorAppointmentsCount(0);
        setServiceAppointmentsCount(0);
        return;
      }

      const [doctorData, serviceData] = await Promise.all([
        getMyAppointments(token),
        getMyServiceAppointments(token),
      ]);

      setDoctorAppointmentsCount((doctorData?.appointments || []).length);
      setServiceAppointmentsCount(
        (serviceData?.appointments || serviceData?.data || []).length,
      );
    } catch (err) {
      console.log("LOAD STATS ERROR:", err);
      setDoctorAppointmentsCount(0);
      setServiceAppointmentsCount(0);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isUserLoaded) {
      loadProfile();
      loadStats();
    }
  }, [isUserLoaded]);

  useFocusEffect(
    useCallback(() => {
      if (isUserLoaded) {
        loadProfile();
        loadStats();
      }
    }, [isUserLoaded]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadStats()]);
    setRefreshing(false);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setProfile(originalProfile);
      setIsEditing(false);
      return;
    }
    setOriginalProfile(profile);
    setIsEditing(true);
  };

  const saveProfile = async () => {
    try {
      setSaving(true);

      if (!isSignedIn || !user) {
        Alert.alert("Not signed in", "Please sign in first.");
        return;
      }

      const trimmedFirstName = String(profile.firstName || "").trim();
      const trimmedLastName = String(profile.lastName || "").trim();

      if (!trimmedFirstName || !trimmedLastName) {
        Alert.alert(
          "Missing name",
          "Please enter both first name and last name.",
        );
        return;
      }

      if (typeof user.update === "function") {
        await user.update({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        });
      }

      const token = await getToken({ template: "default", skipCache: true });

      if (!token) {
        Alert.alert("Error", "Could not get authentication token.");
        return;
      }

      const payload = {
        phone: profile.phone || "",
        age: profile.age === "" ? null : Number(profile.age),
        gender: profile.gender || "",
        address: profile.address || "",
        emergencyContact: profile.emergencyContact || "",
        allergies: profile.allergies || "",
        medicalHistory: profile.medicalHistory || "",
        notificationsEnabled: !!profile.notificationsEnabled,
        imageUrl: profile.imageUri || "",
      };

      const savedProfile = await saveMyPatientProfile(token, payload);

      const updatedProfile = normalizeProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        imageUri: savedProfile?.imageUrl || profile.imageUri || "",
        phone: savedProfile?.phone || "",
        age:
          savedProfile?.age === null || savedProfile?.age === undefined
            ? ""
            : String(savedProfile.age),
        gender: savedProfile?.gender || "",
        address: savedProfile?.address || "",
        emergencyContact: savedProfile?.emergencyContact || "",
        allergies: savedProfile?.allergies || "",
        medicalHistory: savedProfile?.medicalHistory || "",
        notificationsEnabled:
          typeof savedProfile?.notificationsEnabled === "boolean"
            ? savedProfile.notificationsEnabled
            : true,
      });

      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile);
      setIsEditing(false);

      Alert.alert("Saved", "Your profile was updated successfully.");
    } catch (err) {
      console.log("SAVE PROFILE ERROR:", err);
      Alert.alert(
        "Error",
        err?.message || "Could not save your profile right now.",
      );
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    if (!isEditing) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow gallery access to upload a photo.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        updateField("imageUri", result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Could not open image gallery.");
    }
  };

  const removeImage = () => {
    if (!isEditing) return;

    Alert.alert("Remove photo", "Remove your profile photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => updateField("imageUri", ""),
      },
    ]);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Error", "Could not sign out right now.");
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F2F5FA" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#0D63D8" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F5FA" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Profile</Text>

            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditToggle}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isEditing ? "close" : "create-outline"}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.editButtonText}>
                  {isEditing ? "Cancel" : "Edit"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="log-out-outline" size={16} color="#D64545" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.profileCard}>
            <TouchableOpacity
              style={styles.avatarWrap}
              activeOpacity={isEditing ? 0.85 : 1}
              onPress={pickImage}
              disabled={!isEditing}
            >
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#7D8CA3" />
                </View>
              )}
              {isEditing && (
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.fullName}>{fullName}</Text>
            <Text style={styles.email}>{email || "No email found"}</Text>

            {isEditing && (
              <View style={styles.avatarButtonsRow}>
                <TouchableOpacity
                  style={styles.avatarActionButton}
                  onPress={pickImage}
                  activeOpacity={0.8}
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Ionicons name="image-outline" size={15} color="#0D63D8" />
                  <Text style={styles.avatarActionText}>Upload Photo</Text>
                </TouchableOpacity>

                <View style={styles.avatarDivider} />

                <TouchableOpacity
                  style={styles.avatarActionButton}
                  onPress={removeImage}
                  activeOpacity={0.8}
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Ionicons name="trash-outline" size={15} color="#D64545" />
                  <Text style={[styles.avatarActionText, { color: "#D64545" }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="calendar-outline" size={20} color="#0D63D8" />
              </View>
              <Text style={styles.statValue}>
                {loadingStats ? "-" : doctorAppointmentsCount}
              </Text>
              <Text style={styles.statLabel}>Doctor{"\n"}Appointments</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[styles.statIconWrap, { backgroundColor: "#E8F7F6" }]}
              >
                <Ionicons name="layers-outline" size={20} color="#0B8F83" />
              </View>
              <Text style={styles.statValue}>
                {loadingStats ? "-" : serviceAppointmentsCount}
              </Text>
              <Text style={styles.statLabel}>Service{"\n"}Bookings</Text>
            </View>
          </View>

          <CollapsibleSection
            title="Personal Information"
            icon="person-outline"
          >
            <Text style={styles.inputLabel}>First Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                placeholderTextColor="#A8B4C4"
                value={profile.firstName}
                onChangeText={(t) => updateField("firstName", t)}
                returnKeyType="next"
              />
            ) : (
              <Text style={styles.readOnlyText}>
                {profile.firstName || "Not specified"}
              </Text>
            )}

            <Text style={styles.inputLabel}>Last Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                placeholderTextColor="#A8B4C4"
                value={profile.lastName}
                onChangeText={(t) => updateField("lastName", t)}
                returnKeyType="next"
              />
            ) : (
              <Text style={styles.readOnlyText}>
                {profile.lastName || "Not specified"}
              </Text>
            )}

            <Text style={styles.inputLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor="#A8B4C4"
                value={profile.phone}
                onChangeText={(t) => updateField("phone", onlyDigits(t))}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            ) : (
              <Text style={styles.readOnlyText}>
                {profile.phone || "Not specified"}
              </Text>
            )}

            <Text style={styles.inputLabel}>Age</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.inputShort]}
                placeholder="Your age"
                placeholderTextColor="#A8B4C4"
                value={profile.age}
                onChangeText={(t) => updateField("age", onlyDigits(t))}
                keyboardType="number-pad"
              />
            ) : (
              <Text style={styles.readOnlyText}>
                {profile.age || "Not specified"}
              </Text>
            )}

            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.chipsRow}>
              {GENDER_OPTIONS.map((g) => {
                const selected = profile.gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => {
                      if (!isEditing) return;
                      updateField("gender", selected ? "" : g);
                    }}
                    activeOpacity={isEditing ? 0.8 : 1}
                    disabled={!isEditing}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Address</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                placeholder="Enter your address"
                placeholderTextColor="#A8B4C4"
                value={profile.address}
                onChangeText={(t) => updateField("address", t)}
                returnKeyType="next"
              />
            ) : (
              <Text style={styles.readOnlyText}>
                {profile.address || "Not specified"}
              </Text>
            )}

            <Text style={styles.inputLabel}>Emergency Contact</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, { marginBottom: 0 }]}
                placeholder="Name and phone number"
                placeholderTextColor="#A8B4C4"
                value={profile.emergencyContact}
                onChangeText={(t) => updateField("emergencyContact", t)}
                returnKeyType="done"
              />
            ) : (
              <Text style={[styles.readOnlyText, { marginBottom: 0 }]}>
                {profile.emergencyContact || "Not specified"}
              </Text>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Medical Information"
            icon="medkit-outline"
            defaultOpen={false}
          >
            <Text style={styles.inputLabel}>Allergies</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="e.g. Penicillin, peanuts..."
                placeholderTextColor="#A8B4C4"
                value={profile.allergies}
                onChangeText={(t) => updateField("allergies", t)}
                multiline
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.readOnlyText}>
                {profile.allergies || "Not specified"}
              </Text>
            )}

            <Text style={styles.inputLabel}>Medical History</Text>
            {isEditing ? (
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  { marginBottom: 0 },
                ]}
                placeholder="Brief medical history..."
                placeholderTextColor="#A8B4C4"
                value={profile.medicalHistory}
                onChangeText={(t) => updateField("medicalHistory", t)}
                multiline
                textAlignVertical="top"
              />
            ) : (
              <Text style={[styles.readOnlyText, styles.readOnlyMultiline]}>
                {profile.medicalHistory || "Not specified"}
              </Text>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Preferences"
            icon="settings-outline"
            defaultOpen={false}
          >
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceTextWrap}>
                <Text style={styles.preferenceTitle}>Push Notifications</Text>
                <Text style={styles.preferenceSubtitle}>
                  Reminders and appointment updates
                </Text>
              </View>
              <Switch
                value={profile.notificationsEnabled}
                onValueChange={(v) => updateField("notificationsEnabled", v)}
                trackColor={{ false: "#D8E0EC", true: "#9EC5FF" }}
                thumbColor={
                  profile.notificationsEnabled ? "#0D63D8" : "#F8FAFD"
                }
                ios_backgroundColor="#D8E0EC"
                disabled={!isEditing}
              />
            </View>
          </CollapsibleSection>

          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.75 }]}
              onPress={saveProfile}
              activeOpacity={0.88}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Profile</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F5FA",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 17,
    paddingTop: PROFILE_TOP_PADDING,
    paddingBottom: 40,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#5B6472",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#07142B",
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D63D8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    minHeight: 40,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  logoutButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 17,
    minHeight: 40,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#0D63D8",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  avatarWrap: {
    width: 100,
    height: 100,
    marginBottom: 14,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E7EDF7",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0D63D8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  fullName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0B1736",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  email: {
    marginTop: 4,
    fontSize: 13,
    color: "#667085",
    textAlign: "center",
  },
  avatarButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "#F4F7FC",
    borderRadius: 14,
    overflow: "hidden",
  },
  avatarActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
  },
  avatarDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#D8E2EF",
  },
  avatarActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D63D8",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#0D63D8",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EBF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#07142B",
    letterSpacing: -0.5,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    color: "#667085",
    textAlign: "center",
    lineHeight: 15,
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 10,
    shadowColor: "#0D63D8",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EBF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B1736",
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F4FA",
    paddingTop: 14,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4E596A",
    marginBottom: 7,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 50,
    backgroundColor: "#F3F6FB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#12233D",
    marginBottom: 14,
  },
  inputShort: {
    maxWidth: 120,
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  readOnlyText: {
    minHeight: 50,
    backgroundColor: "#F3F6FB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#12233D",
    marginBottom: 14,
    overflow: "hidden",
  },
  readOnlyMultiline: {
    minHeight: 90,
  },

  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 50,
    backgroundColor: "#F3F6FB",
    borderWidth: 1.5,
    borderColor: "#E0E8F4",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  chipSelected: {
    backgroundColor: "#EBF2FF",
    borderColor: "#0D63D8",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#667085",
  },
  chipTextSelected: {
    color: "#0D63D8",
    fontWeight: "700",
  },

  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    minHeight: 44,
  },
  preferenceTextWrap: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B1736",
  },
  preferenceSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#667085",
    lineHeight: 18,
  },

  saveButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0D63D8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    shadowColor: "#0D63D8",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
