import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, ChevronDown, X, Check, AlertCircle } from 'lucide-react'

const levelColors = {
  0: { bg: '#f3f4f6', text: '#9ca3af', border: '#e5e7eb' },
  1: { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
  2: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  3: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
}

function StationCard({ station, assignment, employees, competencies, onAssign, onRemove, canEdit }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Yetkin personeller (min seviyeyi karşılayanlar)
  const eligible = employees.filter(emp => {
    const comp = competencies[`${emp.id}_${station.id}`]
    return (comp?.current_level ?? 0) >= station.min_competency_level
  })

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const assignedEmp = assignment ? employees.find(e => e.id === assignment.employee_id) : null
  const comp = assignedEmp ? competencies[`${assignedEmp.id}_${station.id}`] : null
  const level = comp?.current_level ?? 0
  const colors = levelColors[level]

  return (
    <div ref={ref} className="relative">
      <div
        className="rounded-xl border-2 p-3 transition-all min-w-32"
        style={{ borderColor: assignedEmp ? colors.border : '#e5e7eb', backgroundColor: assignedEmp ? colors.bg : '#f9fafb' }}
      >
        <div className="text-xs font-semibold text-gray-500 mb-1">{station.name}</div>
        {assignedEmp ? (
          <div className="flex items-center justify-between gap-1">
            <div>
              <div className="text-sm font-medium" style={{ color: colors.text }}>{assignedEmp.full_name}</div>
              <div className="text-xs opacity-70" style={{ color: colors.text }}>{assignedEmp.employee_no}</div>
            </div>
            {canEdit && (
              <button onClick={() => onRemove(assignment.id)} className="text-gray-400 hover:text-red-400 transition-colors ml-1">
                <X size={13} />
              </button>
            )}
          </div>
        ) : (
          <div
            onClick={() => canEdit && setOpen(true)}
            className={`text-xs text-gray-400 ${canEdit ? 'cursor-pointer hover:text-blue-500' : ''} transition-colors`}
          >
            {canEdit ? '+ Personel ata' : 'Boş'}
          </div>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-30 min-w-48 max-h-56 overflow-auto">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500">Yetkin personel</p>
          </div>
          {eligible.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-400 flex items-center gap-1.5">
              <AlertCircle size={13} /> Yetkin personel yok
            </div>
          ) : (
            eligible.map(emp => {
              const c = competencies[`${emp.id}_${station.id}`]
              const lv = c?.current_level ?? 0
              const lc = levelColors[lv]
              return (
                <button key={emp.id}
                  onClick={() => { onAssign(emp.id, station.id); setOpen(false) }}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                    <div className="text-xs text-gray-400 font-mono">{emp.employee_no}</div>
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ backgroundColor: lc.bg, color: lc.text }}>
                    Seviye {lv}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function FabrikaPlan() {
  const { user, profile } = useAuth()
  const [productionLines, setProductionLines] = useState([])
  const [employees, setEmployees] = useState([])
  const [competencies, setCompetencies] = useState({})
  const [shifts, setShifts] = useState([])
  const [assignments, setAssignments] = useState([])
  const [selectedShift, setSelectedShift] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)

  const canEdit = ['admin', 'hat_yoneticisi'].includes(profile?.role)

  useEffect(() => { fetchBase() }, [])
  useEffect(() => { if (selectedShift) fetchAssignments() }, [selectedShift, selectedDate])

  async function fetchBase() {
    setLoading(true)
    const [{ data: lines }, { data: emps }, { data: comps }, { data: sh }] = await Promise.all([
      supabase.from('production_lines').select(`*, lines(*, stations(*))`).order('order_index'),
      supabase.from('employees').select('*').eq('is_active', true).order('full_name'),
      supabase.from('competencies').select('*'),
      supabase.from('shifts').select('*').eq('is_active', true).order('start_time'),
    ])
    setProductionLines(lines || [])
    setEmployees(emps || [])
    const compMap = {}
    for (const c of (comps || [])) compMap[`${c.employee_id}_${c.station_id}`] = c
    setCompetencies(compMap)
    setShifts(sh || [])
    if (sh?.length && !selectedShift) setSelectedShift(sh[0].id)
    setLoading(false)
  }

  async function fetchAssignments() {
    const { data } = await supabase.from('assignments')
      .select('*')
      .eq('shift_id', selectedShift)
      .eq('work_date', selectedDate)
    setAssignments(data || [])
  }

  async function handleAssign(empId, stationId) {
    const existing = assignments.find(a => a.station_id === stationId)
    if (existing) await supabase.from('assignments').delete().eq('id', existing.id)
    await supabase.from('assignments').insert({
      employee_id: empId, station_id: stationId,
      shift_id: selectedShift, work_date: selectedDate, assigned_by: user.id
    })
    fetchAssignments()
  }

  async function handleRemove(assignmentId) {
    await supabase.from('assignments').delete().eq('id', assignmentId)
    fetchAssignments()
  }

  function getAssignment(stationId) {
    return assignments.find(a => a.station_id === stationId)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalStations = productionLines.flatMap(pl => pl.lines?.flatMap(l => l.stations || []) || []).length
  const filledStations = assignments.length
  const fillRate = totalStations > 0 ? Math.round((filledStations / totalStations) * 100) : 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Fabrika Planı</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {filledStations}/{totalStations} istasyon dolu
            <span className="ml-2 text-blue-600 font-medium">%{fillRate}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tarih */}
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Vardiya */}
          <div className="relative">
            <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {shifts.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0,5)}–{s.end_time.slice(0,5)})</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        {Object.entries(levelColors).map(([lvl, c]) => (
          <div key={lvl} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: c.bg, borderColor: c.border }} />
            <span className="text-xs text-gray-500">
              {['Eğitime İhtiyacı Var', 'Gözetim Altında', 'Çalışabilir', 'Eğitim Verebilir'][lvl]}
            </span>
          </div>
        ))}
      </div>

      {/* Fabrika planı */}
      <div className="space-y-6">
        {productionLines.map(pl => (
          <div key={pl.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">{pl.name}</h2>
            </div>
            <div className="p-5 space-y-5">
              {(pl.lines || []).map(hat => (
                <div key={hat.id}>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{hat.name}</h3>
                  <div className="flex flex-wrap gap-3">
                    {(hat.stations || []).map(st => (
                      <StationCard
                        key={st.id}
                        station={st}
                        assignment={getAssignment(st.id)}
                        employees={employees}
                        competencies={competencies}
                        onAssign={handleAssign}
                        onRemove={handleRemove}
                        canEdit={canEdit}
                      />
                    ))}
                    {!hat.stations?.length && (
                      <p className="text-xs text-gray-400">Bu hatta istasyon tanımlanmamış.</p>
                    )}
                  </div>
                </div>
              ))}
              {!pl.lines?.length && <p className="text-sm text-gray-400">Hat tanımlanmamış.</p>}
            </div>
          </div>
        ))}
        {!productionLines.length && (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400 text-sm">
            Henüz üretim kolu tanımlanmamış. Ayarlar sayfasından ekleyebilirsiniz.
          </div>
        )}
      </div>
    </div>
  )
}
