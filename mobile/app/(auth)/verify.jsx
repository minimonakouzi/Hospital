import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { router } from "expo-router";

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim]);

  const handleCodeChange = (text) => {
    const digitsOnly = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digitsOnly);
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    if (code.length !== CODE_LENGTH) {
      Alert.alert(
        "Missing code",
        "Please enter the 6-digit verification code.",
      );
      return;
    }

    try {
      setLoading(true);

      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        Alert.alert("Verification incomplete", "Please try again.");
      }
    } catch (err) {
      Alert.alert("Verification failed", "The code is invalid or expired.");
      console.log("SIGNUP VERIFY ERROR:", JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const onResendPress = async () => {
    if (!isLoaded) return;

    try {
      setResending(true);
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setCode("");
      Alert.alert(
        "Code resent",
        "A new verification code was sent to your email.",
      );
    } catch (err) {
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "Could not resend code.";
      Alert.alert("Resend failed", message);
      console.log("SIGNUP RESEND ERROR:", JSON.stringify(err, null, 2));
    } finally {
      setResending(false);
    }
  };

  const renderCodeBoxes = () => {
    return Array.from({ length: CODE_LENGTH }).map((_, index) => {
      const digit = code[index] || "";
      return (
        <TouchableOpacity
          key={index}
          activeOpacity={0.9}
          style={styles.codeBox}
          onPress={() => inputRef.current?.focus()}
        >
          <Text style={styles.codeText}>{digit}</Text>
        </TouchableOpacity>
      );
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            style={styles.hiddenInput}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
          />

          <View style={styles.content}>
            <Image
              source={require("../../assets/revive-verification.png")}
              style={styles.illustration}
              resizeMode="contain"
            />

            <Text style={styles.title}>Enter Code</Text>
            <Text style={styles.subtitle}>
              A code has been sent to your email
            </Text>

            <View style={styles.codeRow}>{renderCodeBoxes()}</View>

            <TouchableOpacity
              style={styles.resendWrap}
              onPress={onResendPress}
              disabled={resending}
              activeOpacity={0.85}
            >
              <Text style={styles.resendText}>
                {resending ? "Resending..." : "Request again"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onVerifyPress}
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>Confirm</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backWrap}
              activeOpacity={0.85}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEF5FF",
  },
  container: {
    flex: 1,
    backgroundColor: "#EEF5FF",
    paddingHorizontal: 20,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 40,
  },
  illustration: {
    width: 220,
    height: 220,
    alignSelf: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#20242A",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#444B55",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 26,
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  codeBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9DEE7",
    justifyContent: "center",
    alignItems: "center",
  },
  codeText: {
    fontSize: 22,
    fontWeight: "500",
    color: "#222222",
  },
  resendWrap: {
    alignSelf: "flex-end",
    marginBottom: 26,
  },
  resendText: {
    fontSize: 14,
    color: "#2C84F7",
    fontWeight: "500",
  },
  confirmButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1976F3",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
  backWrap: {
    alignSelf: "center",
    marginTop: 14,
  },
  backText: {
    fontSize: 14,
    color: "#2C84F7",
    fontWeight: "500",
  },
});
