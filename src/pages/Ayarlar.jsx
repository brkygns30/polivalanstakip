import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Trash2, ChevronDown, ChevronRight, Clock, Factory, Layers } from 'lucide-react'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
        {children}
        <button onClick={onClose} className="mt-2 w-full text-sm text-gray-400 hover:text-gray-600">İptal</button>
      </div>
    </div>
  )
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <Icon size={16} className="text-blue-600" />
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function VardiyaYonetimi() {
  const [vardiyalar, setVardiyalar] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', start_time: '', end_time: '' })
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => { fetchVardiyalar() }, [])

  async function fetchVardiyalar() {
    const { data } = await supabase.from('shifts').select('*').order('start_time')
    setVardiyalar(data || [])
  }

  async function handleAdd() {
    if (!form.name || !form.start_time || !form.end_time) return
    setLoading(true)
    await supabase.from('shifts').insert({ ...form, created_by: user.id })
    setForm({ name: '', start_time: '', end_time: '' })
    setModal(false)
    setLoading(false)
    fetchVardiyalar()
  }

  async function handleDelete(id) {
    if (!confirm('Bu vardiyayı silmek istediğinize emin misiniz?')) return
    await supabase.from('shifts').delete().eq('id', id)
    fetchVardiyalar()
  }

  return (
    <>
      <div className="space-y-2">
        {vardiyalar.map(v => (
          <div key={v.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">{v.name}</p>
              <p className="text-xs text-gray-400">{v.start_time.slice(0,5)} – {v.end_time.slice(0,5)}</p>
            </div>
            <button onClick={() => handleDelete(v.id)} className="text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {vardiyalar.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Henüz vardiya eklenmedi.</p>}
      </div>
      <button onClick={() => setModal(true)} className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
        <Plus size={15} /> Vardiya Ekle
      </button>
      {modal && (
        <Modal title="Yeni Vardiya" onClose={() => setModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Vardiya Adı</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sabah Vardiyası" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Başlangıç</label>
                <input type="time" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Bitiş</label>
                <input type="time" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <button onClick={handleAdd} disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function UretimYapisi() {
  const [data, setData] = useState([])
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', min_competency_level: 1 })
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data: lines } = await supabase.from('production_lines')
      .select(`*, lines(*, stations(*))`)
      .order('order_index')
    setData(lines || [])
  }

  function toggle(id) { setExpanded(e => ({ ...e, [id]: !e[id] })) }

  async function handleAdd() {
    if (!form.name) return
    setLoading(true)
    if (modal.type === 'kol') {
      await supabase.from('production_lines').insert({ name: form.name, order_index: data.length + 1 })
    } else if (modal.type === 'hat') {
      const count = data.find(k => k.id === modal.parentId)?.lines?.length || 0
      await supabase.from('lines').insert({ name: form.name, production_line_id: modal.parentId, order_index: count + 1 })
    } else if (modal.type === 'istasyon') {
      const kol = data.find(k => k.lines?.some(l => l.id === modal.parentId))
      const hat = kol?.lines?.find(l => l.id === modal.parentId)
      const count = hat?.stations?.length || 0
      await supabase.from('stations').insert({
        name: form.name, line_id: modal.parentId,
        min_competency_level: Number(form.min_competency_level), order_index: count + 1
      })
    }
    setForm({ name: '', min_competency_level: 1 })
    setModal(null)
    setLoading(false)
    fetchAll()
  }

  async function handleDelete(type, id) {
    const label = type === 'kol' ? 'üretim kolunu' : type === 'hat' ? 'hattı' : 'istasyonu'
    if (!confirm(`Bu ${label} silmek istediğinize emin misiniz? İçindeki tüm veriler silinecek.`)) return
    if (type === 'kol') await supabase.from('production_lines').delete().eq('id', id)
    else if (type === 'hat') await supabase.from('lines').delete().eq('id', id)
    else await supabase.from('stations').delete().eq('id', id)
    fetchAll()
  }

  const levelLabels = ['Eğitime İhtiyacı Var', 'Gözetim Altında', 'Çalışabilir', 'Eğitim Verebilir']
  const levelColors = ['bg-gray-200 text-gray-700', 'bg-yellow-200 text-yellow-800', 'bg-blue-200 text-blue-800', 'bg-green-200 text-green-800']
  const modalTitle = modal?.type === 'kol' ? 'Yeni Üretim Kolu' : modal?.type === 'hat' ? 'Yeni Hat' : 'Yeni İstasyon'

  return (
    <>
      <div className="space-y-2">
        {data.map(kol => (
          <div key={kol.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer" onClick={() => toggle(kol.id)}>
              <div className="flex items-center gap-2">
                {expanded[kol.id] ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                <span className="text-sm font-semibold text-gray-800">{kol.name}</span>
                <span className="text-xs text-gray-400">{kol.lines?.length || 0} hat</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={e => { e.stopPropagation(); setModal({ type: 'hat', parentId: kol.id }); setForm({ name: '', min_competency_level: 1 }) }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  <Plus size={12} /> Hat
                </button>
                <button onClick={e => { e.stopPropagation(); handleDelete('kol', kol.id) }} className="text-gray-300 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            {expanded[kol.id] && (
              <div className="px-4 pb-3 pt-2 space-y-2">
                {kol.lines?.map(hat => (
                  <div key={hat.id} className="ml-4 border border-gray-100 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-white cursor-pointer" onClick={() => toggle(hat.id)}>
                      <div className="flex items-center gap-2">
                        {expanded[hat.id] ? <ChevronDown size={13} className="text-gray-300" /> : <ChevronRight size={13} className="text-gray-300" />}
                        <span className="text-sm text-gray-700 font-medium">{hat.name}</span>
                        <span className="text-xs text-gray-400">{hat.stations?.length || 0} istasyon</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={e => { e.stopPropagation(); setModal({ type: 'istasyon', parentId: hat.id }); setForm({ name: '', min_competency_level: 1 }) }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                          <Plus size={12} /> İstasyon
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete('hat', hat.id) }} className="text-gray-300 hover:text-red-400">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {expanded[hat.id] && (
                      <div className="px-3 pb-2 pt-1 space-y-1">
                        {hat.stations?.map(ist => (
                          <div key={ist.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg ml-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700">{ist.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[ist.min_competency_level]}`}>
                                min: {levelLabels[ist.min_competency_level]}
                              </span>
                            </div>
                            <button onClick={() => handleDelete('istasyon', ist.id)} className="text-gray-300 hover:text-red-400">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        {!hat.stations?.length && <p className="text-xs text-gray-400 ml-4 py-1">Henüz istasyon yok.</p>}
                      </div>
                    )}
                  </div>
                ))}
                {!kol.lines?.length && <p className="text-xs text-gray-400 ml-4 py-1">Henüz hat yok.</p>}
              </div>
            )}
          </div>
        ))}
        {!data.length && <p className="text-sm text-gray-400 text-center py-4">Henüz üretim kolu eklenmedi.</p>}
      </div>
      <button onClick={() => { setModal({ type: 'kol' }); setForm({ name: '', min_competency_level: 1 }) }}
        className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
        <Plus size={15} /> Üretim Kolu Ekle
      </button>
      {modal && (
        <Modal title={modalTitle} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Ad</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={modal.type === 'kol' ? 'A Üretim Kolu' : modal.type === 'hat' ? 'Hat 1' : 'İstasyon 1'}
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            {modal.type === 'istasyon' && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Minimum Yetkinlik Seviyesi</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.min_competency_level} onChange={e => setForm(f => ({ ...f, min_competency_level: e.target.value }))}>
                  <option value={0}>0 – Eğitime İhtiyacı Var</option>
                  <option value={1}>1 – Gözetim Altında Çalışabilir</option>
                  <option value={2}>2 – Çalışabilir</option>
                  <option value={3}>3 – Eğitim Verebilir</option>
                </select>
              </div>
            )}
            <button onClick={handleAdd} disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function KullaniciYonetimi() {
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'hat_yoneticisi' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const roleLabels = { admin: 'Admin', ik_uretim: 'İK / Üretim', hat_yoneticisi: 'Hat Yöneticisi' }
  const roleColors = { admin: 'bg-purple-100 text-purple-700', ik_uretim: 'bg-blue-100 text-blue-700', hat_yoneticisi: 'bg-green-100 text-green-700' }

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data || [])
  }

  async function handleAdd() {
    if (!form.email || !form.password || !form.full_name) return
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.full_name, role: form.role } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data?.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, full_name: form.full_name, role: form.role })
    }
    setForm({ email: '', password: '', full_name: '', role: 'hat_yoneticisi' })
    setModal(false)
    setLoading(false)
    setTimeout(fetchUsers, 1000)
  }

  return (
    <>
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
            <p className="text-sm font-medium text-gray-900">{u.full_name || '—'}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[u.role]}`}>
              {roleLabels[u.role]}
            </span>
          </div>
        ))}
        {!users.length && <p className="text-sm text-gray-400 text-center py-4">Kullanıcı bulunamadı.</p>}
      </div>
      <button onClick={() => setModal(true)} className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
        <Plus size={15} /> Kullanıcı Ekle
      </button>
      {modal && (
        <Modal title="Yeni Kullanıcı" onClose={() => setModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Ad Soyad</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ahmet Yılmaz" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">E-posta</label>
              <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ahmet@fabrika.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Şifre</label>
              <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Rol</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="hat_yoneticisi">Hat Yöneticisi</option>
                <option value="ik_uretim">İK / Üretim</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={handleAdd} disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

export default function Ayarlar() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Ayarlar</h1>
        <p className="text-sm text-gray-400 mt-0.5">Sistem yapılandırması ve tanımlar</p>
      </div>
      <SectionCard icon={Factory} title="Üretim Yapısı">
        <UretimYapisi />
      </SectionCard>
      <SectionCard icon={Clock} title="Vardiyalar">
        <VardiyaYonetimi />
      </SectionCard>
      <SectionCard icon={Layers} title="Kullanıcı Yönetimi">
        <KullaniciYonetimi />
      </SectionCard>
    </div>
  )
}
