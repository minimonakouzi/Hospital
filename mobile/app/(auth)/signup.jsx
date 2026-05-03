import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Image,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const GENDER_OPTIONS = ["Male", "Female"];

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function SignupScreen() {
  const { signUp, isLoaded } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(34)).current;
  const logoAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(logoAnim, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, logoAnim]);

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = emailAddress.trim().toLowerCase();
    const trimmedPhone = onlyDigits(phone);
    const trimmedAge = age.trim();
    const trimmedEmergencyContact = onlyDigits(emergencyContact);

    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      !password ||
      !trimmedPhone ||
      !trimmedAge ||
      !gender
    ) {
      Alert.alert(
        "Missing fields",
        "Please enter first name, last name, email, password, phone, age, and gender.",
      );
      return;
    }

    const ageNumber = Number(trimmedAge);

    if (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 120) {
      Alert.alert("Invalid age", "Please enter a valid age.");
      return;
    }

    if (trimmedPhone.length < 8 || trimmedPhone.length > 15) {
      Alert.alert(
        "Invalid phone",
        "Please enter a valid phone number between 8 and 15 digits.",
      );
      return;
    }

    if (
      trimmedEmergencyContact &&
      (trimmedEmergencyContact.length < 8 ||
        trimmedEmergencyContact.length > 15)
    ) {
      Alert.alert(
        "Invalid emergency contact",
        "Please enter a valid emergency contact number.",
      );
      return;
    }

    try {
      setLoading(true);

      await signUp.create({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        emailAddress: trimmedEmail,
        password,

        unsafeMetadata: {
          role: "patient",
          phone: trimmedPhone,
          age: ageNumber,
          gender,
          address: address.trim(),
          emergencyContact: trimmedEmergencyContact,
        },
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      Alert.alert("Verification", "A code was sent to your email.");
      router.push("/(auth)/verify");
    } catch (err) {
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "Could not create account.";

      Alert.alert("Signup failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoWrap,
              {
                transform: [{ scale: logoAnim }],
              },
            ]}
          >
            <Image
              source={require("../../assets/revive-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up as a patient</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={20} color="#6B7A90" />
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor="#7A8799"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={20} color="#6B7A90" />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor="#7A8799"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color="#6B7A90" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={emailAddress}
              onChangeText={setEmailAddress}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#7A8799"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color="#6B7A90" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#7A8799"
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#6B7A90"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Basic Patient Information</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={20} color="#6B7A90" />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={phone}
              onChangeText={(value) => setPhone(onlyDigits(value))}
              keyboardType="phone-pad"
              placeholderTextColor="#7A8799"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="calendar-outline" size={20} color="#6B7A90" />
            <TextInput
              style={styles.input}
              placeholder="Age"
              value={age}
              onChangeText={(value) => setAge(onlyDigits(value))}
              keyboardType="number-pad"
              placeholderTextColor="#7A8799"
            />
          </View>

          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((option) => {
              const selected = gender === option;

              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderButton,
                    selected && styles.genderButtonSelected,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setGender(option)}
                >
                  <Ionicons
                    name={option === "Male" ? "male-outline" : "female-outline"}
                    size={18}
                    color={selected ? "#FFFFFF" : "#0D63D8"}
                  />
                  <Text
                    style={[
                      styles.genderText,
                      selected && styles.genderTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={20} color="#6B7A90" />
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={address}
              onChangeText={setAddress}
              placeholderTextColor="#7A8799"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="alert-circle-outline" size={20} color="#6B7A90" />
            <TextInput
              style={styles.input}
              placeholder="Emergency Contact"
              value={emergencyContact}
              onChangeText={(value) => setEmergencyContact(onlyDigits(value))}
              keyboardType="phone-pad"
              placeholderTextColor="#7A8799"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onSignUpPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.link}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: "#F5F8FE",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 24,
    shadowColor: "#0D63D8",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0B1736",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#5B6472",
    textAlign: "center",
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0B1736",
    marginTop: 6,
    marginBottom: 12,
  },
  inputWrap: {
    minHeight: 58,
    backgroundColor: "#EAF1FB",
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#12233D",
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  genderButton: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#EAF1FB",
    borderWidth: 1,
    borderColor: "#D9E6FA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  genderButtonSelected: {
    backgroundColor: "#0D63D8",
    borderColor: "#0D63D8",
  },
  genderText: {
    color: "#0D63D8",
    fontSize: 15,
    fontWeight: "800",
  },
  genderTextSelected: {
    color: "#FFFFFF",
  },
  button: {
    height: 56,
    backgroundColor: "#0D63D8",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  link: {
    textAlign: "center",
    marginTop: 20,
    color: "#0D63D8",
    fontWeight: "700",
  },
});
