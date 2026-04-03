import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Trash2, User } from 'lucide-react'

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

export default function Personel() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ full_name: '', employee_no: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    const { data } = await supabase.from('employees').select('*').order('full_name')
    setEmployees(data || [])
  }

  async function handleAdd() {
    if (!form.full_name || !form.employee_no) return
    setLoading(true)
    setError('')
    const { error } = await supabase.from('employees').insert(form)
    if (error) { setError(error.message); setLoading(false); return }
    setForm({ full_name: '', employee_no: '' })
    setModal(false)
    setLoading(false)
    fetchEmployees()
  }

  async function handleDelete(id) {
    if (!confirm('Bu personeli silmek istediğinize emin misiniz?')) return
    await supabase.from('employees').delete().eq('id', id)
    fetchEmployees()
  }

  async function toggleActive(id, current) {
    await supabase.from('employees').update({ is_active: !current }).eq('id', id)
    fetchEmployees()
  }

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_no.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Personel</h1>
          <p className="text-sm text-gray-400 mt-0.5">{employees.length} personel kayıtlı</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Personel Ekle
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          placeholder="İsim veya sicil numarası ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <User size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Personel bulunamadı.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Ad Soyad</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Sicil No</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Durum</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <tr key={emp.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i === filtered.length - 1 ? 'border-0' : ''}`}>
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{emp.full_name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">{emp.employee_no}</td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => toggleActive(emp.id, emp.is_active)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        emp.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {emp.is_active ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => handleDelete(emp.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title="Yeni Personel" onClose={() => { setModal(false); setError('') }}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Ad Soyad</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ahmet Yılmaz" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Sicil Numarası</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="EMP006" value={form.employee_no} onChange={e => setForm(f => ({ ...f, employee_no: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={handleAdd} disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
