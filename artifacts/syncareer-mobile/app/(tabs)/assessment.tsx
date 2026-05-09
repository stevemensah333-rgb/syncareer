import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import {
  LIKERT,
  QUESTIONS,
  TRAIT_DESCRIPTIONS,
  type Trait,
} from "@/data/assessment";
import { useColors } from "@/hooks/useColors";

const ASSESSMENT_KEY = "syncareer:assessment:result";
const TRAITS: Trait[] = [
  "Realistic",
  "Investigative",
  "Artistic",
  "Social",
  "Enterprising",
  "Conventional",
];

type Answers = Record<number, number>;

type StoredResult = {
  topTrait: Trait;
  scores: Record<Trait, number>;
  completedAt: string;
};

export default function AssessmentScreen() {
  const colors = useColors();
  const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
  const [index, setIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [stored, setStored] = useState<StoredResult | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ASSESSMENT_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          setStored(JSON.parse(raw) as StoredResult);
        } catch {
          /* ignore */
        }
      })
      .catch(() => undefined);
  }, []);

  const computed = useMemo<StoredResult | null>(() => {
    if (Object.keys(answers).length < QUESTIONS.length) return null;
    const scores = TRAITS.reduce<Record<Trait, number>>((acc, t) => {
      acc[t] = 0;
      return acc;
    }, {} as Record<Trait, number>);
    for (const q of QUESTIONS) {
      scores[q.trait] += answers[q.id] ?? 0;
    }
    let topTrait: Trait = TRAITS[0];
    for (const t of TRAITS) {
      if (scores[t] > scores[topTrait]) topTrait = t;
    }
    return { scores, topTrait, completedAt: new Date().toISOString() };
  }, [answers]);

  const finish = useCallback(async () => {
    if (!computed) return;
    await AsyncStorage.setItem(ASSESSMENT_KEY, JSON.stringify(computed));
    setStored(computed);
    setPhase("result");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined
    );
  }, [computed]);

  const restart = () => {
    setAnswers({});
    setIndex(0);
    setPhase("quiz");
  };

  if (phase === "intro") {
    return (
      <IntroView
        stored={stored}
        onStart={() => {
          setAnswers({});
          setIndex(0);
          setPhase("quiz");
        }}
        onView={() => setPhase("result")}
      />
    );
  }

  if (phase === "result" && stored) {
    return <ResultView result={stored} onRetake={restart} />;
  }

  const total = QUESTIONS.length;
  const current = QUESTIONS[index];
  const selected = answers[current.id];
  const progress = ((index + (selected ? 1 : 0)) / total) * 100;
  const isLast = index === total - 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.progressWrap}>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: colors.muted },
            ]}
          >
            <View
              style={[
                styles.progressBar,
                { backgroundColor: colors.primary, width: `${progress}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            Question {index + 1} of {total}
          </Text>
        </View>

        <Text style={[styles.question, { color: colors.foreground }]}>
          {current.text}
        </Text>

        <View style={{ gap: 10 }}>
          {LIKERT.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  setAnswers((a) => ({ ...a, [current.id]: opt.value }));
                }}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.muted : colors.card,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {isSelected ? (
                    <View
                      style={[
                        styles.radioDot,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: isSelected
                        ? colors.foreground
                        : colors.mutedForeground,
                      fontFamily: isSelected
                        ? "Inter_600SemiBold"
                        : "Inter_500Medium",
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.navRow}>
          <Pressable
            onPress={() => index > 0 && setIndex(index - 1)}
            disabled={index === 0}
            style={({ pressed }) => [
              styles.navBtn,
              {
                borderColor: colors.border,
                opacity: index === 0 ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
            <Text style={[styles.navText, { color: colors.foreground }]}>Back</Text>
          </Pressable>

          {isLast ? (
            <PrimaryButton
              label="See results"
              onPress={finish}
              disabled={!selected}
              style={{ flex: 1 }}
              testID="finish"
            />
          ) : (
            <PrimaryButton
              label="Next"
              onPress={() => selected && setIndex(index + 1)}
              disabled={!selected}
              style={{ flex: 1 }}
              testID="next"
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function IntroView({
  stored,
  onStart,
  onView,
}: {
  stored: StoredResult | null;
  onStart: () => void;
  onView: () => void;
}) {
  const colors = useColors();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.introScroll}
    >
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.introHero}
      >
        <Feather name="compass" size={28} color="#fff" />
        <Text style={styles.introTitle}>Career assessment</Text>
        <Text style={styles.introBody}>
          {QUESTIONS.length} quick questions. We'll match your traits to careers
          you can actually pursue.
        </Text>
      </LinearGradient>

      <View style={styles.introMeta}>
        <Meta icon="clock" label="≈ 4 minutes" />
        <Meta icon="lock" label="Saved on this device" />
        <Meta icon="refresh-cw" label="Retake any time" />
      </View>

      <PrimaryButton
        label={stored ? "Start a new attempt" : "Start assessment"}
        onPress={onStart}
        testID="start-assessment"
      />
      {stored ? (
        <PrimaryButton
          label="View my last result"
          variant="ghost"
          onPress={onView}
        />
      ) : null}
    </ScrollView>
  );
}

function Meta({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.metaItem,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={14} color={colors.primary} />
      <Text style={[styles.metaText, { color: colors.foreground }]}>{label}</Text>
    </View>
  );
}

function ResultView({
  result,
  onRetake,
}: {
  result: StoredResult;
  onRetake: () => void;
}) {
  const colors = useColors();
  const trait = TRAIT_DESCRIPTIONS[result.topTrait];
  const max = Math.max(...TRAITS.map((t) => result.scores[t])) || 1;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.resultScroll}
    >
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.resultHero}
      >
        <Text style={styles.resultEyebrow}>Your top career type</Text>
        <Text style={styles.resultTitle}>
          {result.topTrait} — {trait.title}
        </Text>
        <Text style={styles.resultBody}>{trait.blurb}</Text>
      </LinearGradient>

      <View style={styles.resultSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Suggested careers
        </Text>
        <View style={{ gap: 10 }}>
          {trait.careers.map((c) => (
            <View
              key={c}
              style={[
                styles.careerCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="briefcase" size={18} color={colors.primary} />
              <Text style={[styles.careerText, { color: colors.foreground }]}>
                {c}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.resultSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Trait breakdown
        </Text>
        <View style={{ gap: 10 }}>
          {TRAITS.map((t) => {
            const v = result.scores[t];
            const pct = (v / max) * 100;
            return (
              <View key={t} style={styles.traitRow}>
                <View style={styles.traitLabelRow}>
                  <Text
                    style={[
                      styles.traitLabel,
                      { color: colors.foreground },
                    ]}
                  >
                    {t}
                  </Text>
                  <Text
                    style={[
                      styles.traitScore,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {v}
                  </Text>
                </View>
                <View
                  style={[
                    styles.traitTrack,
                    { backgroundColor: colors.muted },
                  ]}
                >
                  <View
                    style={[
                      styles.traitBar,
                      {
                        backgroundColor:
                          t === result.topTrait
                            ? colors.primary
                            : colors.secondary,
                        width: `${pct}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <PrimaryButton label="Retake assessment" onPress={onRetake} variant="ghost" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, gap: 22, paddingBottom: 120 },
  progressWrap: { gap: 8 },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBar: { height: 6, borderRadius: 999 },
  progressLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  question: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { fontSize: 15 },
  navRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  navBtn: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  navText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  introScroll: { padding: 20, gap: 18, paddingBottom: 120 },
  introHero: {
    borderRadius: 20,
    padding: 22,
    gap: 8,
  },
  introTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -0.4,
  },
  introBody: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  introMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  metaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  resultScroll: { padding: 20, gap: 22, paddingBottom: 120 },
  resultHero: {
    borderRadius: 20,
    padding: 22,
    gap: 8,
  },
  resultEyebrow: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  resultBody: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  resultSection: { gap: 12 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  careerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  careerText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  traitRow: { gap: 6 },
  traitLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  traitLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  traitScore: { fontFamily: "Inter_500Medium", fontSize: 13 },
  traitTrack: { height: 8, borderRadius: 999, overflow: "hidden" },
  traitBar: { height: 8, borderRadius: 999 },
});
