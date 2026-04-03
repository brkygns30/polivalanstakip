import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ChevronDown } from 'lucide-react'

// Seviye renk ve şekilleri (2x2 kare sistemi)
function LevelCell({ current, target, onClick, canEdit }) {
  const colors = {
    0: { filled: '#9ca3af', empty: '#e5e7eb' },   // gri - eğitime ihtiyaç
    1: { filled: '#fbbf24', empty: '#fef3c7' },    // sarı - gözetim altında
    2: { filled: '#60a5fa', empty: '#dbeafe' },    // mavi - çalışabilir
    3: { filled: '#22c55e', empty: '#dcfce7' },    // yeşil - eğitim verebilir
  }

  function QuarterSquare({ level, isCurrent }) {
    const c = colors[level]
    // 2x2 grid: sol üst = current, sağ üst = target (köşegen bölünmüş gösterim)
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-px w-8 h-8 rounded-sm overflow-hidden"
        style={{ backgroundColor: '#e5e7eb' }}>
        {/* Sol üst - current */}
        <div style={{ backgroundColor: isCurrent ? c.filled : colors[current].filled }} />
        {/* Sağ üst - target */}
        <div style={{ backgroundColor: !isCurrent ? c.filled : colors[target].filled }} />
        {/* Sol alt - current */}
        <div style={{ backgroundColor: isCurrent ? c.filled : colors[current].filled }} />
        {/* Sağ alt - target */}
        <div style={{ backgroundColor: !isCurrent ? c.filled : colors[target].filled }} />
      </div>
    )
  }

  // Gerçek gösterim: sol yarı = mevcut, sağ yarı = hedef
  const currentColor = colors[current]
  const targetColor = colors[target]

  return (
    <button
      onClick={canEdit ? onClick : undefined}
      className={`flex items-center justify-center ${canEdit ? 'hover:scale-110 cursor-pointer' : 'cursor-default'} transition-transform`}
      title={`Mevcut: ${levelLabel(current)} | Hedef: ${levelLabel(target)}`}
    >
      <div className="grid grid-cols-2 gap-px w-8 h-8 rounded overflow-hidden" style={{ backgroundColor: '#d1d5db' }}>
        <div className="grid grid-rows-2 gap-px">
          <div style={{ backgroundColor: currentColor.filled }} />
          <div style={{ backgroundColor: currentColor.filled }} />
        </div>
        <div className="grid grid-rows-2 gap-px">
          <div style={{ backgroundColor: targetColor.filled }} />
          <div style={{ backgroundColor: targetColor.filled }} />
        </div>
      </div>
    </button>
  )
}

function levelLabel(l) {
  return ['Eğitime İhtiyacı Var', 'Gözetim Altında', 'Çalışabilir', 'Eğitim Verebilir'][l] || '—'
}

function EditModal({ employee, station, current, target, onClose, onSave }) {
  const [cl, setCl] = useState(current)
  const [tl, setTl] = useState(target)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    await onSave(cl, tl)
    setLoading(false)
    onClose()
  }

  const levels = [
    { value: 0, label: 'Eğitime İhtiyacı Var', color: 'bg-gray-200' },
    { value: 1, label: 'Gözetim Altında', color: 'bg-yellow-200' },
    { value: 2, label: 'Çalışabilir', color: 'bg-blue-200' },
    { value: 3, label: 'Eğitim Verebilir', color: 'bg-green-300' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">{employee}</h2>
        <p className="text-sm text-gray-400 mb-5">{station}</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Mevcut Seviye</label>
            <div className="grid grid-cols-2 gap-2">
              {levels.map(l => (
                <button key={l.value} onClick={() => setCl(l.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                    cl === l.value ? 'border-blue-500 ' + l.color : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}>
                  {l.value} – {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Hedef Seviye</label>
            <div className="grid grid-cols-2 gap-2">
              {levels.map(l => (
                <button key={l.value} onClick={() => setTl(l.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                    tl === l.value ? 'border-blue-500 ' + l.color : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}>
                  {l.value} – {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            İptal
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Polivalans() {
  const { profile } = useAuth()
  const [productionLines, setProductionLines] = useState([])
  const [employees, setEmployees] = useState([])
  const [competencies, setCompetencies] = useState({})
  const [selectedLine, setSelectedLine] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [loading, setLoading] = useState(true)

  const canEdit = ['admin', 'ik_uretim'].includes(profile?.role)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: lines }, { data: emps }, { data: comps }] = await Promise.all([
      supabase.from('production_lines').select(`*, lines(*, stations(*))`).order('order_index'),
      supabase.from('employees').select('*').eq('is_active', true).order('full_name'),
      supabase.from('competencies').select('*'),
    ])
    setProductionLines(lines || [])
    setEmployees(emps || [])
    const compMap = {}
    for (const c of (comps || [])) {
      compMap[`${c.employee_id}_${c.station_id}`] = c
    }
    setCompetencies(compMap)
    if (lines?.length && !selectedLine) setSelectedLine(lines[0].id)
    setLoading(false)
  }

  function getComp(empId, stationId) {
    return competencies[`${empId}_${stationId}`] || { current_level: 0, target_level: 0 }
  }

  async function handleSave(empId, stationId, currentLevel, targetLevel) {
    const existing = competencies[`${empId}_${stationId}`]
    if (existing?.id) {
      await supabase.from('competencies').update({
        current_level: currentLevel, target_level: targetLevel, updated_at: new Date().toISOString()
      }).eq('id', existing.id)
    } else {
      await supabase.from('competencies').insert({
        employee_id: empId, station_id: stationId,
        current_level: currentLevel, target_level: targetLevel
      })
    }
    await fetchData()
  }

  const activeLine = productionLines.find(l => l.id === selectedLine)
  const allStations = activeLine?.lines?.flatMap(hat =>
    (hat.stations || []).map(s => ({ ...s, hatName: hat.name }))
  ) || []

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Polivalans Matrisi</h1>
          <p className="text-sm text-gray-400 mt-0.5">Personel yetkinlik takibi</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Üretim kolu seçici */}
          <div className="relative">
            <select
              value={selectedLine || ''}
              onChange={e => setSelectedLine(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {productionLines.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <span className="text-xs text-gray-400">Gösterim: sol = mevcut / sağ = hedef</span>
        {[
          { label: 'Eğitime İhtiyacı Var', color: '#9ca3af' },
          { label: 'Gözetim Altında', color: '#fbbf24' },
          { label: 'Çalışabilir', color: '#60a5fa' },
          { label: 'Eğitim Verebilir', color: '#22c55e' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Matrix */}
      {allStations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400 text-sm">
          Bu üretim kolunda henüz istasyon tanımlanmamış.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white border-b border-r border-gray-100 px-4 py-3 text-left text-xs font-medium text-gray-400 min-w-40">
                  Personel
                </th>
                {allStations.map(st => (
                  <th key={st.id} className="border-b border-r border-gray-100 px-2 py-3 text-center min-w-16">
                    <div className="text-xs font-medium text-gray-700 whitespace-nowrap">{st.name}</div>
                    <div className="text-xs text-gray-400">{st.hatName}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr key={emp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="sticky left-0 z-10 border-b border-r border-gray-100 px-4 py-2.5 text-sm font-medium text-gray-900 whitespace-nowrap"
                    style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <div>{emp.full_name}</div>
                    <div className="text-xs text-gray-400 font-normal font-mono">{emp.employee_no}</div>
                  </td>
                  {allStations.map(st => {
                    const comp = getComp(emp.id, st.id)
                    return (
                      <td key={st.id} className="border-b border-r border-gray-100 px-2 py-2.5 text-center">
                        <div className="flex justify-center">
                          <LevelCell
                            current={comp.current_level}
                            target={comp.target_level}
                            canEdit={canEdit}
                            onClick={() => setEditModal({ emp, st, comp })}
                          />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editModal && (
        <EditModal
          employee={editModal.emp.full_name}
          station={`${editModal.st.hatName} › ${editModal.st.name}`}
          current={editModal.comp.current_level}
          target={editModal.comp.target_level}
          onClose={() => setEditModal(null)}
          onSave={(cl, tl) => handleSave(editModal.emp.id, editModal.st.id, cl, tl)}
        />
      )}
    </div>
  )
}
