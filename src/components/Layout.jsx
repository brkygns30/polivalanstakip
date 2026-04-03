import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Factory, LayoutGrid, Users, ClipboardList, Settings, LogOut, ChevronRight } from 'lucide-react'

const roleLabel = { admin: 'Admin', ik_uretim: 'İK / Üretim', hat_yoneticisi: 'Hat Yöneticisi' }

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { to: '/', label: 'Fabrika Planı', icon: LayoutGrid, roles: ['admin', 'ik_uretim', 'hat_yoneticisi'] },
    { to: '/polivalans', label: 'Polivalans Matrisi', icon: ClipboardList, roles: ['admin', 'ik_uretim', 'hat_yoneticisi'] },
    { to: '/personel', label: 'Personel', icon: Users, roles: ['admin', 'ik_uretim'] },
    { to: '/ayarlar', label: 'Ayarlar', icon: Settings, roles: ['admin'] },
  ].filter(item => item.roles.includes(profile?.role))

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <Factory size={18} />
          </div>
          <span className="font-semibold text-gray-900 text-sm">Polivalans Takip</span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-gray-900 truncate">{profile?.full_name || 'Kullanıcı'}</p>
            <p className="text-xs text-gray-400">{roleLabel[profile?.role]}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
