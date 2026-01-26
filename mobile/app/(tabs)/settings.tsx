import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Card } from '../../src/components/Card';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme/colors';

function SettingItem({ 
  title, 
  subtitle, 
  icon, 
  onPress, 
  showSwitch = false, 
  switchValue = false, 
  onSwitchChange 
}: {
  title: string;
  subtitle?: string;
  icon: string;
  onPress?: () => void;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={showSwitch} activeOpacity={0.7}>
      <View style={styles.settingItem}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {showSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: colors.border, true: colors.primary + '60' }}
            thumbColor={switchValue ? colors.primary : colors.textMuted}
          />
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Card>
          <SettingItem
            icon="👤"
            title="Profile"
            subtitle="Manage your account details"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="🔐"
            title="Security"
            subtitle="Password and authentication"
            onPress={() => {}}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integrations</Text>
        <Card>
          <SettingItem
            icon="🛒"
            title="Shopify"
            subtitle="Connected"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="📊"
            title="Google Sheets"
            subtitle="Configure reports"
            onPress={() => {}}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <Card>
          <SettingItem
            icon="🔔"
            title="Notifications"
            subtitle="Low stock alerts, order updates"
            showSwitch
            switchValue={notifications}
            onSwitchChange={setNotifications}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="🌙"
            title="Dark Mode"
            subtitle="Use dark theme"
            showSwitch
            switchValue={darkMode}
            onSwitchChange={setDarkMode}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="🔄"
            title="Auto Sync"
            subtitle="Sync inventory automatically"
            showSwitch
            switchValue={autoSync}
            onSwitchChange={setAutoSync}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <Card>
          <SettingItem
            icon="❓"
            title="Help Center"
            subtitle="FAQs and documentation"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="💬"
            title="Contact Support"
            subtitle="Get help from our team"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="📱"
            title="About"
            subtitle="Version 1.0.0"
            onPress={() => {}}
          />
        </Card>
      </View>

      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  settingSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 44,
  },
  logoutButton: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  logoutText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
