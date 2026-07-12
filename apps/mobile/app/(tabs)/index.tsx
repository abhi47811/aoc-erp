import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { supabase } from '@/lib/supabase'

type Stats = { label: string; value: string; color: string }[]

export default function HomeScreen() {
  const [stats, setStats] = useState<Stats>([])
  const [loading, setLoading] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')

  async function loadStats() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserEmail(user.email ?? '')
    const { data: profile } = await supabase
      .from('tenant_users').select('tenant_id').eq('user_id', user.id).single()
    if (!profile) { setLoading(false); return }
    setTenantId(profile.tenant_id)
    const tid = profile.tenant_id
    const today = new Date().toISOString().slice(0, 10)
    const [
      { count: openOrders },
      { count: todayDeliveries },
      { count: pendingQC },
    ] = await Promise.all([
      supabase.from('work_orders').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tid).in('status', ['pending', 'in_progress']),
      supabase.from('deliveries').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tid).gte('scheduled_date', today),
      supabase.from('qc_records').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tid).eq('status', 'pending'),
    ])
    setStats([
      { label: 'Open Orders', value: String(openOrders ?? 0), color: '#3b82f6' },
      { label: "Today's Deliveries", value: String(todayDeliveries ?? 0), color: '#10b981' },
      { label: 'Pending QC', value: String(pendingQC ?? 0), color: '#f59e0b' },
    ])
    setLoading(false)
  }

  useEffect(() => { loadStats() }, [])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#09090b' }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} tintColor="#3b82f6" />}>
      <Text style={{ color: '#f4f4f5', fontSize: 22, fontWeight: '700', marginBottom: 4 }}>AOC ERP</Text>
      <Text style={{ color: '#71717a', fontSize: 14, marginBottom: 24 }}>{userEmail}</Text>

      <Text style={{ color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Overview</Text>
      <View style={{ gap: 12, marginBottom: 32 }}>
        {stats.map(s => (
          <View key={s.label} style={{
            backgroundColor: '#18181b', borderRadius: 12,
            borderWidth: 1, borderColor: '#27272a',
            padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Text style={{ color: '#a1a1aa', fontSize: 14 }}>{s.label}</Text>
            <Text style={{ color: s.color, fontSize: 28, fontWeight: '700' }}>{s.value}</Text>
          </View>
        ))}
      </View>

      <Text style={{ color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Quick Actions</Text>
      <View style={{ gap: 10 }}>
        {[
          { label: 'Scan Work Order', desc: 'Scan QR to update production status', href: '/(tabs)/scan' },
          { label: 'Record Delivery', desc: 'Capture proof of delivery', href: '/(tabs)/delivery' },
          { label: 'Add Measurement', desc: 'Log glass dimensions', href: '/(tabs)/measure' },
        ].map(action => (
          <TouchableOpacity key={action.label} style={{
            backgroundColor: '#18181b', borderRadius: 12,
            borderWidth: 1, borderColor: '#27272a', padding: 16,
          }}>
            <Text style={{ color: '#f4f4f5', fontSize: 15, fontWeight: '600' }}>{action.label}</Text>
            <Text style={{ color: '#71717a', fontSize: 13, marginTop: 2 }}>{action.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => supabase.auth.signOut()}
        style={{ marginTop: 40, padding: 14, alignItems: 'center' }}>
        <Text style={{ color: '#71717a', fontSize: 14 }}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
