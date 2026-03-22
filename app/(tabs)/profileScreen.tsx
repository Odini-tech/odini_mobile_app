import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import burgundyTheme from '../../src/theme/burgundyTheme';

interface Profile {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    fetchSessionAndProfile();
  }, []);

  const fetchSessionAndProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          // If profile doesn't exist, create one
          if (error.code === 'PGRST116') {
            await createProfile(session.user.id);
          } else {
            throw error;
          }
        } else {
          setProfile(data);
        }
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            username: session?.user?.email?.split('@')[0] || 'user',
            role: 'user',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error creating profile:', error);
      throw error;
    }
  };

  const router = useRouter();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (e) {
              console.warn('Sign out failed:', e);
            } finally {
              router.replace('/' as any);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={burgundyTheme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#FFF" />
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={16} color={burgundyTheme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.name}>
          {profile?.username || 'User'}
        </Text>
        <Text style={styles.email}>
          {session?.user?.email}
        </Text>
        
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {profile?.role === 'host' ? 'Host' : 'Traveler'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{profile?.username}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{session?.user?.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {formatDate(profile?.created_at || new Date().toISOString())}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Account Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Verified</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <View style={styles.actionIcon}>
            <Ionicons name="settings-outline" size={24} color={burgundyTheme.colors.primary} />
          </View>
          <Text style={styles.actionText}>Account Settings</Text>
          <Ionicons name="chevron-forward" size={20} color={burgundyTheme.colors.textSubtle} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <View style={styles.actionIcon}>
            <Ionicons name="card-outline" size={24} color={burgundyTheme.colors.primary} />
          </View>
          <Text style={styles.actionText}>Payment Methods</Text>
          <Ionicons name="chevron-forward" size={20} color={burgundyTheme.colors.textSubtle} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <View style={styles.actionIcon}>
            <Ionicons name="help-circle-outline" size={24} color={burgundyTheme.colors.primary} />
          </View>
          <Text style={styles.actionText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color={burgundyTheme.colors.textSubtle} />
        </TouchableOpacity>
      </View>


      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>Version 1.0.1</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: burgundyTheme.colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: burgundyTheme.colors.surface,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: burgundyTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: burgundyTheme.colors.surface,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: burgundyTheme.colors.background,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: burgundyTheme.colors.textMuted,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: burgundyTheme.colors.primaryTint,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: burgundyTheme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: burgundyTheme.colors.border,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: burgundyTheme.colors.textMuted,
    marginLeft: 12,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: burgundyTheme.colors.text,
  },
  statusBadge: {
    backgroundColor: '#E8F7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#2ECC71',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: burgundyTheme.colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: burgundyTheme.colors.text,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0D4DE',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: burgundyTheme.colors.danger,
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: burgundyTheme.colors.textSubtle,
    marginTop: 20,
    marginBottom: 40,
  },
});
