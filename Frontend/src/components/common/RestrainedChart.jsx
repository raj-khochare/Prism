import React from 'react';

/**
 * Restrained SVG Line and Bar charts for technical telemetry.
 * Zero gradients, zero 3D, strictly semantic solid colors.
 * Explicitly designed to answer specific analytical questions.
 */
export default function RestrainedChart({
  data = [],
  dataKey = 'velocity',
  timeKey = 'time',
  title = '',
  question = '',
  unit = '',
  color = 'var(--accent-teal)',
  height = 160,
  warningThreshold = null,
  criticalThreshold = null
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
        No telemetry series available for current window.
      </div>
    );
  }

  const values = data.map(d => Number(d[dataKey]) || 0);
  const minVal = 0;
  const rawMax = Math.max(...values, warningThreshold || 0, criticalThreshold || 0);
  const maxVal = rawMax > 0 ? rawMax * 1.25 : 100;

  const width = 500;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 22;
  const paddingBottom = 26;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getX = (index) => paddingLeft + (index / Math.max(data.length - 1, 1)) * chartW;
  const getY = (val) => paddingTop + chartH - ((val - minVal) / Math.max(maxVal - minVal, 1)) * chartH;

  const points = data.map((d, i) => `${getX(i)},${getY(d[dataKey])}`).join(' ');

  // 3 distinct horizontal grid lines
  const gridTicks = [0, 0.5, 1.0].map(ratio => Math.round(minVal + ratio * (maxVal - minVal)));
  const latestValue = values[values.length - 1];
  const isLatestCritical = criticalThreshold && latestValue >= criticalThreshold;
  const isLatestWarning = warningThreshold && latestValue >= warningThreshold;

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          {title && (
            <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {title}
            </div>
          )}
          {question && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 600 }}>
              {question}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
          <span
            style={{
              fontSize: '15px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 900,
              color: isLatestCritical ? 'var(--accent-red)' : isLatestWarning ? 'var(--accent-amber)' : 'var(--text-primary)',
              backgroundColor: isLatestCritical ? 'var(--accent-coral)' : isLatestWarning ? 'var(--accent-yellow)' : 'var(--bg-elevated)',
              padding: '2px 8px',
              border: '1.5px solid #111111',
              boxShadow: '1.5px 1.5px 0px #111111',
              display: 'inline-block'
            }}
          >
            {latestValue} {unit}
          </span>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '3px' }}>Latest Sample</div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: '100%',
          height,
          display: 'block',
          backgroundColor: '#FAF8F3',
          borderRadius: 'var(--radius-xs)',
          border: '2px solid var(--border-default)',
          boxShadow: '2px 2px 0px #111111'
        }}
      >
        {/* Horizontal gridlines */}
        {gridTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#DDD9CC"
                strokeWidth="1.5"
                strokeDasharray={idx === 0 ? 'none' : '3 3'}
              />
              <text
                x={paddingLeft - 8}
                y={y + 3}
                fill="#4A4E50"
                fontSize="9"
                fontFamily="var(--font-mono)"
                fontWeight="bold"
                textAnchor="end"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Warning Threshold */}
        {warningThreshold && (
          <g>
            <line
              x1={paddingLeft}
              y1={getY(warningThreshold)}
              x2={width - paddingRight}
              y2={getY(warningThreshold)}
              stroke="var(--accent-amber)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <text
              x={width - paddingRight}
              y={getY(warningThreshold) - 5}
              fill="#9A6505"
              fontSize="8"
              fontFamily="var(--font-mono)"
              fontWeight="900"
              textAnchor="end"
            >
              WARN: {warningThreshold}
            </text>
          </g>
        )}

        {/* Critical Threshold */}
        {criticalThreshold && (
          <g>
            <line
              x1={paddingLeft}
              y1={getY(criticalThreshold)}
              x2={width - paddingRight}
              y2={getY(criticalThreshold)}
              stroke="var(--accent-red)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <text
              x={width - paddingRight - 85}
              y={getY(criticalThreshold) - 5}
              fill="#C42A2A"
              fontSize="8"
              fontFamily="var(--font-mono)"
              fontWeight="900"
              textAnchor="end"
            >
              CRIT: {criticalThreshold}
            </text>
          </g>
        )}

        {/* Flat polyline chart stroke - Solid colors, NO GRADIENTS */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="square"
          points={points}
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = getX(i);
          const y = getY(d[dataKey]);
          const isWarning = warningThreshold && d[dataKey] >= warningThreshold;
          const isCritical = criticalThreshold && d[dataKey] >= criticalThreshold;
          const ptColor = isCritical ? 'var(--accent-red)' : isWarning ? 'var(--accent-yellow)' : color;

          return (
            <g key={i}>
              <rect
                x={x - 3}
                y={y - 3}
                width={6}
                height={6}
                fill={ptColor}
                stroke="#111111"
                strokeWidth="1.5"
              />
              {(i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) && (
                <text
                  x={x}
                  y={height - 7}
                  fill="#4A4E50"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {d[timeKey]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
