import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLockup } from "@/components/Brand";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  {
    icon: "compass" as const,
    title: "Career assessment",
    body: "A 5-minute quiz that maps your strengths to real career paths.",
  },
  {
    icon: "file-text" as const,
    title: "ATS-ready CV",
    body: "Build a CV that gets past employer screening systems.",
  },
  {
    icon: "mic" as const,
    title: "Interview practice",
    body: "Rehearse answers with an AI interviewer, anytime.",
  },
  {
    icon: "briefcase" as const,
    title: "Jobs that fit",
    body: "Roles matched to your skills across the continent.",
  },
];

export default function LandingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/(tabs)" />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <BrandLockup />
        </View>

        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>For African graduates</Text>
          <Text style={styles.heroTitle}>Find work that fits the life you want.</Text>
          <Text style={styles.heroBody}>
            Career tools built for your phone — assessments, CVs, interview practice
            and matched jobs.
          </Text>
        </LinearGradient>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View
              key={f.title}
              style={[
                styles.feature,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.iconBubble, { backgroundColor: colors.muted }]}>
                <Feather name={f.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.foreground }]}>
                  {f.title}
                </Text>
                <Text style={[styles.featureBody, { color: colors.mutedForeground }]}>
                  {f.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label="Get started"
            onPress={() => router.push("/sign-in?mode=signup")}
            testID="cta-signup"
          />
          <PrimaryButton
            label="I already have an account"
            variant="ghost"
            onPress={() => router.push("/sign-in")}
            testID="cta-signin"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 20 },
  brandRow: { paddingVertical: 4 },
  hero: { borderRadius: 20, padding: 24, gap: 10 },
  heroEyebrow: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  heroBody: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  features: { gap: 12 },
  feature: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  featureBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  actions: { gap: 10, marginTop: 4 },
});
