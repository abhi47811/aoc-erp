import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { Camera, CameraView } from 'expo-camera'
import { supabase } from '@/lib/supabase'

type WorkOrder = {
  id: string
  order_number: string
  status: string
  glass_type: string
  width_mm: number
  height_mm: number
  quantity: number
}

const NEXT_STATUS: Record<string, string> = {
  pending: 'cutting',
  cutting: 'edging',
  edging: 'tempering',
  tempering: 'qc_pending',
  qc_pending: 'completed',
}

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanning, setScanning] = useState(false)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [updating, setUpdating] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => setHasPermission(status === 'granted'))
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
        .then(({ data }) => data && setTenantId(data.tenant_id))
    })
  }, [])

  async function onBarcodeScanned({ data }: { data: string }) {
    if (!scanning || !tenantId) return
    setScanning(false)
    const { data: wo, error } = await supabase
      .from('work_orders')
      .select('id, order_number, status, glass_type, width_mm, height_mm, quantity')
      .eq('tenant_id', tenantId)
      .eq('id', data)
      .single()
    if (error || !wo) {
      Alert.alert('Not found', `Work order "${data}" not found`)
      return
    }
    setWorkOrder(wo)
  }

  async function updateStatus() {
    if (!workOrder || !tenantId) return
    const next = NEXT_STATUS[workOrder.status]
    if (!next) { Alert.alert('Already complete', 'No next status available'); return }
    setUpdating(true)
    const { error } = await supabase
      .from('work_orders')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', workOrder.id)
      .eq('tenant_id', tenantId)
    setUpdating(false)
    if (error) { Alert.alert('Error', error.message); return }
    setWorkOrder({ ...workOrder, status: next })
    Alert.alert('Updated', `Status → ${next}`)
  }

  const STATUS_COLOR: Record<string, string> = {
    pending: '#71717a', cutting: '#3b82f6', edging: '#8b5cf6',
    tempering: '#f59e0b', qc_pending: '#ef4444', completed: '#10b981',
  }

  if (hasPermission === null) return <View style={{ flex: 1, backgroundColor: '#09090b' }} />
  if (hasPermission === false) return (
    <View style={{ flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ color: '#f4f4f5', fontSize: 16, textAlign: 'center' }}>Camera permission required to scan work orders</Text>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#09090b' }}>
      {scanning ? (
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39'] }}
          onBarcodeScanned={onBarcodeScanned}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
              width: 260, height: 260,
              borderWidth: 2, borderColor: '#3b82f6', borderRadius: 16,
            }} />
            <Text style={{ color: '#fff', marginTop: 24, fontSize: 15 }}>Point at work order QR code</Text>
            <TouchableOpacity
              onPress={() => setScanning(false)}
              style={{ marginTop: 32, backgroundColor: '#27272a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}>
              <Text style={{ color: '#f4f4f5' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
          <Text style={{ color: '#f4f4f5', fontSize: 22, fontWeight: '700', marginBottom: 24 }}>Production Scan</Text>

          {workOrder ? (
            <View>
              <View style={{
                backgroundColor: '#18181b', borderRadius: 12,
                borderWidth: 1, borderColor: '#27272a', padding: 20, marginBottom: 16,
              }}>
                <Text style={{ color: '#71717a', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Work Order</Text>
                <Text style={{ color: '#f4f4f5', fontSize: 20, fontWeight: '700', marginBottom: 16 }}>{workOrder.order_number}</Text>
                <View style={{ gap: 10 }}>
                  {[
                    ['Glass Type', workOrder.glass_type],
                    ['Dimensions', `${workOrder.width_mm} × ${workOrder.height_mm} mm`],
                    ['Quantity', String(workOrder.quantity)],
                  ].map(([k, v]) => (
                    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#71717a', fontSize: 14 }}>{k}</Text>
                      <Text style={{ color: '#f4f4f5', fontSize: 14 }}>{v}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#71717a', fontSize: 14 }}>Status</Text>
                    <View style={{ backgroundColor: STATUS_COLOR[workOrder.status] + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                      <Text style={{ color: STATUS_COLOR[workOrder.status], fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>
                        {workOrder.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {NEXT_STATUS[workOrder.status] && (
                <TouchableOpacity
                  onPress={updateStatus}
                  disabled={updating}
                  style={{
                    backgroundColor: '#2563eb', borderRadius: 10, padding: 16,
                    alignItems: 'center', marginBottom: 12, opacity: updating ? 0.7 : 1,
                  }}>
                  {updating
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                        Advance → {NEXT_STATUS[workOrder.status]?.replace('_', ' ')}
                      </Text>
                  }
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => { setWorkOrder(null); setScanning(true) }}
                style={{ backgroundColor: '#27272a', borderRadius: 10, padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#f4f4f5', fontSize: 15 }}>Scan Another</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setScanning(true)}
              style={{
                backgroundColor: '#18181b', borderRadius: 16,
                borderWidth: 1, borderColor: '#3b82f6',
                padding: 48, alignItems: 'center',
              }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>⬡</Text>
              <Text style={{ color: '#f4f4f5', fontSize: 17, fontWeight: '600' }}>Tap to Scan</Text>
              <Text style={{ color: '#71717a', fontSize: 13, marginTop: 4 }}>QR or barcode on work order</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  )
}
