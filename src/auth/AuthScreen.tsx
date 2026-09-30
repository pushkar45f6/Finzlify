import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../api/client";
import { useAuth } from "./AuthProvider";

type AuthMode = "login" | "register" | "request-reset" | "confirm-reset";

export function AuthScreen({ initialResetToken, onResetComplete }: { initialResetToken: string | null; onResetComplete: () => void }) {
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialResetToken ? "confirm-reset" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialResetToken) setMode("confirm-reset");
  }, [initialResetToken]);

  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "register") await register(email.trim(), password, name.trim());
      if (mode === "login") await signIn(email.trim(), password);
      if (mode === "request-reset") {
        const result = await api.requestPasswordReset(email.trim());
        setMessage(result.message);
      }
      if (mode === "confirm-reset" && initialResetToken) {
        await api.confirmPasswordReset(initialResetToken, newPassword);
        setPassword("");
        setNewPassword("");
        setMode("login");
        setMessage("Password updated. Sign in with your new password.");
        onResetComplete();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete the request.");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(next: AuthMode) {
    setMode(next);
    setMessage("");
    setError("");
  }

  const title = mode === "register" ? "Create your account" : mode === "request-reset" ? "Reset password" : mode === "confirm-reset" ? "Choose a new password" : "Welcome back";
  const canSubmit = !busy && (mode !== "register" || name.trim().length > 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "right", "bottom", "left"]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMark}><Text style={styles.brandGlyph}>₹</Text></View>
          <Text style={styles.eyebrow}>STUDENT FINANCE</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{mode === "confirm-reset" ? "Reset links are single-use and expire after 30 minutes." : "Your financial dashboard, securely yours."}</Text>

          <View style={styles.form}>
            {mode === "register" && <Field label="NAME" value={name} onChangeText={setName} autoCapitalize="words" />}
            {mode !== "confirm-reset" && <Field label="EMAIL" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />}
            {(mode === "login" || mode === "register") && <Field label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "register" ? "new-password" : "current-password"} />}
            {mode === "confirm-reset" && <Field label="NEW PASSWORD" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" />}

            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {!!message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}

            <Pressable disabled={!canSubmit} onPress={() => void submit()} style={[styles.primaryButton, !canSubmit && styles.disabled]}>
              {busy ? <ActivityIndicator color="#061321" /> : <Text style={styles.primaryText}>{mode === "register" ? "Create account" : mode === "request-reset" ? "Send reset request" : mode === "confirm-reset" ? "Update password" : "Sign in"}</Text>}
            </Pressable>

            {mode === "login" && <Pressable onPress={() => changeMode("request-reset")} style={styles.linkButton}><Text style={styles.link}>Forgot password?</Text></Pressable>}
          </View>

          {mode !== "confirm-reset" && (
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{mode === "register" ? "Already registered?" : "New to Student Finance?"}</Text>
              <Pressable onPress={() => changeMode(mode === "register" ? "login" : "register")}>
                <Text style={styles.link}>{mode === "register" ? "Sign in" : "Create account"}</Text>
              </Pressable>
            </View>
          )}
          {(mode === "request-reset" || mode === "confirm-reset") && (
            <Pressable onPress={() => changeMode("login")} style={styles.linkButton}><Text style={styles.link}>Back to sign in</Text></Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...inputProps} autoCorrect={false} placeholderTextColor="#758BA0" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#061321" },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, paddingBottom: 40 },
  brandMark: { width: 54, height: 54, borderRadius: 16, backgroundColor: "#25D9C2", alignItems: "center", justifyContent: "center", marginBottom: 22 },
  brandGlyph: { color: "#061321", fontSize: 30, fontWeight: "900" },
  eyebrow: { color: "#25D9C2", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: "#F5F8FC", fontSize: 28, fontWeight: "800", marginTop: 7 },
  subtitle: { color: "#8FA5BA", fontSize: 14, lineHeight: 21, marginTop: 7 },
  form: { marginTop: 28 },
  field: { marginBottom: 16 },
  fieldLabel: { color: "#8FA5BA", fontSize: 11, fontWeight: "800", marginBottom: 7 },
  input: { height: 50, color: "#F5F8FC", backgroundColor: "#0B1D30", borderColor: "#183750", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  primaryButton: { height: 50, borderRadius: 12, backgroundColor: "#25D9C2", alignItems: "center", justifyContent: "center", marginTop: 5 },
  primaryText: { color: "#061321", fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  linkButton: { alignSelf: "center", paddingVertical: 14 },
  link: { color: "#25D9C2", fontSize: 13, fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 24 },
  switchText: { color: "#8FA5BA", fontSize: 13 },
  error: { color: "#FF647C", fontSize: 13, lineHeight: 18, marginBottom: 13 },
  message: { color: "#25D9C2", fontSize: 13, lineHeight: 18, marginBottom: 13 },
});