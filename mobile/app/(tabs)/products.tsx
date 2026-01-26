import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../src/components/Card';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme/colors';
import { productsApi } from '../../src/services/api';

export default function ProductsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.getProducts,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <View style={styles.container}>
      <FlatList
        data={products || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.productCard}>
            <View style={styles.productHeader}>
              <Text style={styles.productName} numberOfLines={1}>{item.title || item.name}</Text>
              {item.shopifyId && (
                <View style={styles.syncBadge}>
                  <Text style={styles.syncText}>Synced</Text>
                </View>
              )}
            </View>
            <Text style={styles.productDescription} numberOfLines={2}>
              {item.description || 'No description'}
            </Text>
            <View style={styles.productFooter}>
              <Text style={styles.productPrice}>
                ${(item.price || 0).toFixed(2)}
              </Text>
              {item.vendor && (
                <Text style={styles.productVendor}>{item.vendor}</Text>
              )}
            </View>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <Text style={styles.emptyText}>Loading products...</Text>
            ) : (
              <>
                <Text style={styles.emptyIcon}>🏷️</Text>
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>Products synced from Shopify will appear here</Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  productCard: {
    marginBottom: spacing.sm,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  productName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  syncBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  syncText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: '500',
  },
  productDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  productVendor: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
