import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { UserProfile } from "./types";

export function ProfileModal({
  visible,
  user,
  onClose,
  onSave,
}: {
  visible: boolean;
  user: UserProfile;
  onClose: () => void;
  onSave: (profile: Pick<UserProfile, "displayName" | "currencyCode" | "timezone">) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [currencyCode, setCurrencyCode] = useState(user.currencyCode);
  const [timezone, setTimezone] = useState(user.timezone);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDisplayName(user.displayName);
    setCurrencyCode(user.currencyCode);
    setTimezone(user.timezone);
  }, [user]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      await onSave({ displayName: displayName.trim(), currencyCode: currencyCode.trim().toUpperCase(), timezone: timezone.trim() });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile & Account</Text>
            <Pressable accessibilityLabel="Close profile" onPress={onClose} style={styles.close}><Ionicons name="close" size={21} color="#F5F8FC" /></Pressable>
          </View>
          <Text style={styles.email}>{user.email}</Text>
          <Field label="DISPLAY NAME" value={displayName} onChangeText={setDisplayName} />
          <Field label="CURRENCY CODE" value={currencyCode} onChangeText={setCurrencyCode} autoCapitalize="characters" maxLength={3} />
          <Field label="TIME ZONE" value={timezone} onChangeText={setTimezone} autoCapitalize="none" />
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable disabled={busy} onPress={() => void save()} style={[styles.save, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color="#061321" /> : <Text style={styles.saveText}>Save profile</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} style={styles.input} placeholderTextColor="#8FA5BA" /></View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.65)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#061321", borderColor: "#183750", borderWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  title: { color: "#F5F8FC", fontSize: 20, fontWeight: "800" },
  close: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  email: { color: "#8FA5BA", fontSize: 13, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { color: "#8FA5BA", fontSize: 11, fontWeight: "800", marginBottom: 6 },
  input: { height: 47, color: "#F5F8FC", backgroundColor: "#0B1D30", borderColor: "#183750", borderWidth: 1, borderRadius: 11, paddingHorizontal: 13 },
  save: { height: 48, borderRadius: 12, backgroundColor: "#25D9C2", alignItems: "center", justifyContent: "center", marginTop: 6 },
  saveText: { color: "#061321", fontSize: 14, fontWeight: "900" },
  error: { color: "#FF647C", fontSize: 13, marginBottom: 8 },
  disabled: { opacity: 0.6 },
});