'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { 
  Menu, X, ChevronLeft, ChevronRight, LogOut, Building2
} from 'lucide-react'
import { useResponsive } from '@/hooks/use-responsive'

export function ResponsiveSidebar({ 
  menuItems, 
  activeTab, 
  onTabChange, 
  onLogout,
  logo,
  title = 'BuildCRM',
  variant = 'client' // 'client' | 'admin'
}) {
  const { isMobile, isTablet } = useResponsive()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    if (isTablet) {
      setSidebarOpen(false)
    } else if (!isMobile) {
      setSidebarOpen(true)
    }
  }, [isMobile, isTablet])

  const handleItemClick = (item) => {
    onTabChange(item)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const sidebarBgClass = variant === 'admin' 
    ? 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white'
    : 'bg-white border-r'

  const activeItemClass = variant === 'admin'
    ? 'bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/25'
    : 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-lg shadow-primary/25'

  const inactiveItemClass = variant === 'admin'
    ? 'hover:bg-white/10'
    : 'hover:bg-slate-100 text-slate-600'

  const SidebarContent = ({ collapsed = false }) => (
    <>
      {/* Logo/Header */}
      <div className={`p-4 lg:p-6 flex items-center gap-3 border-b ${variant === 'admin' ? 'border-white/10' : 'border-slate-200'}`}>
        <div className={`p-2 rounded-xl ${variant === 'admin' ? 'bg-gradient-to-br from-primary to-indigo-600' : 'bg-gradient-to-br from-primary to-indigo-600'}`}>
          {logo || <Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-white" />}
        </div>
        {!collapsed && <span className="text-lg lg:text-xl font-bold truncate">{title}</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 lg:p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? activeItemClass
                : item.isModule 
                  ? 'hover:bg-amber-100 text-amber-700 bg-amber-50 border border-amber-200'
                  : item.isChat
                    ? 'hover:bg-emerald-100 text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : inactiveItemClass
            }`}
            whileHover={{ x: collapsed ? 0 : 5 }}
            whileTap={{ scale: 0.98 }}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-sm lg:text-base truncate">{item.label}</span>
                {item.badge > 0 && (
                  <Badge className="bg-red-500 text-white text-xs">{item.badge}</Badge>
                )}
              </>
            )}
          </motion.button>
        ))}
      </nav>

      {/* Logout Button */}
      <div className={`p-2 lg:p-4 border-t ${variant === 'admin' ? 'border-white/10' : 'border-slate-200'}`}>
        <motion.button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-colors ${
            variant === 'admin' 
              ? 'hover:bg-red-500/20 text-red-400' 
              : 'hover:bg-red-50 text-red-600'
          }`}
          whileHover={{ x: collapsed ? 0 : 5 }}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm lg:text-base">Logout</span>}
        </motion.button>
      </div>
    </>
  )

  // Mobile: Use Sheet/Drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <div className={`fixed top-0 left-0 right-0 z-50 ${variant === 'admin' ? 'bg-slate-900' : 'bg-white'} border-b px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileOpen(true)}
              className={variant === 'admin' ? 'text-white hover:bg-white/10' : ''}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className={`p-1.5 rounded-lg ${variant === 'admin' ? 'bg-gradient-to-br from-primary to-indigo-600' : 'bg-gradient-to-br from-primary to-indigo-600'}`}>
              {logo || <Building2 className="h-4 w-4 text-white" />}
            </div>
            <span className={`font-bold ${variant === 'admin' ? 'text-white' : ''}`}>{title}</span>
          </div>
        </div>

        {/* Mobile Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className={`p-0 w-[280px] ${sidebarBgClass}`}>
            <SidebarContent collapsed={false} />
          </SheetContent>
        </Sheet>

        {/* Spacer for fixed header */}
        <div className="h-14" />
      </>
    )
  }

  // Tablet & Desktop: Collapsible Sidebar
  return (
    <motion.aside 
      className={`${sidebarOpen ? 'w-64 lg:w-72' : 'w-16 lg:w-20'} ${sidebarBgClass} transition-all duration-300 flex flex-col shadow-xl relative hidden md:flex`}
      initial={{ x: -100 }}
      animate={{ x: 0 }}
    >
      <SidebarContent collapsed={!sidebarOpen} />
      
      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${
          variant === 'admin' 
            ? 'bg-slate-700 text-white hover:bg-slate-600' 
            : 'bg-white border text-slate-600 hover:bg-slate-50'
        }`}
      >
        {sidebarOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
    </motion.aside>
  )
}

// Responsive Header Component
export function ResponsiveHeader({
  title,
  subtitle,
  leftContent,
  rightContent,
  onMenuClick,
  showMenuButton = true
}) {
  const { isMobile } = useResponsive()

  return (
    <motion.header 
      className={`bg-white/80 backdrop-blur-xl border-b px-3 lg:px-6 py-3 lg:py-4 flex justify-between items-center sticky top-0 z-10 ${isMobile ? 'mt-14' : ''}`}
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex items-center gap-2 lg:gap-4 min-w-0">
        {showMenuButton && !isMobile && onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="flex-shrink-0">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {leftContent}
        <div className="min-w-0">
          <h1 className="text-base lg:text-xl font-bold truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs lg:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
        {rightContent}
      </div>
    </motion.header>
  )
}

// Responsive Content Container
export function ResponsiveContent({ children, className = '' }) {
  const { isMobile, isTablet } = useResponsive()
  
  return (
    <div className={`p-3 sm:p-4 lg:p-6 ${className}`}>
      {children}
    </div>
  )
}

// Responsive Grid
export function ResponsiveGrid({ children, cols = { default: 1, sm: 2, md: 3, lg: 4 }, gap = 4, className = '' }) {
  const colClasses = `grid-cols-${cols.default} sm:grid-cols-${cols.sm || cols.default} md:grid-cols-${cols.md || cols.sm || cols.default} lg:grid-cols-${cols.lg || cols.md || cols.sm || cols.default}`
  
  return (
    <div className={`grid gap-${gap} ${colClasses} ${className}`}>
      {children}
    </div>
  )
}

// Mobile Bottom Navigation (optional for app-like experience)
export function MobileBottomNav({ items, activeTab, onTabChange }) {
  const { isMobile } = useResponsive()

  if (!isMobile) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t px-2 py-2 safe-area-inset-bottom">
      <div className="flex items-center justify-around">
        {items.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === item.id 
                ? 'text-primary bg-primary/10' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
