import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { supabase } from '@/lib/supabase'

type Delivery = {
  id: string
  delivery_number: string
  client_name: string
  address: string
  status: string
}

export default function DeliveryScreen() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [selected, setSelected] = useState<Delivery | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
        .then(({ data }) => {
          if (!data) return
          setTenantId(data.tenant_id)
          loadDeliveries(data.tenant_id)
        })
    })
  }, [])

  async function loadDeliveries(tid: string) {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('deliveries')
      .select('id, delivery_number, status, scheduled_date, delivery_addresses(address), clients(name)')
      .eq('tenant_id', tid)
      .eq('status', 'in_transit')
      .gte('scheduled_date', today)
      .order('scheduled_date')
      .limit(20)
    if (data) {
      setDeliveries(data.map((d: any) => ({
        id: d.id,
        delivery_number: d.delivery_number,
        client_name: d.clients?.name ?? 'Unknown',
        address: d.delivery_addresses?.address ?? '',
        status: d.status,
      })))
    }
  }

  async function capturePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission required', 'Camera access needed'); return }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    })
    if (!result.canceled) setPhoto(result.assets[0].uri)
  }

  async function captureLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission required', 'Location access needed'); return }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
    Alert.alert('Location captured', `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`)
  }

  async function submitPOD() {
    if (!selected || !tenantId) return
    if (!photo) { Alert.alert('Photo required', 'Take a proof of delivery photo'); return }
    setSubmitting(true)
    let photoUrl: string | null = null
    if (photo) {
      const ext = photo.split('.').pop() ?? 'jpg'
      const path = `pod/${tenantId}/${selected.id}-${Date.now()}.${ext}`
      const blob = await fetch(photo).then(r => r.blob())
      const { error: uploadError } = await supabase.storage.from('deliveries').upload(path, blob, { contentType: `image/${ext}` })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('deliveries').getPublicUrl(path)
        photoUrl = publicUrl
      }
    }
    const { error } = await supabase.from('deliveries').update({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      pod_photo_url: photoUrl,
      pod_notes: notes,
      delivery_lat: location?.lat,
      delivery_lng: location?.lng,
    }).eq('id', selected.id).eq('tenant_id', tenantId)
    setSubmitting(false)
    if (error) { Alert.alert('Error', error.message); return }
    Alert.alert('Delivered!', `${selected.delivery_number} marked as delivered`)
    setSelected(null)
    setPhoto(null)
    setNotes('')
    setLocation(null)
    if (tenantId) loadDeliveries(tenantId)
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#09090b' }} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <Text style={{ color: '#f4f4f5', fontSize: 22, fontWeight: '700', marginBottom: 24 }}>Delivery POD</Text>

      {selected ? (
        <View>
          <View style={{
            backgroundColor: '#18181b', borderRadius: 12,
            borderWidth: 1, borderColor: '#27272a', padding: 20, marginBottom: 20,
          }}>
            <Text style={{ color: '#71717a', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Delivery</Text>
            <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '700' }}>{selected.delivery_number}</Text>
            <Text style={{ color: '#a1a1aa', fontSize: 14, marginTop: 4 }}>{selected.client_name}</Text>
            <Text style={{ color: '#71717a', fontSize: 13, marginTop: 2 }}>{selected.address}</Text>
          </View>

          {/* Photo */}
          <TouchableOpacity onPress={capturePhoto} style={{
            backgroundColor: '#18181b', borderRadius: 12, borderWidth: 1,
            borderColor: photo ? '#10b981' : '#3b82f6',
            overflow: 'hidden', marginBottom: 12,
            height: photo ? 200 : 120, alignItems: 'center', justifyContent: 'center',
          }}>
            {photo
              ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              : <>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>📷</Text>
                  <Text style={{ color: '#3b82f6', fontSize: 15, fontWeight: '600' }}>Tap to take POD photo</Text>
                </>
            }
          </TouchableOpacity>

          {/* Location */}
          <TouchableOpacity onPress={captureLocation} style={{
            backgroundColor: '#18181b', borderRadius: 12,
            borderWidth: 1, borderColor: location ? '#10b981' : '#27272a',
            padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12,
          }}>
            <Text style={{ fontSize: 20, marginRight: 12 }}>{location ? '✅' : '📍'}</Text>
            <Text style={{ color: location ? '#10b981' : '#a1a1aa', fontSize: 14 }}>
              {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Capture location'}
            </Text>
          </TouchableOpacity>

          {/* Notes */}
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Delivery notes (optional)..."
            placeholderTextColor="#52525b"
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: '#18181b', borderWidth: 1, borderColor: '#3f3f46',
              borderRadius: 10, padding: 14, color: '#f4f4f5', fontSize: 14,
              textAlignVertical: 'top', marginBottom: 16, minHeight: 80,
            }}
          />

          <TouchableOpacity
            onPress={submitPOD}
            disabled={submitting}
            style={{
              backgroundColor: '#10b981', borderRadius: 10, padding: 16,
              alignItems: 'center', marginBottom: 12, opacity: submitting ? 0.7 : 1,
            }}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Submit Proof of Delivery</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelected(null)} style={{ padding: 14, alignItems: 'center' }}>
            <Text style={{ color: '#71717a' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {deliveries.length === 0
            ? <View style={{
                backgroundColor: '#18181b', borderRadius: 12, borderWidth: 1,
                borderColor: '#27272a', padding: 40, alignItems: 'center',
              }}>
                <Text style={{ color: '#71717a', fontSize: 15, textAlign: 'center' }}>No in-transit deliveries for today</Text>
              </View>
            : deliveries.map(d => (
                <TouchableOpacity key={d.id} onPress={() => setSelected(d)} style={{
                  backgroundColor: '#18181b', borderRadius: 12, borderWidth: 1,
                  borderColor: '#27272a', padding: 16, marginBottom: 12,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#f4f4f5', fontSize: 15, fontWeight: '600' }}>{d.delivery_number}</Text>
                    <View style={{ backgroundColor: '#f59e0b20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                      <Text style={{ color: '#f59e0b', fontSize: 12 }}>In Transit</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#a1a1aa', fontSize: 13 }}>{d.client_name}</Text>
                  <Text style={{ color: '#71717a', fontSize: 12, marginTop: 2 }}>{d.address}</Text>
                </TouchableOpacity>
              ))
          }
        </View>
      )}
    </ScrollView>
  )
}
