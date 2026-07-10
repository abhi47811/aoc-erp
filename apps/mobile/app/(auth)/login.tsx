import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn() {
    if (!email || !password) {
      Alert.alert('Error', 'Enter email and password')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) Alert.alert('Sign in failed', error.message)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#09090b' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 16,
            backgroundColor: '#2563eb',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>A</Text>
          </View>
          <Text style={{ color: '#f4f4f5', fontSize: 24, fontWeight: '700' }}>AOC ERP</Text>
          <Text style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>Glass Fabrication Management</Text>
        </View>

        {/* Form */}
        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor="#52525b"
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                backgroundColor: '#18181b',
                borderWidth: 1, borderColor: '#3f3f46',
                borderRadius: 10, padding: 14,
                color: '#f4f4f5', fontSize: 15,
              }}
            />
          </View>
          <View>
            <Text style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              secureTextEntry
              style={{
                backgroundColor: '#18181b',
                borderWidth: 1, borderColor: '#3f3f46',
                borderRadius: 10, padding: 14,
                color: '#f4f4f5', fontSize: 15,
              }}
            />
          </View>
          <TouchableOpacity
            onPress={signIn}
            disabled={loading}
            style={{
              backgroundColor: '#2563eb',
              borderRadius: 10, padding: 16,
              alignItems: 'center', marginTop: 8,
              opacity: loading ? 0.7 : 1,
            }}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
