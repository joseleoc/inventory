import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { LabeledInputFieldMolecule } from "@/components/molecules/labeled-input-field-molecule";
import { ThemedText } from "@/components/themed-text";
import { t } from "@/config/i18n";
import { useThemeColor } from "@/hooks/use-theme-color";

export type CompoundIngredientDraft = {
  productId: string;
  sku: string;
  name: string;
  measurementUnit: "unit" | "mass" | "volume";
  quantityPerOutput: string;
};

type CompoundIngredientItemMoleculeProps = {
  ingredient: CompoundIngredientDraft;
  onChangeQuantity: (productId: string, value: string) => void;
  onRemove: (productId: string) => void;
  metaText?: string;
  quantityLabel?: string;
  quantityPlaceholder?: string;
  removeLabel?: string;
};

export function CompoundIngredientItemMolecule({
  ingredient,
  onChangeQuantity,
  onRemove,
  metaText,
  quantityLabel,
  quantityPlaceholder,
  removeLabel,
}: CompoundIngredientItemMoleculeProps) {
  const background = useThemeColor({}, "background");
  const cardBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);
  const muted = useMemo(() => (background === "#fff" ? "#506071" : "#AAB7C2"), [background]);

  return (
    <View style={[styles.card, { borderColor, backgroundColor: cardBackground }]}>
      <View style={styles.header}>
        <View style={styles.metaWrap}>
          <ThemedText type="defaultSemiBold">{ingredient.name}</ThemedText>
          <ThemedText style={[styles.meta, { color: muted }]}>
            {metaText ??
              t("addProduct.compound.ingredientMeta", {
                sku: ingredient.sku,
                unit: ingredient.measurementUnit,
              })}
          </ThemedText>
        </View>

        <Pressable onPress={() => onRemove(ingredient.productId)}>
          <ThemedText style={styles.removeText}>
            {removeLabel ?? t("addProduct.compound.removeIngredient")}
          </ThemedText>
        </Pressable>
      </View>

      <LabeledInputFieldMolecule
        label={quantityLabel ?? t("addProduct.compound.fields.quantityPerOutput")}
        value={ingredient.quantityPerOutput}
        onChangeText={(value) => onChangeQuantity(ingredient.productId, value)}
        keyboardType="number-pad"
        placeholder={quantityPlaceholder ?? t("addProduct.compound.placeholders.quantityPerOutput")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  metaWrap: {
    flex: 1,
    gap: 2,
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
  },
  removeText: {
    color: "#C5283D",
    fontSize: 13,
    fontWeight: "600",
  },
});
