import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/services/supabase/client';
import { useAppMode } from '@/store/AppModeContext';

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
  const { theme } = useAppMode();
  const styles = getStyles(theme);

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
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').insert([
            {
              id: authData.user.id,
              username,
              role: 'user',
            },
          ]);

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }

          Alert.alert(
            'Success!',
            'Account created successfully. Please check your email for verification if required.',
            [{ text: 'OK' }]
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Auth error:', error);

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
        Alert.alert('Error', error.message || 'An error occurred. Please try again.', [{ text: 'OK' }]);
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
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.topRow} />

          <View style={styles.logoBadge}>
            <Image
              source={require('../../../assets/images/odinicon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>{isSignUp ? 'Welcome' : 'Welcome Back'}</Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Sign up to explore amazing travel experiences'
              : 'Sign in to continue exploring'}
          </Text>
        </View>

        <View style={styles.form}>
          {isSignUp ? (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <View style={[styles.inputWrapper, errors.username && styles.inputError]}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Choose a username"
                  placeholderTextColor={theme.colors.textSubtle}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={theme.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textSubtle}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={theme.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textSubtle}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.buttonText} />
            ) : (
              <Text style={styles.authButtonText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.toggleButton} onPress={toggleAuthMode} disabled={loading}>
            <Text style={styles.toggleButtonText}>
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By continuing, you agree to our <Text style={styles.termsLink}>Terms of Service</Text>{' '}
            and <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme: ReturnType<typeof useAppMode>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 40,
    },
    header: {
      alignItems: 'stretch',
      marginBottom: 40,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 28,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    backButtonText: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    modePill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.primaryTint,
    },
    modePillText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    logoBadge: {
      width: 200,
      height: 112,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      
      borderColor: theme.colors.border,
      marginBottom: 0,
      alignSelf: 'center',
    },
    logo: {
      width: 200,
      height: 150,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    form: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: 6,
      padding: 20,
      borderWidth: 2,
      borderColor: theme.colors.border,
      ...theme.shadow,
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      height: 56,
    },
    inputError: {
      borderColor: theme.colors.danger,
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      height: '100%',
    },
    eyeIcon: {
      padding: 8,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
    },
    authButton: {
      backgroundColor: theme.colors.buttonBg,
      borderRadius: 4,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    authButtonDisabled: {
      opacity: 0.7,
    },
    authButtonText: {
      color: theme.colors.buttonText,
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
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      paddingHorizontal: 16,
      color: theme.colors.textSubtle,
      fontSize: 14,
    },
    toggleButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 4,
      backgroundColor: theme.colors.buttonBg,
      alignSelf: 'center',
      marginTop: 6,
    },
    toggleButtonText: {
      color: theme.colors.buttonText,
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
    },
    termsText: {
      fontSize: 12,
      color: theme.colors.textSubtle,
      textAlign: 'center',
      marginTop: 30,
      lineHeight: 18,
    },
    termsLink: {
      color: theme.colors.textMuted,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
  });
