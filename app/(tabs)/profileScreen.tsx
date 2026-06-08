import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAppMode } from '../../src/context/AppModeContext';
import { useBottomNavScroll } from '../../src/context/BottomNavVisibilityContext';
import { CURRENCIES, useCurrency } from '../../src/context/CurrencyContext';

interface Profile {
  id: string;
  username: string | null;
  role: string | null;
  created_at: string;
  firstname: string | null;
  middlename: string | null;
  lastname: string | null;
  location: string | null;
  gender: string | null;
  phone_number: string | null;
  DOB: string | null;
}

type EditForm = {
  firstname: string;
  middlename: string;
  lastname: string;
  username: string;
  phone_number: string;
  location: string;
  DOB: string;
  gender: string;
};

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

function getInitials(profile: Profile | null, email?: string): string {
  if (profile?.firstname && profile?.lastname) {
    return `${profile.firstname[0]}${profile.lastname[0]}`.toUpperCase();
  }
  if (profile?.firstname) return profile.firstname[0].toUpperCase();
  if (profile?.username) return profile.username[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return 'U';
}

function getDisplayName(profile: Profile | null, email?: string): string {
  if (profile?.firstname && profile?.lastname) {
    return `${profile.firstname} ${profile.lastname}`;
  }
  if (profile?.firstname) return profile.firstname;
  if (profile?.username) return profile.username;
  return email?.split('@')[0] || 'User';
}

function formatDOB(dob: string | null): string {
  if (!dob) return '—';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return dob;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [currencyVisible, setCurrencyVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    firstname: '',
    middlename: '',
    lastname: '',
    username: '',
    phone_number: '',
    location: '',
    DOB: '',
    gender: '',
  });

  const bottomNavScroll = useBottomNavScroll();
  const router = useRouter();
  const { clearMode, theme, colorScheme, setColorScheme } = useAppMode();
  const { selectedCurrency, setCurrency } = useCurrency();
  const styles = getStyles(theme);
  const isDark = colorScheme === 'dark';

  const fetchSessionAndProfile = useCallback(async () => {
    try {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      setSession(s);
      if (!s?.user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', s.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: created } = await supabase
            .from('profiles')
            .insert([{
              id: s.user.id,
              username: s.user.email?.split('@')[0] || 'user',
              role: 'user',
            }])
            .select()
            .single();
          setProfile(created);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessionAndProfile();
  }, [fetchSessionAndProfile]);

  const openEdit = () => {
    setEditForm({
      firstname: profile?.firstname || '',
      middlename: profile?.middlename || '',
      lastname: profile?.lastname || '',
      username: profile?.username || '',
      phone_number: profile?.phone_number || '',
      location: profile?.location || '',
      DOB: profile?.DOB || '',
      gender: profile?.gender || '',
    });
    setEditVisible(true);
  };

  const saveProfile = async () => {
    if (!session?.user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          firstname: editForm.firstname || null,
          middlename: editForm.middlename || null,
          lastname: editForm.lastname || null,
          username: editForm.username || null,
          phone_number: editForm.phone_number || null,
          location: editForm.location || null,
          DOB: editForm.DOB || null,
          gender: editForm.gender || null,
        })
        .eq('id', session.user.id);

      if (error) throw error;
      await fetchSessionAndProfile();
      setEditVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearMode();
            await supabase.auth.signOut();
          } catch (e) {
            console.warn('Sign out failed:', e);
          } finally {
            router.replace('/' as any);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const initials = getInitials(profile, session?.user?.email);
  const displayName = getDisplayName(profile, session?.user?.email);

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        {...bottomNavScroll}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.email}>{session?.user?.email}</Text>
          {profile?.role ? (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{profile.role}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Personal Information ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
              <Ionicons name="pencil" size={13} color={theme.colors.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <InfoRow
              icon="person-outline"
              label="First Name"
              value={profile?.firstname}
              theme={theme}
            />
            <InfoRow
              icon="person-outline"
              label="Last Name"
              value={profile?.lastname}
              theme={theme}
            />
            <InfoRow
              icon="at-outline"
              label="Username"
              value={profile?.username}
              theme={theme}
            />
            <InfoRow
              icon="call-outline"
              label="Phone"
              value={profile?.phone_number}
              theme={theme}
            />
            <InfoRow
              icon="location-outline"
              label="Location"
              value={profile?.location}
              theme={theme}
            />
            <InfoRow
              icon="calendar-outline"
              label="Date of Birth"
              value={formatDOB(profile?.DOB ?? null)}
              theme={theme}
            />
            <InfoRow
              icon="male-female-outline"
              label="Gender"
              value={
                profile?.gender
                  ? GENDER_OPTIONS.find((g) => g.value === profile.gender)?.label ?? profile.gender
                  : undefined
              }
              theme={theme}
              last
            />
          </View>
        </View>

        {/* ── Preferences ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <View style={[styles.prefRow, styles.prefRowBorder]}>
              <View style={styles.prefLeft}>
                <View style={styles.prefIconWrap}>
                  <Ionicons
                    name={isDark ? 'moon' : 'sunny-outline'}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View>
                  <Text style={styles.prefLabel}>Theme</Text>
                  <Text style={styles.prefSub}>{isDark ? 'Dark mode' : 'Light mode'}</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={(val) => setColorScheme(val ? 'dark' : 'light')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }}
                thumbColor={theme.colors.white}
              />
            </View>

            <TouchableOpacity style={styles.prefRow} onPress={() => setCurrencyVisible(true)}>
              <View style={styles.prefLeft}>
                <View style={styles.prefIconWrap}>
                  <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.prefLabel}>Currency</Text>
                  <Text style={styles.prefSub}>
                    {selectedCurrency.flag} {selectedCurrency.name} ({selectedCurrency.symbol})
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Account ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={[styles.prefRow, styles.prefRowBorder]}>
              <View style={styles.prefLeft}>
                <View style={styles.prefIconWrap}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.prefTextWrap}>
                  <Text style={styles.prefLabel}>Email</Text>
                  <Text style={styles.prefSub} numberOfLines={1}>
                    {session?.user?.email}
                  </Text>
                </View>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            <View style={styles.prefRow}>
              <View style={styles.prefLeft}>
                <View style={styles.prefIconWrap}>
                  <Ionicons name="calendar-number-outline" size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.prefLabel}>Member Since</Text>
                  <Text style={styles.prefSub}>
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })
                      : '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Sign Out ── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Version 1.0.1</Text>
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity onPress={() => setEditVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={saveProfile} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <EditField
              label="First Name"
              value={editForm.firstname}
              onChangeText={(v) => setEditForm((f) => ({ ...f, firstname: v }))}
              placeholder="Enter first name"
              theme={theme}
            />
            <EditField
              label="Middle Name"
              value={editForm.middlename}
              onChangeText={(v) => setEditForm((f) => ({ ...f, middlename: v }))}
              placeholder="Enter middle name"
              theme={theme}
            />
            <EditField
              label="Last Name"
              value={editForm.lastname}
              onChangeText={(v) => setEditForm((f) => ({ ...f, lastname: v }))}
              placeholder="Enter last name"
              theme={theme}
            />
            <EditField
              label="Username"
              value={editForm.username}
              onChangeText={(v) => setEditForm((f) => ({ ...f, username: v }))}
              placeholder="Enter username"
              theme={theme}
              autoCapitalize="none"
            />
            <EditField
              label="Phone Number"
              value={editForm.phone_number}
              onChangeText={(v) => setEditForm((f) => ({ ...f, phone_number: v }))}
              placeholder="+1 234 567 8901"
              theme={theme}
              keyboardType="phone-pad"
            />
            <EditField
              label="Location"
              value={editForm.location}
              onChangeText={(v) => setEditForm((f) => ({ ...f, location: v }))}
              placeholder="City, Country"
              theme={theme}
            />
            <EditField
              label="Date of Birth (YYYY-MM-DD)"
              value={editForm.DOB}
              onChangeText={(v) => setEditForm((f) => ({ ...f, DOB: v }))}
              placeholder="1990-01-31"
              theme={theme}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />

            <View style={{ marginBottom: 24 }}>
              <Text style={styles.editFieldLabel}>Gender</Text>
              <View style={styles.genderOptions}>
                {GENDER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.genderOption,
                      editForm.gender === opt.value && styles.genderOptionSelected,
                    ]}
                    onPress={() => setEditForm((f) => ({ ...f, gender: opt.value }))}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        editForm.gender === opt.value && styles.genderOptionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Currency Picker Modal ── */}
      <Modal
        visible={currencyVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCurrencyVisible(false)}
      >
        <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity onPress={() => setCurrencyVisible(false)}>
            <Text style={styles.modalCancel}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Currency</Text>
          <View style={{ width: 48 }} />
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={[
                styles.currencyRow,
                selectedCurrency.code === c.code && styles.currencyRowSelected,
              ]}
              onPress={() => {
                setCurrency(c.code);
                setCurrencyVisible(false);
              }}
            >
              <Text style={styles.currencyFlag}>{c.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.currencyName,
                    selectedCurrency.code === c.code && styles.currencyNameSelected,
                  ]}
                >
                  {c.name}
                </Text>
                <Text style={styles.currencyCode}>
                  {c.code} · {c.symbol}
                </Text>
              </View>
              {selectedCurrency.code === c.code && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>
    </>
  );
}

// ── Sub-components ──

function InfoRow({
  icon,
  label,
  value,
  theme,
  last,
}: {
  icon: string;
  label: string;
  value?: string | null;
  theme: any;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Ionicons name={icon as any} size={18} color={theme.colors.textMuted} />
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          color: theme.colors.textMuted,
          marginLeft: 12,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: value ? theme.colors.text : theme.colors.textSubtle,
          maxWidth: 160,
          textAlign: 'right',
        }}
      >
        {value || '—'}
      </Text>
    </View>
  );
}

function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  theme,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  theme: any;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: theme.colors.textMuted,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: 10,
          padding: 14,
          fontSize: 16,
          color: theme.colors.text,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSubtle}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
    </View>
  );
}

// ── Styles ──

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },

    // Header
    header: {
      alignItems: 'center',
      paddingTop: 48,
      paddingBottom: 32,
      paddingHorizontal: 20,
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      marginBottom: 24,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarText: {
      fontSize: 36,
      fontWeight: '700',
      color: theme.colors.white,
    },
    displayName: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    email: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginBottom: 10,
    },
    roleBadge: {
      backgroundColor: theme.colors.primaryTint,
      paddingHorizontal: 16,
      paddingVertical: 5,
      borderRadius: 20,
    },
    roleBadgeText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'capitalize',
    },

    // Section
    section: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.primaryTint,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    editBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primary,
    },

    // Card
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },

    // Pref rows
    prefRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    prefRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    prefLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    prefTextWrap: {
      flex: 1,
    },
    prefIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: theme.colors.primaryTint,
      justifyContent: 'center',
      alignItems: 'center',
    },
    prefLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.text,
    },
    prefSub: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },

    // Badges
    verifiedBadge: {
      backgroundColor: 'rgba(22, 163, 74, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    verifiedText: {
      color: theme.colors.success,
      fontSize: 12,
      fontWeight: '600',
    },

    // Sign out
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    signOutText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.danger,
      marginLeft: 8,
    },
    versionText: {
      textAlign: 'center',
      fontSize: 12,
      color: theme.colors.textSubtle,
      marginTop: 8,
      marginBottom: 48,
    },

    // Modal shared
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
    },
    modalCancel: {
      fontSize: 16,
      color: theme.colors.textMuted,
      minWidth: 48,
    },
    modalSave: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary,
      minWidth: 48,
      textAlign: 'right',
    },
    modalBody: {
      padding: 20,
      paddingBottom: 60,
    },

    // Edit form – gender
    editFieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    genderOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    genderOption: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    genderOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryTint,
    },
    genderOptionText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    genderOptionTextSelected: {
      color: theme.colors.primary,
      fontWeight: '600',
    },

    // Currency picker
    currencyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    currencyRowSelected: {
      backgroundColor: theme.colors.primaryTint,
    },
    currencyFlag: {
      fontSize: 26,
    },
    currencyName: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.text,
    },
    currencyNameSelected: {
      color: theme.colors.primary,
    },
    currencyCode: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
  });
