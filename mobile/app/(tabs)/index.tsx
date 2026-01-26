import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { Card } from '../../src/components/Card';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme/colors';
import { useInventoryItems } from '../../src/hooks/useInventory';

function StatCard({ title, value, subtitle, color = colors.primary }: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </Card>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data: inventory, isLoading, refetch } = useInventoryItems();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const stats = {
    totalItems: inventory?.length || 0,
    totalValue: inventory?.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0) || 0,
    lowStock: inventory?.filter(item => item.quantity > 0 && item.quantity <= 10).length || 0,
    outOfStock: inventory?.filter(item => item.quantity === 0).length || 0,
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.title}>Gold Standard</Text>
        <Text style={styles.subtitle}>Inventory Management</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Total Items"
          value={stats.totalItems}
          subtitle="In inventory"
        />
        <StatCard
          title="Total Value"
          value={`$${stats.totalValue.toLocaleString()}`}
          subtitle="Inventory worth"
          color={colors.success}
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStock}
          subtitle="Need attention"
          color={colors.warning}
        />
        <StatCard
          title="Out of Stock"
          value={stats.outOfStock}
          subtitle="Urgent"
          color={colors.error}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Card style={styles.actionCard}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>Add Item</Text>
          </Card>
          <Card style={styles.actionCard}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>Reports</Text>
          </Card>
          <Card style={styles.actionCard}>
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={styles.actionText}>Sync</Text>
          </Card>
          <Card style={styles.actionCard}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionText}>Scan</Text>
          </Card>
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      )}
    </ScrollView>
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
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
  },
  statTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  statSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  actionText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
