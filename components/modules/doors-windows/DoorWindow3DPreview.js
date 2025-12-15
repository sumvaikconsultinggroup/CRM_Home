'use client'

import { useRef } from 'react'

// Dynamic SVG-based 3D-like preview with enhanced visuals and glass type support
export function DoorWindow3DPreview({ config, className = '' }) {
  const containerRef = useRef(null)

  const {
    type = 'Window',
    category = 'Sliding',
    width = 1200,
    height = 1500,
    panels = 2,
    frameColor = 'white',
    material = 'Aluminium',
    glassType = 'single',
    panelConfig = []
  } = config || {}

  // Frame colors mapping
  const frameColors = {
    white: { fill: '#f5f5f5', stroke: '#e0e0e0', shadow: '#d0d0d0' },
    black: { fill: '#2a2a2a', stroke: '#1a1a1a', shadow: '#0a0a0a' },
    grey: { fill: '#808080', stroke: '#606060', shadow: '#404040' },
    brown: { fill: '#8B4513', stroke: '#654321', shadow: '#4a3015' },
    silver: { fill: '#C0C0C0', stroke: '#a0a0a0', shadow: '#808080' },
    bronze: { fill: '#CD7F32', stroke: '#a06020', shadow: '#805010' },
    champagne: { fill: '#F7E7CE', stroke: '#d7c7ae', shadow: '#b7a78e' },
    woodgrain: { fill: '#DEB887', stroke: '#be9867', shadow: '#9e7847' }
  }

  // Glass colors and opacity based on glass type
  const glassStyles = {
    'single': { color: '#b8d4fe', opacity: 0.35, pattern: null },
    'double': { color: '#93c5fd', opacity: 0.3, pattern: 'double-line' },
    'triple': { color: '#60a5fa', opacity: 0.28, pattern: 'triple-line' },
    'laminated': { color: '#fef3c7', opacity: 0.4, pattern: 'laminated' },
    'tinted': { color: '#1e3a5f', opacity: 0.6, pattern: null },
    'reflective': { color: '#94a3b8', opacity: 0.5, pattern: 'reflective' },
    'low-e': { color: '#a5f3fc', opacity: 0.32, pattern: 'lowe' },
    'acoustic': { color: '#c4b5fd', opacity: 0.35, pattern: 'acoustic' },
    'toughened': { color: '#bbf7d0', opacity: 0.32, pattern: null },
    'frosted': { color: '#e2e8f0', opacity: 0.75, pattern: 'frosted' }
  }

  const colors = frameColors[frameColor] || frameColors.white
  const glassStyle = glassStyles[glassType] || glassStyles['single']

  // SVG dimensions
  const svgWidth = 280
  const svgHeight = 320
  const padding = 40
  
  const maxDrawWidth = svgWidth - padding * 2
  const maxDrawHeight = svgHeight - padding * 2 - 30
  const scale = Math.min(maxDrawWidth / width, maxDrawHeight / height)
  
  const drawWidth = width * scale
  const drawHeight = height * scale
  const frameThickness = Math.max(8, 50 * scale)
  
  const startX = (svgWidth - drawWidth) / 2
  const startY = (svgHeight - drawHeight) / 2 - 10

  const innerWidth = drawWidth - frameThickness * 2
  const innerHeight = drawHeight - frameThickness * 2
  const panelWidth = innerWidth / panels
  const panelGap = 3

  const isDoor = type === 'Door'

  // Get panel config for specific panel
  const getPanelConfig = (index) => {
    return panelConfig[index] || { type: 'fixed', openDirection: 'left', glassType: glassType }
  }

  // Glass type label
  const glassLabel = {
    'single': 'Single', 'double': 'DGU', 'triple': 'Triple', 'laminated': 'Lam',
    'tinted': 'Tint', 'reflective': 'Refl', 'low-e': 'Low-E', 'acoustic': 'Acst',
    'toughened': 'Temp', 'frosted': 'Frost'
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full min-h-[280px] rounded-xl overflow-hidden ${className}`}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
        className="bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Definitions */}
        <defs>
          {/* Grid pattern */}
          <pattern id="grid3d" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e4e8" strokeWidth="0.5"/>
          </pattern>
          
          {/* Glass patterns based on type */}
          <pattern id="pattern-double-line" width="10" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="5" x2="10" y2="5" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4"/>
          </pattern>
          <pattern id="pattern-triple-line" width="10" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="3" x2="10" y2="3" stroke="#2563eb" strokeWidth="0.5" opacity="0.4"/>
            <line x1="0" y1="7" x2="10" y2="7" stroke="#2563eb" strokeWidth="0.5" opacity="0.4"/>
          </pattern>
          <pattern id="pattern-laminated" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#fef3c7" opacity="0.3"/>
            <line x1="0" y1="4" x2="8" y2="4" stroke="#f59e0b" strokeWidth="1" opacity="0.5"/>
          </pattern>
          <pattern id="pattern-reflective" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#cbd5e1"/>
            <line x1="0" y1="0" x2="8" y2="8" stroke="#fff" strokeWidth="0.8" opacity="0.5"/>
          </pattern>
          <pattern id="pattern-frosted" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="#fff" opacity="0.6"/>
            <circle cx="4.5" cy="4.5" r="1" fill="#fff" opacity="0.6"/>
            <circle cx="4.5" cy="1.5" r="0.5" fill="#fff" opacity="0.4"/>
            <circle cx="1.5" cy="4.5" r="0.5" fill="#fff" opacity="0.4"/>
          </pattern>
          <pattern id="pattern-acoustic" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="2" x2="8" y2="2" stroke="#8b5cf6" strokeWidth="0.3" opacity="0.5"/>
            <line x1="0" y1="4" x2="8" y2="4" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.6"/>
            <line x1="0" y1="6" x2="8" y2="6" stroke="#8b5cf6" strokeWidth="0.3" opacity="0.5"/>
          </pattern>
          <pattern id="pattern-lowe" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#a5f3fc" opacity="0.2"/>
            <circle cx="5" cy="5" r="2" fill="#06b6d4" opacity="0.15"/>
          </pattern>
          
          {/* Glass gradient for shine */}
          <linearGradient id="glassShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.4"/>
            <stop offset="50%" stopColor="#fff" stopOpacity="0.1"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0.2"/>
          </linearGradient>
          
          {/* Frame gradient for 3D effect */}
          <linearGradient id="frameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.fill}/>
            <stop offset="50%" stopColor={colors.stroke}/>
            <stop offset="100%" stopColor={colors.shadow}/>
          </linearGradient>
          
          {/* Drop shadow */}
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.2"/>
          </filter>
        </defs>

        {/* Background grid */}
        <rect width="100%" height="100%" fill="url(#grid3d)" />

        {/* Main frame group with shadow */}
        <g filter="url(#dropShadow)">
          {/* Outer frame - 3D effect */}
          <rect
            x={startX - 3}
            y={startY - 3}
            width={drawWidth + 6}
            height={drawHeight + 6}
            fill={colors.shadow}
            rx="3"
          />
          <rect
            x={startX}
            y={startY}
            width={drawWidth}
            height={drawHeight}
            fill="url(#frameGradient)"
            stroke={colors.stroke}
            strokeWidth="2"
            rx="2"
          />
          
          {/* Frame highlight for 3D depth */}
          <rect
            x={startX + 2}
            y={startY + 2}
            width={drawWidth - 4}
            height={2}
            fill="rgba(255,255,255,0.5)"
          />
          <rect
            x={startX + 2}
            y={startY + 2}
            width={2}
            height={drawHeight - 4}
            fill="rgba(255,255,255,0.3)"
          />

          {/* Inner frame area */}
          <rect
            x={startX + frameThickness}
            y={startY + frameThickness}
            width={innerWidth}
            height={innerHeight}
            fill="#1a365d"
            opacity="0.1"
          />

          {/* Glass Panels */}
          {Array.from({ length: panels }).map((_, i) => {
            const panelX = startX + frameThickness + (panelWidth * i) + panelGap / 2
            const panelY = startY + frameThickness + panelGap / 2
            const pWidth = panelWidth - panelGap
            const pHeight = innerHeight - panelGap
            
            const pConfig = getPanelConfig(i)
            const panelGlassType = pConfig.glassType || glassType
            const panelGlassStyle = glassStyles[panelGlassType] || glassStyles['single']
            const isOpenable = pConfig.type === 'openable' || (category !== 'Fixed' && (i === 0 || i === panels - 1))
            const openDirection = pConfig.openDirection || (i === 0 ? 'left' : 'right')
            const isFixed = pConfig.type === 'fixed' || category === 'Fixed'

            return (
              <g key={i}>
                {/* Panel frame */}
                <rect
                  x={panelX}
                  y={panelY}
                  width={pWidth}
                  height={pHeight}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="1.5"
                  rx="1"
                />
                
                {/* Glass base */}
                <rect
                  x={panelX + 6}
                  y={panelY + 6}
                  width={pWidth - 12}
                  height={pHeight - 12}
                  fill={panelGlassStyle.color}
                  opacity={panelGlassStyle.opacity}
                />
                
                {/* Glass pattern overlay */}
                {panelGlassStyle.pattern && (
                  <rect
                    x={panelX + 6}
                    y={panelY + 6}
                    width={pWidth - 12}
                    height={pHeight - 12}
                    fill={`url(#pattern-${panelGlassStyle.pattern})`}
                  />
                )}
                
                {/* Glass shine */}
                <rect
                  x={panelX + 6}
                  y={panelY + 6}
                  width={pWidth - 12}
                  height={pHeight - 12}
                  fill="url(#glassShine)"
                />
                
                {/* Glass reflection */}
                <rect
                  x={panelX + 8}
                  y={panelY + 8}
                  width={(pWidth - 16) * 0.3}
                  height={(pHeight - 16) * 0.5}
                  fill="rgba(255,255,255,0.25)"
                  rx="2"
                />

                {/* Opening direction indicator for openable panels */}
                {isOpenable && !isFixed && (
                  <>
                    <path
                      d={openDirection === 'left' 
                        ? `M ${panelX + pWidth - 8} ${panelY + 15} Q ${panelX + 12} ${panelY + pHeight/2} ${panelX + pWidth - 8} ${panelY + pHeight - 15}`
                        : openDirection === 'right'
                        ? `M ${panelX + 8} ${panelY + 15} Q ${panelX + pWidth - 12} ${panelY + pHeight/2} ${panelX + 8} ${panelY + pHeight - 15}`
                        : openDirection === 'top'
                        ? `M ${panelX + 15} ${panelY + pHeight - 8} Q ${panelX + pWidth/2} ${panelY + 12} ${panelX + pWidth - 15} ${panelY + pHeight - 8}`
                        : `M ${panelX + 15} ${panelY + 8} Q ${panelX + pWidth/2} ${panelY + pHeight - 12} ${panelX + pWidth - 15} ${panelY + 8}`
                      }
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1.5"
                      strokeDasharray="4,3"
                      opacity="0.7"
                    />
                    
                    {/* Handle */}
                    <rect
                      x={openDirection === 'left' ? panelX + pWidth - 14 : panelX + 6}
                      y={panelY + pHeight / 2 - 15}
                      width={8}
                      height={30}
                      fill="#4b5563"
                      rx="2"
                    />
                  </>
                )}

                {/* Fixed panel X indicator */}
                {isFixed && (
                  <g stroke="#9ca3af" strokeWidth="1" opacity="0.3">
                    <line
                      x1={panelX + 12}
                      y1={panelY + 12}
                      x2={panelX + pWidth - 12}
                      y2={panelY + pHeight - 12}
                    />
                    <line
                      x1={panelX + pWidth - 12}
                      y1={panelY + 12}
                      x2={panelX + 12}
                      y2={panelY + pHeight - 12}
                    />
                  </g>
                )}

                {/* Panel number label */}
                <text
                  x={panelX + pWidth / 2}
                  y={panelY + pHeight - 8}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#64748b"
                  fontWeight="500"
                >
                  P{i + 1}
                </text>
              </g>
            )
          })}

          {/* Door specific elements */}
          {isDoor && (
            <>
              <rect
                x={startX - 5}
                y={startY + drawHeight}
                width={drawWidth + 10}
                height={6}
                fill="#4b5563"
                rx="1"
              />
              
              {panels === 1 && (
                <g>
                  <rect
                    x={startX + drawWidth - frameThickness - 20}
                    y={startY + drawHeight / 2 - 25}
                    width={10}
                    height={50}
                    fill="#71717a"
                    rx="2"
                  />
                  <circle
                    cx={startX + drawWidth - frameThickness - 15}
                    cy={startY + drawHeight / 2}
                    r={6}
                    fill="#52525b"
                  />
                </g>
              )}
            </>
          )}

          {/* Sliding track indicator */}
          {category === 'Sliding' && (
            <>
              <line
                x1={startX + frameThickness}
                y1={startY + drawHeight - frameThickness + 3}
                x2={startX + drawWidth - frameThickness}
                y2={startY + drawHeight - frameThickness + 3}
                stroke="#64748b"
                strokeWidth="2"
              />
              <line
                x1={startX + frameThickness}
                y1={startY + frameThickness - 3}
                x2={startX + drawWidth - frameThickness}
                y2={startY + frameThickness - 3}
                stroke="#64748b"
                strokeWidth="2"
              />
            </>
          )}
        </g>

        {/* Dimension lines */}
        <g>
          <line
            x1={startX}
            y1={startY + drawHeight + 20}
            x2={startX + drawWidth}
            y2={startY + drawHeight + 20}
            stroke="#64748b"
            strokeWidth="1"
          />
          <line x1={startX} y1={startY + drawHeight + 15} x2={startX} y2={startY + drawHeight + 25} stroke="#64748b" strokeWidth="1" />
          <line x1={startX + drawWidth} y1={startY + drawHeight + 15} x2={startX + drawWidth} y2={startY + drawHeight + 25} stroke="#64748b" strokeWidth="1" />
          <text
            x={startX + drawWidth / 2}
            y={startY + drawHeight + 35}
            textAnchor="middle"
            fontSize="10"
            fill="#475569"
            fontWeight="600"
          >
            {width}mm
          </text>

          <line
            x1={startX + drawWidth + 15}
            y1={startY}
            x2={startX + drawWidth + 15}
            y2={startY + drawHeight}
            stroke="#64748b"
            strokeWidth="1"
          />
          <line x1={startX + drawWidth + 10} y1={startY} x2={startX + drawWidth + 20} y2={startY} stroke="#64748b" strokeWidth="1" />
          <line x1={startX + drawWidth + 10} y1={startY + drawHeight} x2={startX + drawWidth + 20} y2={startY + drawHeight} stroke="#64748b" strokeWidth="1" />
          <text
            x={startX + drawWidth + 28}
            y={startY + drawHeight / 2}
            textAnchor="middle"
            fontSize="10"
            fill="#475569"
            fontWeight="600"
            transform={`rotate(90, ${startX + drawWidth + 28}, ${startY + drawHeight / 2})`}
          >
            {height}mm
          </text>
        </g>

        {/* Info text */}
        <text
          x={svgWidth / 2}
          y={svgHeight - 8}
          textAnchor="middle"
          fontSize="9"
          fill="#64748b"
        >
          {((width / 304.8) * (height / 304.8)).toFixed(2)} sq.ft • {glassLabel[glassType] || 'Single'} Glass
        </text>
      </svg>

      {/* Info overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-slate-600 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
        <span className="font-medium">{type} • {category}</span>
        <span className="text-slate-500">{panels} Panels • {material}</span>
      </div>
      
      {/* Glass type badge */}
      <div className={`absolute top-2 right-2 text-xs rounded-full px-2 py-1 shadow-sm ${
        glassType === 'tinted' ? 'bg-slate-700 text-white' :
        glassType === 'frosted' ? 'bg-slate-200 text-slate-700' :
        glassType === 'reflective' ? 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800' :
        'bg-white/90 text-indigo-600'
      }`}>
        {glassLabel[glassType] || 'Single'} Glass
      </div>
    </div>
  )
}

export default DoorWindow3DPreview
