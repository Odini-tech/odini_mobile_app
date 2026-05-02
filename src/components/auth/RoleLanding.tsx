import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { doctorTheme, patientTheme } from '../../theme/appModeTheme';

type RoleLandingProps = {
  onSelectDoctor: () => void;
  onSelectPatient: () => void;
};

export default function RoleLanding({ onSelectDoctor, onSelectPatient }: RoleLandingProps) {
  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>ODINI</Text>
        <Text style={styles.title}>Choose how you want to enter</Text>
        <Text style={styles.subtitle}>
          Start with the side that fits you best, then sign in or create an account from there.
        </Text>
      </View>

      <View style={styles.grid}>
        <Pressable style={[styles.card, styles.patientCard]} onPress={onSelectPatient}>
          <View style={[styles.iconWrap, styles.patientIconWrap]}>
            <Ionicons name="person-outline" size={30} color={patientTheme.colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: patientTheme.colors.text }]}>Patient Side</Text>
          <Text style={[styles.cardText, { color: patientTheme.colors.textMuted }]}>
            Explore care, bookings, and support with a calm white-and-blue feel.
          </Text>
          <View style={[styles.ctaPill, { backgroundColor: patientTheme.colors.primary }]}>
            <Text style={styles.ctaText}>Continue as Patient</Text>
          </View>
        </Pressable>

        <Pressable style={[styles.card, styles.doctorCard]} onPress={onSelectDoctor}>
          <View style={[styles.iconWrap, styles.doctorIconWrap]}>
            <Ionicons name="medkit-outline" size={30} color={doctorTheme.colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: doctorTheme.colors.text }]}>Doctor Side</Text>
          <Text style={[styles.cardText, { color: doctorTheme.colors.textMuted }]}>
            Work from the professional side with a clean white-and-green experience.
          </Text>
          <View style={[styles.ctaPill, { backgroundColor: doctorTheme.colors.primary }]}>
            <Text style={styles.ctaText}>Continue as Doctor</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 56,
    paddingBottom: 32,
  },
  hero: {
    marginBottom: 28,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#7C93AE',
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6A7F97',
    maxWidth: 420,
  },
  grid: {
    gap: 16,
  },
  card: {
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
  },
  patientCard: {
    backgroundColor: patientTheme.colors.surfaceAlt,
    borderColor: patientTheme.colors.border,
  },
  doctorCard: {
    backgroundColor: doctorTheme.colors.surfaceAlt,
    borderColor: doctorTheme.colors.border,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  patientIconWrap: {
    backgroundColor: patientTheme.colors.primaryTint,
  },
  doctorIconWrap: {
    backgroundColor: doctorTheme.colors.primaryTint,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
