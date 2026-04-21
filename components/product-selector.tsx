import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { t } from "@/config/i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import { searchProducts, type ProductLookupItem } from "@/services/sales";
import { debounce } from "@/utils/debounce";

type ProductSelectorProps = {
  organizationId?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onSelectProduct: (product: ProductLookupItem) => void;
  refreshToken?: number;
  label?: string;
  placeholder?: string;
  actionLabel?: string;
  emptyMessage?: string;
  hideResultsWhenEmptyQuery?: boolean;
  actionDisabled?: boolean;
  inputAccessory?: ReactNode;
};

export function ProductSelector({
  organizationId,
  query,
  onQueryChange,
  onSelectProduct,
  refreshToken = 0,
  label = t("productSelector.defaultLabel"),
  placeholder = t("productSelector.defaultPlaceholder"),
  actionLabel = t("productSelector.defaultAction"),
  emptyMessage = t("productSelector.defaultEmpty"),
  hideResultsWhenEmptyQuery = true,
  actionDisabled = false,
  inputAccessory,
}: ProductSelectorProps) {
  const { width } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [results, setResults] = useState<ProductLookupItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const requestTokenRef = useRef(0);

  const background = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const muted = useMemo(() => (background === "#fff" ? "#3F4D5A" : "#C6D2DE"), [background]);
  const accentColor = useMemo(() => "#0a7ea4", []);
  const inputBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);

  const normalizedQuery = query.trim();
  const normalizedOrgId = organizationId?.trim() ?? "";
  const hasQuery = normalizedQuery.length > 0;
  const effectiveWidth = containerWidth ?? width;
  const isCompact = effectiveWidth <= 430;

  const debouncedSearch = useMemo(
    () =>
      debounce(async (orgId: string, term: string) => {
        const requestToken = requestTokenRef.current + 1;
        requestTokenRef.current = requestToken;
        setIsSearching(true);

        try {
          const nextResults = await searchProducts(orgId, term);
          if (requestTokenRef.current !== requestToken) {
            return;
          }

          setResults(nextResults);
          setSearchError(null);
        } catch (error) {
          if (requestTokenRef.current !== requestToken) {
            return;
          }

          setSearchError(error instanceof Error ? error.message : t("productSelector.searchError"));
        } finally {
          if (requestTokenRef.current === requestToken) {
            setIsSearching(false);
          }
        }
      }, 280),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  useEffect(() => {
    if (!normalizedOrgId || (!hasQuery && hideResultsWhenEmptyQuery)) {
      debouncedSearch.cancel();
      requestTokenRef.current += 1;
      setIsSearching(false);
      setResults([]);
      setSearchError(null);
      return;
    }

    debouncedSearch(normalizedOrgId, normalizedQuery);
  }, [
    debouncedSearch,
    hasQuery,
    hideResultsWhenEmptyQuery,
    normalizedOrgId,
    normalizedQuery,
    refreshToken,
  ]);

  return (
    <View
      style={styles.section}
      onLayout={(event) => {
        const nextWidth = Math.round(event.nativeEvent.layout.width);
        setContainerWidth((currentWidth) =>
          currentWidth === nextWidth ? currentWidth : nextWidth,
        );
      }}>
      <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
        {label}
      </ThemedText>

      <View style={[styles.inputRow, isCompact && styles.inputRowCompact]}>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder={placeholder}
          placeholderTextColor={muted}
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            styles.searchInput,
            isCompact && styles.searchInputCompact,
            { color: textColor, backgroundColor: inputBackground, borderColor },
          ]}
        />

        {inputAccessory ? (
          <View style={[styles.inputAccessoryWrap, isCompact && styles.inputAccessoryWrapCompact]}>
            {inputAccessory}
          </View>
        ) : null}
      </View>

      {searchError ? <ThemedText style={styles.errorText}>{searchError}</ThemedText> : null}
      {hasQuery && isSearching ? <ActivityIndicator size="small" /> : null}

      {(!hideResultsWhenEmptyQuery || hasQuery) && !searchError ? (
        <View style={styles.lookupResults}>
          {results.map((product) => (
            <View
              key={product.id}
              style={[
                styles.resultCard,
                isCompact && styles.resultCardCompact,
                { backgroundColor: inputBackground, borderColor },
              ]}>
              <View style={[styles.resultMeta, isCompact && styles.resultMetaCompact]}>
                <ThemedText type="defaultSemiBold" selectable numberOfLines={2}>
                  {product.name}
                </ThemedText>
                <ThemedText
                  selectable
                  style={[styles.resultAuxText, { color: muted }]}
                  numberOfLines={2}>
                  {t("productSelector.lineSkuBarcode", {
                    sku: product.sku,
                    barcode: product.barcode
                      ? t("productSelector.barcodeSuffix", { barcode: product.barcode })
                      : "",
                  })}
                </ThemedText>
                <ThemedText
                  selectable
                  style={[styles.resultAuxText, { color: muted }]}
                  numberOfLines={2}>
                  {t("productSelector.lineStockPrice", {
                    stock: product.currentStock,
                    price: product.unitPrice.toFixed(2),
                  })}
                </ThemedText>
              </View>

              <Pressable
                onPress={() => onSelectProduct(product)}
                disabled={actionDisabled}
                style={({ pressed }) => [
                  styles.actionButton,
                  isCompact && styles.actionButtonCompact,
                  {
                    backgroundColor: accentColor,
                    opacity: pressed || actionDisabled ? 0.82 : 1,
                  },
                ]}>
                <ThemedText style={styles.actionButtonText}>{actionLabel}</ThemedText>
              </Pressable>
            </View>
          ))}

          {!isSearching && results.length === 0 ? (
            <View style={[styles.noticeCard, { backgroundColor: inputBackground, borderColor }]}>
              <ThemedText selectable>{emptyMessage}</ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputRowCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  inputAccessoryWrap: {
    flexShrink: 0,
  },
  inputAccessoryWrapCompact: {
    width: "100%",
    alignItems: "stretch",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
  },
  searchInputCompact: {
    width: "100%",
  },
  lookupResults: {
    gap: 10,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultCardCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  resultMeta: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  resultAuxText: {
    fontSize: 15,
    lineHeight: 21,
  },
  resultMetaCompact: {
    width: "100%",
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 72,
    alignItems: "center",
  },
  actionButtonCompact: {
    width: "100%",
    minHeight: 44,
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  noticeCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  errorText: {
    color: "#C5283D",
    fontSize: 14,
    lineHeight: 20,
  },
});
