import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import burgundyTheme from '../../src/theme/burgundyTheme';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    username?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignUp && !username) {
      newErrors.username = 'Username is required';
    } else if (isSignUp && username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      if (isSignUp) {
        // Sign up flow
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          // Create profile in profiles table
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                username: username,
                role: 'user', // Default role
              },
            ]);

          if (profileError) {
            // If profile creation fails, we might want to handle this
            console.error('Profile creation error:', profileError);
            // Don't throw - the user is still signed up, they can complete profile later
          }

          Alert.alert(
            'Success!',
            'Account created successfully. Please check your email for verification if required.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Sign in flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Handle specific error cases
      if (error.message.includes('Email not confirmed')) {
        Alert.alert(
          'Email Not Verified',
          'Please check your email and click the verification link.',
          [{ text: 'OK' }]
        );
      } else if (error.message.includes('Invalid login credentials')) {
        Alert.alert(
          'Invalid Credentials',
          'Please check your email and password.',
          [{ text: 'OK' }]
        );
      } else if (error.message.includes('User already registered')) {
        Alert.alert(
          'Account Exists',
          'An account with this email already exists. Please sign in instead.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          error.message || 'An error occurred. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setErrors({});
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons
              name="home-outline"
              size={60}
              color={burgundyTheme.colors.primary}
              style={styles.logo}
            />
          </View>
          <Text style={styles.title}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp 
              ? 'Sign up to start your journey' 
              : 'Sign in to your account'
            }
          </Text>
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <View style={[
                styles.inputWrapper,
                errors.username && styles.inputError
              ]}>
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color="#666" 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Choose a username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              {errors.username && (
                <Text style={styles.errorText}>{errors.username}</Text>
              )}
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[
              styles.inputWrapper,
              errors.email && styles.inputError
            ]}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color="#666" 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={[
              styles.inputWrapper,
              errors.password && styles.inputError
            ]}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color="#666" 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.authButtonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={toggleAuthMode}
            disabled={loading}
          >
            <Text style={styles.toggleButtonText}>
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"
              }
            </Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: burgundyTheme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBadge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: burgundyTheme.colors.primaryTint,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.primaryTintStrong,
    marginBottom: 20,
  },
  logo: {
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: burgundyTheme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: burgundyTheme.colors.textMuted,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    backgroundColor: burgundyTheme.colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    ...burgundyTheme.shadow,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: burgundyTheme.colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: burgundyTheme.colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: burgundyTheme.colors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: burgundyTheme.colors.danger,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: burgundyTheme.colors.text,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    color: burgundyTheme.colors.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  authButton: {
    backgroundColor: burgundyTheme.colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: burgundyTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: burgundyTheme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: burgundyTheme.colors.border,
  },
  dividerText: {
    paddingHorizontal: 16,
    color: burgundyTheme.colors.textSubtle,
    fontSize: 14,
  },
  toggleButton: {
    paddingVertical: 16,
  },
  toggleButtonText: {
    color: burgundyTheme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  termsText: {
    fontSize: 12,
    color: burgundyTheme.colors.textSubtle,
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 18,
  },
  termsLink: {
    color: burgundyTheme.colors.primary,
    fontWeight: '600',
  },
});
