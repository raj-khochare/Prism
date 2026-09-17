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
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
        No telemetry series available for current window.
      </div>
    );
  }

  const values = data.map(d => Number(d[dataKey]) || 0);
  const minVal = 0;
  const maxVal = Math.max(...values, warningThreshold || 0, criticalThreshold || 0) * 1.15 || 100;

  const width = 500;
  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 16;
  const paddingBottom = 22;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getX = (index) => paddingLeft + (index / (data.length - 1)) * chartW;
  const getY = (val) => paddingTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  const points = data.map((d, i) => `${getX(i)},${getY(d[dataKey])}`).join(' ');

  // 4 horizontal grid lines
  const gridTicks = [0, 0.33, 0.66, 1].map(ratio => minVal + ratio * (maxVal - minVal));
  const latestValue = values[values.length - 1];
  const isLatestCritical = criticalThreshold && latestValue >= criticalThreshold;
  const isLatestWarning = warningThreshold && latestValue >= warningThreshold;

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div>
          {title && (
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {title}
            </div>
          )}
          {question && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
              {question}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: isLatestCritical ? 'var(--accent-red)' : isLatestWarning ? 'var(--accent-sand)' : color
            }}
          >
            {latestValue} {unit}
          </span>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Latest sample</div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: '100%',
          height,
          display: 'block',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
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
                stroke="var(--border-subtle)"
                strokeWidth="1"
                strokeDasharray={idx === 0 ? 'none' : '2 3'}
              />
              <text
                x={paddingLeft - 6}
                y={y + 3}
                fill="var(--text-muted)"
                fontSize="9"
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                {Math.round(val)}
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
              stroke="var(--accent-sand)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={width - paddingRight}
              y={getY(warningThreshold) - 3}
              fill="var(--accent-sand)"
              fontSize="8"
              fontFamily="var(--font-mono)"
              textAnchor="end"
            >
              Warning Threshold ({warningThreshold})
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
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={width - paddingRight}
              y={getY(criticalThreshold) - 3}
              fill="var(--accent-red)"
              fontSize="8"
              fontFamily="var(--font-mono)"
              textAnchor="end"
            >
              Critical Threshold ({criticalThreshold})
            </text>
          </g>
        )}

        {/* Flat polyline chart stroke - Solid colors, NO GRADIENTS */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = getX(i);
          const y = getY(d[dataKey]);
          const isWarning = warningThreshold && d[dataKey] >= warningThreshold;
          const isCritical = criticalThreshold && d[dataKey] >= criticalThreshold;
          const ptColor = isCritical ? 'var(--accent-red)' : isWarning ? 'var(--accent-sand)' : color;

          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={i === data.length - 1 ? 4 : 2.5}
                fill={ptColor}
                stroke="var(--bg-secondary)"
                strokeWidth="1"
              />
              {(i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) && (
                <text
                  x={x}
                  y={height - 6}
                  fill="var(--text-muted)"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
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
