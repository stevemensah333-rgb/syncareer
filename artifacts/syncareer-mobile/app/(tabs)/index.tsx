import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { TRAIT_DESCRIPTIONS, type Trait } from "@/data/assessment";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/lib/auth";

const ASSESSMENT_KEY = "syncareer:assessment:result";

type StoredResult = {
  topTrait: Trait;
  scores: Record<Trait, number>;
  completedAt: string;
};

const QUICK_LINKS: Array<{
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  body: string;
  href: "/(tabs)/assessment" | "/(tabs)/profile";
}> = [
  {
    icon: "compass",
    title: "Career assessment",
    body: "Discover careers that fit you.",
    href: "/(tabs)/assessment",
  },
  {
    icon: "user",
    title: "Your profile",
    body: "Manage your account and goals.",
    href: "/(tabs)/profile",
  },
];

const TIPS = [
  {
    icon: "file-text" as const,
    title: "ATS-ready CV builder",
    body: "Coming soon on mobile — build it on the web for now.",
  },
  {
    icon: "mic" as const,
    title: "Interview practice",
    body: "Rehearse common questions with our AI interviewer.",
  },
  {
    icon: "briefcase" as const,
    title: "Job matches",
    body: "Personalised roles based on your assessment.",
  },
];

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useUser();
  const [result, setResult] = useState<StoredResult | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem(ASSESSMENT_KEY)
        .then((raw) => {
          if (!active) return;
          if (!raw) {
            setResult(null);
            return;
          }
          try {
            setResult(JSON.parse(raw) as StoredResult);
          } catch {
            setResult(null);
          }
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, [])
  );

  const firstName =
    user?.firstName ??
    (user?.primaryEmailAddress?.emailAddress ?? "").split("@")[0] ??
    "there";
  const greeting = capitalise(firstName || "there");
  const trait = result ? TRAIT_DESCRIPTIONS[result.topTrait] : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
            Welcome back
          </Text>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {greeting}
          </Text>
        </View>
      </View>

      {trait ? (
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroEyebrow}>Your career type</Text>
          <Text style={styles.heroTitle}>
            {result?.topTrait} — {trait.title}
          </Text>
          <Text style={styles.heroBody}>{trait.blurb}</Text>
          <View style={styles.heroChips}>
            {trait.careers.slice(0, 3).map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/assessment")}
            style={styles.heroLink}
          >
            <Text style={styles.heroLinkText}>Retake assessment</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>
        </LinearGradient>
      ) : (
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroEyebrow}>5-minute quiz</Text>
          <Text style={styles.heroTitle}>Discover the careers that fit you.</Text>
          <Text style={styles.heroBody}>
            Answer a few questions and get matched to career paths and roles.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/assessment")}
            style={[styles.heroLink, styles.heroCta]}
          >
            <Text style={[styles.heroLinkText, { color: colors.primary }]}>
              Start assessment
            </Text>
            <Feather name="arrow-right" size={16} color={colors.primary} />
          </Pressable>
        </LinearGradient>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Quick links
        </Text>
        <View style={styles.quickGrid}>
          {QUICK_LINKS.map((q) => (
            <Pressable
              key={q.title}
              onPress={() => router.push(q.href)}
              style={({ pressed }) => [
                styles.quickCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.quickIcon, { backgroundColor: colors.muted }]}>
                <Feather name={q.icon} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.quickTitle, { color: colors.foreground }]}>
                {q.title}
              </Text>
              <Text style={[styles.quickBody, { color: colors.mutedForeground }]}>
                {q.body}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Coming up
        </Text>
        <View style={{ gap: 10 }}>
          {TIPS.map((t) => (
            <View
              key={t.title}
              style={[
                styles.tipCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.tipIcon, { backgroundColor: colors.muted }]}>
                <Feather name={t.icon} size={18} color={colors.secondary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.tipTitle, { color: colors.foreground }]}>
                  {t.title}
                </Text>
                <Text style={[styles.tipBody, { color: colors.mutedForeground }]}>
                  {t.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 22, paddingBottom: 120 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  greeting: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  heroCard: {
    borderRadius: 20,
    padding: 22,
    gap: 10,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  heroBody: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  heroChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  heroLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  heroLinkText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  heroCta: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  section: { gap: 12 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  quickGrid: { flexDirection: "row", gap: 12 },
  quickCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  quickBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  tipCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tipTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  tipBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
