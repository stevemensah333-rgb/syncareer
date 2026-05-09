import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/Brand";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";

// Mirrors the web app's SignInForm / SignUpForm components, which call
// supabase.auth.signInWithPassword / signUp directly. The Clerk-shaped
// `useAuth` shim from `@/lib/auth` handles session state for the rest
// of the app.
export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { configured } = useAuth();

  const [isSignUp, setIsSignUp] = useState<boolean>(mode === "signup");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.length >= 6 && !submitting,
    [email, password, submitting]
  );

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    if (!supabaseConfigured) {
      setError(
        "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
      );
      setSubmitting(false);
      return;
    }
    const trimmedEmail = email.trim();
    const result = isSignUp
      ? await supabase.auth.signUp({ email: trimmedEmail, password })
      : await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (isSignUp && !result.data.session) {
      setInfo("Check your email to confirm your account, then sign in.");
      setIsSignUp(false);
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAwareScrollViewCompat
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.backBtn, { borderColor: colors.border }]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <BrandMark size={36} />
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.intro}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {isSignUp
              ? "Start your career journey in under a minute."
              : "Sign in to keep building your career path."}
          </Text>
        </View>

        {!configured ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Feather name="alert-circle" size={16} color={colors.mutedForeground} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable sign in.
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            testID="email"
          />
          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            testID="password"
          />

          {error ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          ) : null}
          {info ? (
            <Text style={[styles.info, { color: colors.accent }]}>{info}</Text>
          ) : null}

          <PrimaryButton
            label={isSignUp ? "Create account" : "Sign in"}
            onPress={submit}
            loading={submitting}
            disabled={!canSubmit}
            testID="submit"
          />

          <Pressable
            onPress={() => {
              setError(null);
              setInfo(null);
              setIsSignUp((v) => !v);
            }}
            style={styles.toggle}
          >
            <Text style={[styles.toggleText, { color: colors.mutedForeground }]}>
              {isSignUp ? "Already have an account? " : "New here? "}
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                {isSignUp ? "Sign in" : "Create one"}
              </Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
  autoComplete?: "email" | "current-password" | "new-password";
  testID?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        autoComplete={props.autoComplete}
        testID={props.testID}
        style={[
          styles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 22 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  intro: { gap: 6, marginTop: 8 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5 },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 21,
  },
  notice: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  noticeText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  error: { fontFamily: "Inter_500Medium", fontSize: 13 },
  info: { fontFamily: "Inter_500Medium", fontSize: 13 },
  toggle: { alignItems: "center", paddingVertical: 8 },
  toggleText: { fontFamily: "Inter_400Regular", fontSize: 14 },
});
