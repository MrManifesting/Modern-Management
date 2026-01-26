import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme/colors';
import { useInventoryItem } from '../../src/hooks/useInventory';

function DetailRow({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isLoading, error } = useInventoryItem(Number(id));

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

  const stockStatus = item.quantity > 10 ? 'In Stock' : item.quantity > 0 ? 'Low Stock' : 'Out of Stock';
  const stockColor = item.quantity > 10 ? colors.success : item.quantity > 0 ? colors.warning : colors.error;

  return (
    <>
      <Stack.Screen options={{ title: item.name || 'Item Details' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.mainCard}>
          <View style={styles.header}>
            <View style={[styles.statusBadge, { backgroundColor: stockColor + '20' }]}>
              <Text style={[styles.statusText, { color: stockColor }]}>{stockStatus}</Text>
            </View>
          </View>
          
          <Text style={styles.itemName}>{item.name}</Text>
          
          {item.sku && (
            <Text style={styles.sku}>SKU: {item.sku}</Text>
          )}
          
          {item.description && (
            <Text style={styles.description}>{item.description}</Text>
          )}
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          <DetailRow label="Quantity" value={item.quantity} />
          <DetailRow label="Price" value={`$${(item.price || 0).toFixed(2)}`} valueColor={colors.primary} />
          {item.category && <DetailRow label="Category" value={item.category} />}
          {item.location && <DetailRow label="Location" value={item.location} />}
          {item.barcode && <DetailRow label="Barcode" value={item.barcode} />}
        </Card>

        {item.shopifyId && (
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Shopify Integration</Text>
            <DetailRow label="Shopify ID" value={item.shopifyId} />
            <DetailRow label="Sync Status" value="Connected" valueColor={colors.success} />
          </Card>
        )}

        <View style={styles.actions}>
          <Button title="Edit Item" onPress={() => {}} variant="primary" style={styles.actionButton} />
          <Button title="Adjust Quantity" onPress={() => {}} variant="outline" style={styles.actionButton} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.lg,
  },
  mainCard: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  itemName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sku: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  detailsCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
});
