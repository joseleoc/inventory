import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Camera, CameraView, type BarcodeScanningResult } from "expo-camera";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { FormFieldErrorAtom } from "@/components/atoms/form-field-error-atom";
import { FormFieldLabelAtom } from "@/components/atoms/form-field-label-atom";
import { ThemedText } from "@/components/themed-text";
import { t } from "@/config/i18n";
import { useThemeColor } from "@/hooks/use-theme-color";

type BarcodeScannerInputMoleculeProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  errorMessage?: string;
  disabled?: boolean;
} & Omit<TextInputProps, "value" | "onChangeText">;

export function BarcodeScannerInputMolecule({
  label,
  value,
  onChangeText,
  errorMessage,
  disabled,
  ...inputProps
}: BarcodeScannerInputMoleculeProps) {
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "undetermined">(
    "undetermined",
  );
  const [scanLocked, setScanLocked] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const textColor = useThemeColor({}, "text");
  const background = useThemeColor({}, "background");
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);
  const inputBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const accentColor = useMemo(() => "#0a7ea4", []);
  const placeholderColor = useMemo(() => "#7A7A7A", []);

  const handleScannerOpen = async () => {
    if (disabled) {
      return;
    }

    if (process.env.EXPO_OS === "web") {
      setScannerError(t("addProduct.scanner.nativeOnly"));
      return;
    }

    if (cameraPermission !== "granted") {
      const permission = await Camera.requestCameraPermissionsAsync();
      const granted = permission.status === "granted";
      setCameraPermission(granted ? "granted" : "denied");

      if (!granted) {
        setScannerError(t("addProduct.scanner.permissionDenied"));
        return;
      }
    }

    setScannerError(null);
    setIsScannerVisible(true);
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanLocked) {
      return;
    }

    const normalizedCode = result.data.trim();
    if (!normalizedCode) {
      return;
    }

    onChangeText(normalizedCode);
    setIsScannerVisible(false);
    setScanLocked(true);

    setTimeout(() => {
      setScanLocked(false);
    }, 700);
  };

  return (
    <View style={styles.root}>
      <FormFieldLabelAtom label={label} />

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: inputBackground,
            borderColor,
          },
        ]}>
        <TextInput
          {...inputProps}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          placeholderTextColor={placeholderColor}
          style={[styles.input, { color: textColor }]}
        />

        <Pressable
          onPress={() => void handleScannerOpen()}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t("addProduct.scanner.open")}
          style={({ pressed }) => [
            styles.scanButton,
            {
              backgroundColor: accentColor,
              opacity: pressed || disabled ? 0.8 : 1,
            },
          ]}>
          <MaterialIcons name="qr-code-scanner" size={18} color="#ffffff" />
        </Pressable>
      </View>

      <FormFieldErrorAtom message={errorMessage ?? scannerError ?? undefined} />

      {isScannerVisible ? (
        <View style={[styles.scannerWrap, { borderColor }]}>
          <CameraView
            style={styles.scanner}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
          />

          <Pressable
            onPress={() => setIsScannerVisible(false)}
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor: accentColor,
                opacity: pressed ? 0.82 : 1,
              },
            ]}>
            <ThemedText style={styles.closeButtonText}>{t("addProduct.scanner.close")}</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
  inputRow: {
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  scanButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    gap: 8,
  },
  scanner: {
    width: "100%",
    height: 230,
  },
  closeButton: {
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
