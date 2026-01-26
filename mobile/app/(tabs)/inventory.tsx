import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { InventoryCard } from '../../src/components/InventoryCard';
import { Button } from '../../src/components/Button';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme/colors';
import { useInventoryItems } from '../../src/hooks/useInventory';

export default function InventoryScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: inventory, isLoading, refetch, error } = useInventoryItems();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    if (!searchQuery.trim()) return inventory;
    
    const query = searchQuery.toLowerCase();
    return inventory.filter(item =>
      item.name?.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    );
  }, [inventory, searchQuery]);

  const handleItemPress = (item: any) => {
    router.push(`/inventory/${item.id}`);
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load inventory</Text>
        <Button title="Retry" onPress={() => refetch()} variant="outline" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Button title="+ Add" onPress={() => {}} size="md" />
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredInventory.length} items
          {searchQuery && ` matching "${searchQuery}"`}
        </Text>
      </View>

      <FlatList
        data={filteredInventory}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <InventoryCard item={item} onPress={() => handleItemPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <Text style={styles.emptyText}>Loading inventory...</Text>
            ) : (
              <>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyText}>No items found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Try a different search term' : 'Add your first inventory item'}
                </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchContainer: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  statsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
    textAlign: 'center',
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
