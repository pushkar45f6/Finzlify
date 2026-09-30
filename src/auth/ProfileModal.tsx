import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/AppTheme";
import type { UserProfile } from "./types";

export function ProfileModal({
  visible,
  user,
  onClose,
  onSave,
  onChangePicture,
  onRemovePicture,
}: {
  visible: boolean;
  user: UserProfile;
  onClose: () => void;
  onSave: (profile: Pick<UserProfile, "displayName" | "currencyCode" | "timezone">) => Promise<void>;
  onChangePicture: (uri: string, mimeType: string | null) => Promise<void>;
  onRemovePicture: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [currencyCode, setCurrencyCode] = useState(user.currencyCode);
  const [timezone, setTimezone] = useState(user.timezone);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pictureBusy, setPictureBusy] = useState(false);

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

  async function choosePicture() {
    setPictureBusy(true);
    setError("");
    try {
      let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photo access needed", "Allow photo-library access in device settings to choose a profile picture. Your existing picture is unchanged.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (result.canceled) return;
      const asset = result.assets[0];
      await onChangePicture(asset.uri, asset.mimeType ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the profile picture.");
    } finally {
      setPictureBusy(false);
    }
  }

  function removePicture() {
    Alert.alert("Remove profile picture?", "Your initials will appear in the Home header and Profile.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => {
        setPictureBusy(true);
        void onRemovePicture().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to remove the profile picture."))
          .finally(() => setPictureBusy(false));
      } },
    ]);
  }

  const initials = user.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile & Account</Text>
            <Pressable accessibilityLabel="Close profile" onPress={onClose} style={styles.close}><Ionicons name="close" size={21} color="#F5F8FC" /></Pressable>
          </View>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              {user.profilePictureUri ? <Image source={{ uri: user.profilePictureUri }} style={styles.avatarImage} /> : initials ? <Text style={styles.avatarInitials}>{initials}</Text> : <Ionicons name="person" size={38} color={colors.cyan} />}
            </View>
            <View style={styles.avatarActions}>
              <Pressable disabled={pictureBusy} onPress={() => void choosePicture()} style={styles.pictureButton}>
                {pictureBusy ? <ActivityIndicator color={colors.text} /> : <Text style={styles.pictureButtonText}>{user.profilePictureUri ? "Change profile picture" : "Add profile picture"}</Text>}
              </Pressable>
              {!!user.profilePictureUri && <Pressable disabled={pictureBusy} onPress={removePicture}><Text style={styles.removePicture}>Remove picture</Text></Pressable>}
            </View>
          </View>
          <Text style={styles.email}>{user.email}</Text>
          <Field label="DISPLAY NAME" value={displayName} onChangeText={setDisplayName} />
          <View style={styles.readOnlyField}><Text style={styles.label}>CURRENCY / UNIT</Text><Text style={styles.readOnlyValue}>{currencyCode} · Change in Settings</Text></View>
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
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} style={styles.input} placeholderTextColor="#8FA5BA" /></View>;
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.65)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  close: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 14 },
  avatar: { width: 88, height: 88, borderRadius: 44, overflow: "hidden", backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitials: { color: colors.text, fontSize: 25, fontWeight: "800" },
  avatarActions: { flex: 1, alignItems: "flex-start", gap: 8 },
  pictureButton: { minHeight: 42, justifyContent: "center", paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.panel2 },
  pictureButtonText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  removePicture: { color: colors.red, fontSize: 12, fontWeight: "700", paddingVertical: 4 },
  email: { color: colors.muted, fontSize: 13, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "800", marginBottom: 6 },
  input: { height: 47, color: colors.text, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13 },
  readOnlyField: { marginBottom: 14 },
  readOnlyValue: { color: colors.text, backgroundColor: colors.panel2, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 14, overflow: "hidden" },
  save: { height: 48, borderRadius: 12, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center", marginTop: 6 },
  saveText: { color: colors.bg, fontSize: 14, fontWeight: "900" },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  disabled: { opacity: 0.6 },
  });
}