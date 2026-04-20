import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
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
  label = "Search by name, SKU, or barcode",
  placeholder = "Type name, SKU, or barcode",
  actionLabel = "Select",
  emptyMessage = "No products found for this search.",
  hideResultsWhenEmptyQuery = true,
  actionDisabled = false,
  inputAccessory,
}: ProductSelectorProps) {
  const [results, setResults] = useState<ProductLookupItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const requestTokenRef = useRef(0);

  const background = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const muted = useMemo(() => "#6D7782", []);
  const accentColor = useMemo(() => "#0a7ea4", []);
  const inputBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);

  const normalizedQuery = query.trim();
  const normalizedOrgId = organizationId?.trim() ?? "";
  const hasQuery = normalizedQuery.length > 0;

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

          setSearchError(error instanceof Error ? error.message : "Unable to search products.");
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
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
        {label}
      </ThemedText>

      <View style={styles.inputRow}>
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
            { color: textColor, backgroundColor: inputBackground, borderColor },
          ]}
        />

        {inputAccessory}
      </View>

      {searchError ? <ThemedText style={styles.errorText}>{searchError}</ThemedText> : null}
      {hasQuery && isSearching ? <ActivityIndicator size="small" /> : null}

      {(!hideResultsWhenEmptyQuery || hasQuery) && !searchError ? (
        <View style={styles.lookupResults}>
          {results.map((product) => (
            <View
              key={product.id}
              style={[styles.resultCard, { backgroundColor: inputBackground, borderColor }]}>
              <View style={styles.resultMeta}>
                <ThemedText type="defaultSemiBold" selectable>
                  {product.name}
                </ThemedText>
                <ThemedText selectable style={{ color: muted }}>
                  SKU: {product.sku}
                  {product.barcode ? ` · Barcode: ${product.barcode}` : ""}
                </ThemedText>
                <ThemedText selectable style={{ color: muted }}>
                  Stock: {product.currentStock} · Price: ${product.unitPrice.toFixed(2)}
                </ThemedText>
              </View>

              <Pressable
                onPress={() => onSelectProduct(product)}
                disabled={actionDisabled}
                style={({ pressed }) => [
                  styles.actionButton,
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
    fontSize: 14,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  resultMeta: {
    flex: 1,
    gap: 3,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 72,
    alignItems: "center",
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
    fontSize: 13,
  },
});
