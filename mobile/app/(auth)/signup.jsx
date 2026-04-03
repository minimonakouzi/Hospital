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

export default function SignupScreen() {
  const { signUp, isLoaded } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
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

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !emailAddress.trim() ||
      !password
    ) {
      Alert.alert(
        "Missing fields",
        "Please enter first name, last name, email, and password.",
      );
      return;
    }

    try {
      setLoading(true);

      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: emailAddress.trim(),
        password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      Alert.alert("Verification", "A code was sent to your email.");
      router.push("/verify");
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

          <TouchableOpacity style={styles.button} onPress={onSignUpPress}>
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
  inputWrap: {
    height: 58,
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
  button: {
    height: 56,
    backgroundColor: "#0D63D8",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
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
