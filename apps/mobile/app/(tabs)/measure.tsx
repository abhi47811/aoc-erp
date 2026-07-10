import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { supabase } from '@/lib/supabase'

const GLASS_TYPES = ['Clear', 'Tinted', 'Frosted', 'Laminated', 'Tempered', 'Double Glazed', 'Mirror']
const UNITS: ('mm' | 'cm' | 'inch')[] = ['mm', 'cm', 'inch']

function toMM(val: number, unit: 'mm' | 'cm' | 'inch'): number {
  if (unit === 'cm') return val * 10
  if (unit === 'inch') return val * 25.4
  return val
}

export default function MeasureScreen() {
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [thickness, setThickness] = useState('6')
  const [unit, setUnit] = useState<'mm' | 'cm' | 'inch'>('mm')
  const [glassType, setGlassType] = useState('Clear')
  const [notes, setNotes] = useState('')
  const [workOrderId, setWorkOrderId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [recent, setRecent] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
        .then(({ data }) => {
          if (!data) return
          setTenantId(data.tenant_id)
          loadRecent(data.tenant_id, user.id)
        })
    })
  }, [])

  async function loadRecent(tid: string, uid: string) {
    const { data } = await supabase
      .from('measurements')
      .select('id, width_mm, height_mm, thickness_mm, glass_type, created_at, work_order_id')
      .eq('tenant_id', tid)
      .eq('created_by', uid)
      .order('created_at', { ascending: false })
      .limit(5)
    if (data) setRecent(data)
  }

  const widthMM = width ? toMM(parseFloat(width), unit) : 0
  const heightMM = height ? toMM(parseFloat(height), unit) : 0
  const areaSqM = widthMM && heightMM ? (widthMM * heightMM) / 1_000_000 : 0

  async function submit() {
    if (!width || !height) { Alert.alert('Required', 'Enter width and height'); return }
    if (!tenantId || !userId) return
    setSubmitting(true)
    const { error } = await supabase.from('measurements').insert({
      tenant_id: tenantId,
      created_by: userId,
      width_mm: Math.round(widthMM),
      height_mm: Math.round(heightMM),
      thickness_mm: parseFloat(thickness) || 6,
      glass_type: glassType,
      notes: notes || null,
      work_order_id: workOrderId || null,
      area_sqm: parseFloat(areaSqM.toFixed(4)),
    })
    setSubmitting(false)
    if (error) { Alert.alert('Error', error.message); return }
    Alert.alert('Saved', `${Math.round(widthMM)}×${Math.round(heightMM)}mm logged`)
    setWidth('')
    setHeight('')
    setNotes('')
    setWorkOrderId('')
    if (tenantId && userId) loadRecent(tenantId, userId)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#09090b' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 40 }}>
        <Text style={{ color: '#f4f4f5', fontSize: 22, fontWeight: '700', marginBottom: 24 }}>Measurement Capture</Text>

        {/* Unit selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {UNITS.map(u => (
            <TouchableOpacity key={u} onPress={() => setUnit(u)} style={{
              flex: 1, padding: 10, borderRadius: 8, alignItems: 'center',
              backgroundColor: unit === u ? '#2563eb' : '#18181b',
              borderWidth: 1, borderColor: unit === u ? '#2563eb' : '#27272a',
            }}>
              <Text style={{ color: unit === u ? '#fff' : '#a1a1aa', fontWeight: '600' }}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dimensions */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          {[
            { label: `Width (${unit})`, val: width, set: setWidth },
            { label: `Height (${unit})`, val: height, set: setHeight },
          ].map(({ label, val, set }) => (
            <View key={label} style={{ flex: 1 }}>
              <Text style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
              <TextInput
                value={val}
                onChangeText={set}
                placeholder="0"
                placeholderTextColor="#52525b"
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: '#18181b', borderWidth: 1, borderColor: '#3f3f46',
                  borderRadius: 10, padding: 14, color: '#f4f4f5', fontSize: 18,
                  textAlign: 'center', fontWeight: '700',
                }}
              />
            </View>
          ))}
        </View>

        {/* Thickness */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Thickness (mm)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['4', '5', '6', '8', '10', '12'].map(t => (
              <TouchableOpacity key={t} onPress={() => setThickness(t)} style={{
                flex: 1, padding: 10, borderRadius: 8, alignItems: 'center',
                backgroundColor: thickness === t ? '#18181b' : '#18181b',
                borderWidth: 1, borderColor: thickness === t ? '#3b82f6' : '#27272a',
              }}>
                <Text style={{ color: thickness === t ? '#3b82f6' : '#a1a1aa', fontSize: 13, fontWeight: '600' }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Glass type */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Glass Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {GLASS_TYPES.map(g => (
                <TouchableOpacity key={g} onPress={() => setGlassType(g)} style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: glassType === g ? '#2563eb' : '#18181b',
                  borderWidth: 1, borderColor: glassType === g ? '#2563eb' : '#27272a',
                }}>
                  <Text style={{ color: glassType === g ? '#fff' : '#a1a1aa', fontSize: 13 }}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Area preview */}
        {areaSqM > 0 && (
          <View style={{
            backgroundColor: '#18181b', borderRadius: 10, borderWidth: 1, borderColor: '#27272a',
            padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between',
          }}>
            <Text style={{ color: '#71717a', fontSize: 14 }}>Area</Text>
            <Text style={{ color: '#10b981', fontSize: 16, fontWeight: '700' }}>{areaSqM.toFixed(3)} m²</Text>
          </View>
        )}

        {/* Work order ref */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Work Order ID (optional)</Text>
          <TextInput
            value={workOrderId}
            onChangeText={setWorkOrderId}
            placeholder="Link to work order..."
            placeholderTextColor="#52525b"
            style={{
              backgroundColor: '#18181b', borderWidth: 1, borderColor: '#3f3f46',
              borderRadius: 10, padding: 14, color: '#f4f4f5', fontSize: 14,
            }}
          />
        </View>

        {/* Notes */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Location, panel ref, observations..."
            placeholderTextColor="#52525b"
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: '#18181b', borderWidth: 1, borderColor: '#3f3f46',
              borderRadius: 10, padding: 14, color: '#f4f4f5', fontSize: 14,
              textAlignVertical: 'top', minHeight: 80,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={submit}
          disabled={submitting}
          style={{
            backgroundColor: '#2563eb', borderRadius: 10, padding: 16,
            alignItems: 'center', opacity: submitting ? 0.7 : 1,
          }}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Save Measurement</Text>}
        </TouchableOpacity>

        {/* Recent */}
        {recent.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <Text style={{ color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Recent</Text>
            {recent.map(r => (
              <View key={r.id} style={{
                backgroundColor: '#18181b', borderRadius: 10, borderWidth: 1, borderColor: '#27272a',
                padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between',
              }}>
                <View>
                  <Text style={{ color: '#f4f4f5', fontSize: 14, fontWeight: '600' }}>{r.width_mm}×{r.height_mm}mm</Text>
                  <Text style={{ color: '#71717a', fontSize: 12, marginTop: 2 }}>{r.glass_type} · {r.thickness_mm}mm</Text>
                </View>
                <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '600', alignSelf: 'center' }}>
                  {((r.width_mm * r.height_mm) / 1_000_000).toFixed(3)} m²
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
