import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function BrandMark({ size = 36 }: { size?: number }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          backgroundColor: colors.primary,
          borderRadius: size / 4,
        },
      ]}
    >
      <Text
        style={{
          color: colors.primaryForeground,
          fontSize: size * 0.55,
          fontFamily: "Inter_700Bold",
        }}
      >
        S
      </Text>
    </View>
  );
}

export function BrandLockup() {
  const colors = useColors();
  return (
    <View style={styles.lockup}>
      <BrandMark size={32} />
      <Text style={[styles.wordmark, { color: colors.foreground }]}>Syncareer</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: "center",
    justifyContent: "center",
  },
  lockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wordmark: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
});
