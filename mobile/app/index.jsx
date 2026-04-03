import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  StatusBar,
} from "react-native";
import { router } from "expo-router";

export default function IntroScreen() {
  const [showChoices, setShowChoices] = useState(false);

  const logoScale = useRef(new Animated.Value(0.65)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const contentTranslate = useRef(new Animated.Value(40)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(650),
    ]).start(() => {
      setShowChoices(true);

      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [contentOpacity, contentTranslate, logoOpacity, logoScale]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8FF" />

      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("../assets/revive-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {showChoices && (
        <Animated.View
          style={[
            styles.bottomCard,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslate }],
            },
          ]}
        >
          <Text style={styles.title}>Welcome to REVIVE</Text>
          <Text style={styles.subtitle}>
            Your hospital app for appointments, services, and patient care.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.9}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.9}
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text style={styles.secondaryButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  logo: {
    width: 280,
    height: 280,
  },
  bottomCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 26,
    shadowColor: "#0D63D8",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0B1736",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#5B6472",
    textAlign: "center",
    marginBottom: 24,
  },
  primaryButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0D63D8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  secondaryButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#E9F1FF",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0D63D8",
    fontSize: 17,
    fontWeight: "800",
  },
});
