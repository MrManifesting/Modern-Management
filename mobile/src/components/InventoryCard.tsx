import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from './Card';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';

interface InventoryCardProps {
  item: {
    id: number;
    name: string;
    sku?: string;
    quantity: number;
    price?: number;
    category?: string;
  };
  onPress?: () => void;
}

export function InventoryCard({ item, onPress }: InventoryCardProps) {
  const stockStatus = item.quantity > 10 ? 'in_stock' : item.quantity > 0 ? 'low_stock' : 'out_of_stock';
  
  const statusColors = {
    in_stock: colors.success,
    low_stock: colors.warning,
    out_of_stock: colors.error,
  };

  const statusLabels = {
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[stockStatus] + '20' }]}>
            <Text style={[styles.statusText, { color: statusColors[stockStatus] }]}>
              {statusLabels[stockStatus]}
            </Text>
          </View>
        </View>
        
        {item.sku && (
          <Text style={styles.sku}>SKU: {item.sku}</Text>
        )}
        
        <View style={styles.footer}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Qty</Text>
            <Text style={styles.statValue}>{item.quantity}</Text>
          </View>
          
          {item.price !== undefined && (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Price</Text>
              <Text style={[styles.statValue, styles.price]}>${item.price.toFixed(2)}</Text>
            </View>
          )}
          
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  sku: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stat: {
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  price: {
    color: colors.primary,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    marginLeft: 'auto',
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
