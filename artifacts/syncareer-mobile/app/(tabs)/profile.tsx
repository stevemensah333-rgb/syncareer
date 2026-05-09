import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BrandMark } from "@/components/Brand";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TRAIT_DESCRIPTIONS, type Trait } from "@/data/assessment";
import { useColors } from "@/hooks/useColors";
import { useClerk, useUser } from "@/lib/auth";

const ASSESSMENT_KEY = "syncareer:assessment:result";

type StoredResult = {
  topTrait: Trait;
  scores: Record<Trait, number>;
  completedAt: string;
};

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [stored, setStored] = useState<StoredResult | null>(null);

  const refresh = useCallback(() => {
    AsyncStorage.getItem(ASSESSMENT_KEY)
      .then((raw) => {
        if (!raw) {
          setStored(null);
          return;
        }
        try {
          setStored(JSON.parse(raw) as StoredResult);
        } catch {
          setStored(null);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const confirmSignOut = () => {
    if (Platform.OS === "web") {
      signOut().then(() => router.replace("/"));
      return;
    }
    Alert.alert("Sign out?", "You will need to sign in again to continue.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };

  const trait = stored ? TRAIT_DESCRIPTIONS[stored.topTrait] : null;
  const completedLabel = stored
    ? new Date(stored.completedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
    >
      <View
        style={[
          styles.profileCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <BrandMark size={56} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={[styles.email, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {user?.fullName ??
              user?.primaryEmailAddress?.emailAddress ??
              "Signed in"}
          </Text>
          <Text style={[styles.role, { color: colors.mutedForeground }]}>
            Syncareer member
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Career snapshot
        </Text>
        {trait ? (
          <View
            style={[
              styles.snapshot,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.snapshotHeader}>
              <View style={[styles.iconBubble, { backgroundColor: colors.muted }]}>
                <Feather name="compass" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.snapTitle, { color: colors.foreground }]}>
                  {stored?.topTrait} — {trait.title}
                </Text>
                {completedLabel ? (
                  <Text style={[styles.snapMeta, { color: colors.mutedForeground }]}>
                    Completed {completedLabel}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={[styles.snapBody, { color: colors.mutedForeground }]}>
              {trait.blurb}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.empty,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="compass" size={20} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No assessment yet
            </Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Take the 4-minute quiz to see careers matched to you.
            </Text>
            <PrimaryButton
              label="Start assessment"
              onPress={() => router.push("/(tabs)/assessment")}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Account
        </Text>
        <Row
          icon="mail"
          label="Email"
          value={user?.primaryEmailAddress?.emailAddress ?? "—"}
        />
        <Row
          icon="hash"
          label="User ID"
          value={user?.id ? `${user.id.slice(0, 8)}…` : "—"}
        />
      </View>

      <Pressable
        onPress={confirmSignOut}
        style={({ pressed }) => [
          styles.signOut,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive }]}>
          Sign out
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.iconBubble, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={16} color={colors.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        <Text style={[styles.rowValue, { color: colors.foreground }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 22, paddingBottom: 120 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  email: { fontFamily: "Inter_700Bold", fontSize: 17, letterSpacing: -0.3 },
  role: { fontFamily: "Inter_500Medium", fontSize: 13 },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  snapshot: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  snapshotHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  snapTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  snapMeta: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
  snapBody: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  empty: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    alignItems: "flex-start",
  },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  emptyBody: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowLabel: { fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 0.3 },
  rowValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 2 },
  signOut: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
