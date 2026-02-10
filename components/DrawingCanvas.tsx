
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { GeometryData, Point } from '../types';

interface DrawingCanvasProps {
  data: GeometryData;
  id?: string;
  interactive?: boolean;
  selectedPointId?: string | null;
  onUpdatePointOffset?: (pointId: string, dx: number, dy: number) => void;
  onCanvasClick?: (x: number, y: number) => void;
  onPointSelect?: (id: string | null) => void;
  isIdentifying?: boolean;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  data,
  id,
  interactive,
  selectedPointId = null,
  onUpdatePointOffset,
  onCanvasClick,
  onPointSelect,
  isIdentifying
}) => {
  const points = data.points || [];
  const lines = data.lines || [];
  const circles = data.circles || [];
  const angles = data.angles || [];
  const equalSegments = data.equalSegments || [];


  const svgRef = useRef<SVGSVGElement>(null);

  const findPoint = (id: string): Point | undefined => points.find(p => p.id === id);

  const VIEW_SIZE = 400;
  const viewBox = `0 0 ${VIEW_SIZE} ${VIEW_SIZE}`;

  const getBaseLabelVector = (p: Point) => {
    const connectedPoints = lines
      .filter(l => l.p1 === p.id || l.p2 === p.id)
      .map(l => (l.p1 === p.id ? findPoint(l.p2) : findPoint(l.p1)))
      .filter((cp): cp is Point => !!cp);

    let outwardX = 0;
    let outwardY = 0;

    circles.forEach(c => {
      const center = findPoint(c.centerId);
      if (center && p.id !== center.id) {
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.1) {
          outwardX += dx / dist;
          outwardY += dy / dist;
        }
      }
    });

    if (connectedPoints.length > 0) {
      let sumDx = 0;
      let sumDy = 0;
      connectedPoints.forEach(cp => {
        const dx = cp.x - p.x;
        const dy = cp.y - p.y;
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
          sumDx += dx / mag;
          sumDy += dy / mag;
        }
      });
      outwardX -= sumDx;
      outwardY -= sumDy;
    }

    if (Math.abs(outwardX) < 0.01 && Math.abs(outwardY) < 0.01) outwardY = -1;
    const mag = Math.sqrt(outwardX * outwardX + outwardY * outwardY);
    return { dx: outwardX / (mag || 1), dy: outwardY / (mag || 1) };
  };

  const transform = useMemo(() => {
    if (points.length === 0) return { translate: { x: 0, y: 0 }, scale: 1 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const include = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    points.forEach(p => {
      include(p.x, p.y);
      const vec = getBaseLabelVector(p);
      const margin = 30;
      include(p.x + vec.dx * margin + (p.labelOffsetX || 0), p.y + vec.dy * margin + (p.labelOffsetY || 0));
    });

    circles.forEach(c => {
      const center = findPoint(c.centerId);
      if (center) {
        let r = 0;
        if (c.pointOnCircleId) {
          const pOnC = findPoint(c.pointOnCircleId);
          if (pOnC) r = Math.sqrt(Math.pow(pOnC.x - center.x, 2) + Math.pow(pOnC.y - center.y, 2));
        } else {
          r = c.radius || 80;
        }
        include(center.x - r, center.y - r);
        include(center.x + r, center.y + r);
      }
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const padding = 60;
    const available = VIEW_SIZE - padding;
    const scale = Math.min(available / (width || 1), available / (height || 1), 1.2);
    const tx = VIEW_SIZE / 2 - centerX * scale;
    const ty = VIEW_SIZE / 2 - centerY * scale;
    return { translate: { x: tx, y: ty }, scale };
  }, [points, lines, circles]);

  const handleSvgClick = (e: React.MouseEvent) => {
    if (!onCanvasClick || !svgRef.current || isIdentifying) return;

    const rect = svgRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const viewX = (screenX / rect.width) * VIEW_SIZE;
    const viewY = (screenY / rect.height) * VIEW_SIZE;

    const logicalX = (viewX - transform.translate.x) / transform.scale;
    const logicalY = (viewY - transform.translate.y) / transform.scale;

    onCanvasClick(logicalX, logicalY);
  };

  const getLabelCoords = (p: Point) => {
    const vec = getBaseLabelVector(p);
    const offset = 14;
    return {
      x: p.x + vec.dx * offset + (p.labelOffsetX || 0),
      y: p.y + vec.dy * offset + (p.labelOffsetY || 0)
    };
  };

  const renderTick = (p1: Point, p2: Point, count: number, index: number) => {
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return null;

    const nx = -dy / len;
    const ny = dx / len;
    const tickLen = 6;
    const spacing = 4;

    return (
      <g key={`equal-${index}`}>
        {Array.from({ length: count }).map((_, i) => {
          const shift = (i - (count - 1) / 2) * spacing;
          const sx = (dx / len) * shift;
          const sy = (dy / len) * shift;
          return (
            <line
              key={`tick-${index}-${i}`}
              x1={mx + sx + nx * tickLen}
              y1={my + sy + ny * tickLen}
              x2={mx + sx - nx * tickLen}
              y2={my + sy - ny * tickLen}
              stroke="black"
              strokeWidth="1.5"
            />
          );
        })}
      </g>
    );
  };

  const renderAngleArc = (v: Point, p1: Point, p2: Point, isEqual: boolean = false, radius: number = 22) => {
    const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);
    const a2 = Math.atan2(p2.y - v.y, p2.x - v.x);

    let diff = a2 - a1;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    while (diff > Math.PI) diff -= 2 * Math.PI;

    const sweepFlag = diff > 0 ? 1 : 0;
    const x1 = v.x + Math.cos(a1) * radius;
    const y1 = v.y + Math.sin(a1) * radius;
    const x2 = v.x + Math.cos(a2) * radius;
    const y2 = v.y + Math.sin(a2) * radius;

    // Midpoint for the tick mark
    const midA = a1 + diff / 2;
    const tickSize = 4;

    return (
      <g>
        <path
          d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 ${sweepFlag} ${x2} ${y2}`}
          fill="none"
          stroke="black"
          strokeWidth="1.5"
        />
        {isEqual && (
          <line
            x1={v.x + Math.cos(midA) * (radius - tickSize)}
            y1={v.y + Math.sin(midA) * (radius - tickSize)}
            x2={v.x + Math.cos(midA) * (radius + tickSize)}
            y2={v.y + Math.sin(midA) * (radius + tickSize)}
            stroke="black"
            strokeWidth="1.2"
          />
        )}
      </g>
    );
  };



  const selectedPoint = selectedPointId ? findPoint(selectedPointId) : null;

  return (
    <div id={id} className="w-full h-full bg-white flex items-center justify-center p-2 rounded-lg border border-slate-200 shadow-sm relative group overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className={`w-full h-full max-w-full max-h-full ${isIdentifying ? 'cursor-wait' : 'cursor-crosshair'}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        onClick={handleSvgClick}
      >

        <rect width="400" height="400" fill="white" />

        <g transform={`translate(${transform.translate.x}, ${transform.translate.y}) scale(${transform.scale})`}>

          {circles.map(c => {
            const center = findPoint(c.centerId);
            if (!center) return null;
            let r = 0;
            if (c.pointOnCircleId) {
              const pOnC = findPoint(c.pointOnCircleId);
              if (pOnC) r = Math.sqrt(Math.pow(pOnC.x - center.x, 2) + Math.pow(pOnC.y - center.y, 2));
            } else {
              r = c.radius || 80;
            }
            return <circle key={c.id} cx={center.x} cy={center.y} r={r} fill="none" stroke="black" strokeWidth="2" />;
          })}

          {lines.map(l => {
            const p1 = findPoint(l.p1), p2 = findPoint(l.p2);
            if (!p1 || !p2) return null;
            return <line key={l.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="black" strokeWidth="2" strokeLinecap="round" />;
          })}

          {equalSegments.map((e, idx) => {
            const p1 = findPoint(e.p1), p2 = findPoint(e.p2);
            return (p1 && p2) ? renderTick(p1, p2, e.count, idx) : null;
          })}

          {angles.map(a => {
            const v = findPoint(a.vertex), p1 = findPoint(a.p1), p2 = findPoint(a.p2);
            if (!v || !p1 || !p2) return null;
            if (a.isRight) {
              const size = 12;
              const d1 = Math.sqrt(Math.pow(p1.x - v.x, 2) + Math.pow(p1.y - v.y, 2));
              const d2 = Math.sqrt(Math.pow(p2.x - v.x, 2) + Math.pow(p2.y - v.y, 2));
              const dx1 = (p1.x - v.x) / d1, dy1 = (p1.y - v.y) / d1;
              const dx2 = (p2.x - v.x) / d2, dy2 = (p2.y - v.y) / d2;
              return <polyline key={a.id} points={`${v.x + dx1 * size},${v.y + dy1 * size} ${v.x + dx1 * size + dx2 * size},${v.y + dy1 * size + dy2 * size} ${v.x + dx2 * size},${v.y + dy2 * size}`} fill="none" stroke="black" strokeWidth="1.5" />;
            } else if (a.isEqual) {
              return <React.Fragment key={a.id}>{renderAngleArc(v, p1, p2, true)}</React.Fragment>;
            }
            return null;
          })}

          {points.map(p => {
            const coords = getLabelCoords(p);
            const isSelected = selectedPointId === p.id;
            return (
              <g key={p.id}>
                <circle cx={p.x} cy={p.y} r="3" fill="black" />
                <g
                  className={interactive ? "cursor-pointer" : ""}
                  onClick={(e) => {
                    if (interactive && onPointSelect) {
                      e.stopPropagation();
                      onPointSelect(p.id);
                    }
                  }}
                >
                  {isSelected && (
                    <rect
                      x={coords.x - 12} y={coords.y - 12} width="24" height="24"
                      fill="rgba(79, 70, 229, 0.1)" stroke="#4f46e5" strokeWidth="1" rx="4"
                    />
                  )}
                  <text
                    x={coords.x} y={coords.y}
                    fontSize="16" fontFamily="serif" fontStyle="italic"
                    textAnchor="middle" dominantBaseline="middle"
                    fill={isSelected ? "#4f46e5" : "black"}
                    fontWeight={isSelected ? "bold" : "normal"}
                    stroke="white" strokeWidth="4px" paintOrder="stroke"
                  >
                    {p.label}
                  </text>
                </g>
              </g>
            );
          })}

          {interactive && selectedPoint && onUpdatePointOffset && (
            <g transform={`translate(${selectedPoint.x}, ${selectedPoint.y})`}>
              <circle r="40" fill="rgba(255,255,255,0.7)" stroke="#cbd5e1" strokeDasharray="2,2" />
              {[
                { dir: 'N', dx: 0, dy: -1, icon: '\uf077', tx: 0, ty: -30 },
                { dir: 'E', dx: 1, dy: 0, icon: '\uf054', tx: 30, ty: 0 },
                { dir: 'S', dx: 0, dy: 1, icon: '\uf078', tx: 0, ty: 30 },
                { dir: 'W', dx: -1, dy: 0, icon: '\uf053', tx: -30, ty: 0 }
              ].map(btn => (
                <g
                  key={btn.dir}
                  className="cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdatePointOffset(selectedPoint.id, btn.dx * 2, btn.dy * 2);
                  }}
                >
                  <circle cx={btn.tx} cy={btn.ty} r="8" fill="#4f46e5" />
                  <text
                    x={btn.tx} y={btn.ty}
                    fontFamily="FontAwesome" fontSize="8" fill="white"
                    textAnchor="middle" dominantBaseline="central"
                  >
                    {btn.icon}
                  </text>
                </g>
              ))}
            </g>
          )}
        </g>
      </svg>

      {interactive && selectedPoint && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur border border-indigo-200 px-3 py-2 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
          <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Cân chỉnh nhãn {selectedPoint.label}</p>
          <div className="flex gap-2">
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">X: {selectedPoint.labelOffsetX || 0}</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">Y: {selectedPoint.labelOffsetY || 0}</span>
          </div>
          <p className="text-[8px] text-slate-400 mt-1 italic">Phím ESC để hủy chọn</p>
        </div>
      )}
      {isIdentifying && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg border border-indigo-100 flex items-center gap-2 animate-pulse">
            <i className="fa-solid fa-wand-magic-sparkles text-indigo-600"></i>
            <span className="text-xs font-bold text-indigo-600">Đang nhận diện vùng...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas;
