'use client'

import { useState, useRef, useLayoutEffect } from 'react'

// Dynamic SVG-based 3D-like preview with enhanced visuals
export function DoorWindow3DPreview({ config, className = '' }) {
  const [isClient, setIsClient] = useState(false)
  const containerRef = useRef(null)

  // Use layoutEffect to set client-side flag safely
  useLayoutEffect(() => {
    setIsClient(true)
  }, [])

  const {
    type = 'Window',
    category = 'Sliding',
    width = 1200,
    height = 1500,
    panels = 2,
    frameColor = 'white',
    material = 'Aluminium'
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

  const colors = frameColors[frameColor] || frameColors.white
  const glassColor = type === 'Door' ? '#9ec5fe' : '#b8d4fe'
  const glassBorder = '#4a90d9'

  // SVG dimensions
  const svgWidth = 280
  const svgHeight = 320
  const padding = 40
  
  // Calculate scale to fit
  const maxDrawWidth = svgWidth - padding * 2
  const maxDrawHeight = svgHeight - padding * 2 - 30 // Leave room for label
  const scale = Math.min(maxDrawWidth / width, maxDrawHeight / height)
  
  const drawWidth = width * scale
  const drawHeight = height * scale
  const frameThickness = Math.max(8, 50 * scale)
  
  const startX = (svgWidth - drawWidth) / 2
  const startY = (svgHeight - drawHeight) / 2 - 10

  // Generate panel positions
  const innerWidth = drawWidth - frameThickness * 2
  const innerHeight = drawHeight - frameThickness * 2
  const panelWidth = innerWidth / panels
  const panelGap = 3

  // Door specific adjustments
  const isDoor = type === 'Door'

  if (!isClient) {
    return (
      <div className={`relative w-full h-full min-h-[280px] rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-slate-500">Loading preview...</p>
        </div>
      </div>
    )
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
          
          {/* Glass gradient */}
          <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cce5ff" stopOpacity="0.6"/>
            <stop offset="50%" stopColor="#e6f2ff" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#b8d4fe" stopOpacity="0.5"/>
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
          
          {/* Inner shadow for depth */}
          <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feComponentTransfer in="SourceAlpha">
              <feFuncA type="table" tableValues="1 0"/>
            </feComponentTransfer>
            <feGaussianBlur stdDeviation="3"/>
            <feOffset dx="2" dy="2" result="offsetblur"/>
            <feFlood floodColor="#000" floodOpacity="0.3" result="color"/>
            <feComposite in2="offsetblur" operator="in"/>
            <feComposite in2="SourceAlpha" operator="in"/>
            <feMerge>
              <feMergeNode in="SourceGraphic"/>
              <feMergeNode/>
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <rect width="100%" height="100%" fill="url(#grid3d)" />

        {/* Main frame group with shadow */}
        <g filter="url(#dropShadow)">
          {/* Outer frame - 3D effect with multiple layers */}
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
            
            const isOpenable = category !== 'Fixed' && (i === 0 || i === panels - 1)
            const openDirection = i === 0 ? 'left' : 'right'

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
                
                {/* Glass */}
                <rect
                  x={panelX + 6}
                  y={panelY + 6}
                  width={pWidth - 12}
                  height={pHeight - 12}
                  fill="url(#glassGradient)"
                  stroke={glassBorder}
                  strokeWidth="1"
                  filter="url(#innerShadow)"
                />
                
                {/* Glass reflection */}
                <rect
                  x={panelX + 8}
                  y={panelY + 8}
                  width={(pWidth - 16) * 0.3}
                  height={(pHeight - 16) * 0.6}
                  fill="rgba(255,255,255,0.3)"
                  rx="2"
                />

                {/* Opening direction indicator for openable panels */}
                {isOpenable && category !== 'Fixed' && (
                  <>
                    {/* Opening arc */}
                    <path
                      d={openDirection === 'left' 
                        ? `M ${panelX + pWidth - 8} ${panelY + 15} Q ${panelX + 10} ${panelY + pHeight/2} ${panelX + pWidth - 8} ${panelY + pHeight - 15}`
                        : `M ${panelX + 8} ${panelY + 15} Q ${panelX + pWidth - 10} ${panelY + pHeight/2} ${panelX + 8} ${panelY + pHeight - 15}`
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

                {/* Fixed panel indicator */}
                {(category === 'Fixed' || (!isOpenable && panels > 2)) && (
                  <g stroke="#9ca3af" strokeWidth="1" opacity="0.4">
                    <line
                      x1={panelX + 10}
                      y1={panelY + 10}
                      x2={panelX + pWidth - 10}
                      y2={panelY + pHeight - 10}
                    />
                    <line
                      x1={panelX + pWidth - 10}
                      y1={panelY + 10}
                      x2={panelX + 10}
                      y2={panelY + pHeight - 10}
                    />
                  </g>
                )}
              </g>
            )
          })}

          {/* Door specific elements */}
          {isDoor && (
            <>
              {/* Door threshold */}
              <rect
                x={startX - 5}
                y={startY + drawHeight}
                width={drawWidth + 10}
                height={6}
                fill="#4b5563"
                rx="1"
              />
              
              {/* Door handle (if single panel) */}
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

          {/* Sliding track indicator for sliding type */}
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
          {/* Width dimension */}
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

          {/* Height dimension */}
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

        {/* Area text */}
        <text
          x={svgWidth / 2}
          y={svgHeight - 8}
          textAnchor="middle"
          fontSize="9"
          fill="#64748b"
        >
          Area: {((width / 304.8) * (height / 304.8)).toFixed(2)} sq.ft
        </text>
      </svg>

      {/* Info overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-slate-600 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
        <span className="font-medium">{type} • {category}</span>
        <span className="text-slate-500">{material}</span>
      </div>
      
      {/* Interaction hint */}
      <div className="absolute top-2 right-2 text-xs text-indigo-600 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
        ✨ 3D-Like Preview
      </div>
    </div>
  )
}

export default DoorWindow3DPreview
