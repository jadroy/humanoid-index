"use client";

import { useState } from "react";
import Link from "next/link";
import { Humanoid } from "@/data/humanoids";

interface CatalogIndexProps {
  humanoids: Humanoid[];
}

export default function CatalogIndex({ humanoids }: CatalogIndexProps) {
  const allBots = humanoids;
  const legends = allBots.filter(b => b.id.startsWith('legend'));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group by status
  const inProduction = allBots.filter(b => b.status === 'In Production');
  const prototypes = allBots.filter(b => b.status === 'Prototype');
  const discontinued = allBots.filter(b => b.status === 'Discontinued');

  // Stats
  const avgHeight = Math.round(allBots.filter(b => b.height).reduce((s, b) => s + (b.height || 0), 0) / allBots.filter(b => b.height).length);
  const avgWeight = Math.round(allBots.filter(b => b.weight).reduce((s, b) => s + (b.weight || 0), 0) / allBots.filter(b => b.weight).length);
  const maxDof = Math.max(...allBots.filter(b => b.dof).map(b => b.dof!));
  const maxSpeed = Math.max(...allBots.filter(b => b.maxSpeed).map(b => b.maxSpeed!));

  return (
    <section className="w-full bg-neutral-50 border-t border-neutral-200">

      {/* ═══ HEADER ═══ */}
      <div className="px-6 md:px-12 lg:px-20 pt-20 pb-6">
        <div className="flex items-end justify-between gap-8">
          <div className="font-mono">
            <div className="text-[9px] uppercase tracking-widest text-neutral-300 mb-1">Ref. Catalog</div>
            <div className="text-[32px] tracking-tight text-neutral-900 leading-none font-light">Index</div>
          </div>
          <div className="font-mono text-[9px] text-neutral-300 uppercase tracking-wider text-right leading-relaxed">
            <div>{allBots.length} units</div>
            <div>{inProduction.length} production · {prototypes.length} prototype · {discontinued.length} legacy</div>
          </div>
        </div>
      </div>

      {/* ═══ AGGREGATE STATS BAR ═══ */}
      <div className="px-6 md:px-12 lg:px-20 pb-10">
        <div className="border-t border-b border-neutral-200 py-4 grid grid-cols-2 md:grid-cols-4 gap-6 font-mono">
          {[
            { label: 'Avg. Height', value: `${avgHeight}cm` },
            { label: 'Avg. Weight', value: `${avgWeight}kg` },
            { label: 'Max DOF', value: maxDof },
            { label: 'Top Speed', value: `${maxSpeed}m/s` },
          ].map(s => (
            <div key={s.label}>
              <div className="text-[9px] uppercase tracking-wider text-neutral-300">{s.label}</div>
              <div className="text-[18px] text-neutral-800 leading-none mt-1 font-light">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CATALOG ENTRIES — thumbnail + data ═══ */}
      <div className="px-6 md:px-12 lg:px-20 pb-12">
        <div
          className="grid gap-x-4 gap-y-0"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
        >
          {allBots.map((bot, i) => {
            const idx = String(i + 1).padStart(2, '0');
            const isHovered = hoveredId === bot.id;
            const isLegend = bot.id.startsWith('legend');

            return (
              <Link
                key={bot.id}
                href={`/robot/${bot.id}`}
                className="group relative font-mono flex gap-3 py-4 border-t border-neutral-200/60 cursor-pointer"
                style={{
                  opacity: 0,
                  animation: `grid-item-in 300ms ease-out ${i * 15}ms forwards`,
                }}
                onMouseEnter={() => setHoveredId(bot.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Thumbnail */}
                <div
                  className="flex-shrink-0 w-[52px] h-[52px] rounded-sm overflow-hidden flex items-center justify-center bg-white border border-neutral-100"
                  style={{
                    transition: 'border-color 150ms ease',
                    borderColor: isHovered ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.06)',
                  }}
                >
                  <img
                    src={bot.imageUrl || "/robots/placeholder.png"}
                    alt={bot.name}
                    draggable={false}
                    className="w-full h-full object-contain p-1"
                    style={{
                      transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[9px] text-neutral-300">[{idx}]</span>
                      <span className="text-[11px] text-neutral-900 font-medium truncate">{bot.name}</span>
                    </div>
                    <div className="text-[9px] text-neutral-400 truncate mt-0.5">
                      by {bot.manufacturer}
                      {bot.year ? ` · ${bot.year}` : ''}
                      {isLegend ? ' · Legend' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {bot.height && <span className="text-[8px] text-neutral-300">{bot.height}cm</span>}
                    {bot.weight && <span className="text-[8px] text-neutral-300">{bot.weight}kg</span>}
                    {bot.dof && <span className="text-[8px] text-neutral-300">{bot.dof}DOF</span>}
                    {bot.maxSpeed && <span className="text-[8px] text-neutral-300">{bot.maxSpeed}m/s</span>}
                    {bot.description && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExpandedId(expandedId === bot.id ? null : bot.id);
                        }}
                        className="text-[8px] text-neutral-300 hover:text-neutral-500 transition-colors ml-auto"
                      >
                        {expandedId === bot.id ? '▾ info' : '▸ info'}
                      </button>
                    )}
                    {bot.cost && bot.cost !== 'N/A' && !bot.description && (
                      <span className="text-[8px] text-neutral-500 ml-auto">{bot.cost}</span>
                    )}
                    {bot.cost && bot.cost !== 'N/A' && bot.description && (
                      <span className="text-[8px] text-neutral-500">{bot.cost}</span>
                    )}
                  </div>
                  {expandedId === bot.id && bot.description && (
                    <div className="text-[9px] text-neutral-400 leading-relaxed mt-1.5 pr-4">
                      {bot.description}
                    </div>
                  )}
                </div>

                {/* Hover arrow */}
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-neutral-300"
                  style={{
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'translate(0, -50%)' : 'translate(-4px, -50%)',
                    transition: isHovered
                      ? 'opacity 60ms ease-out, transform 80ms cubic-bezier(0.16, 1, 0.3, 1)'
                      : 'opacity 120ms ease-in, transform 150ms ease-in',
                  }}
                >
                  →
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ═══ TIMELINE ═══ */}
      <div className="px-6 md:px-12 lg:px-20 pb-12">
        <div className="border-t border-neutral-200 pt-8">
          <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-300 mb-6">Timeline</div>
          <div className="relative">
            {/* Line */}
            <div className="absolute top-[6px] left-0 right-0 h-px bg-neutral-200" />
            <div className="flex justify-between">
              {(() => {
                const years = [...new Set(allBots.filter(b => b.year).map(b => b.year!))].sort();
                return years.map(year => {
                  const count = allBots.filter(b => b.year === year).length;
                  const names = allBots.filter(b => b.year === year).map(b => b.name);
                  return (
                    <div key={year} className="flex flex-col items-center relative group/yr">
                      <div
                        className="w-[7px] h-[7px] rounded-full border-2 border-neutral-300 bg-white relative z-10"
                        style={{ borderWidth: count > 2 ? '3px' : '2px' }}
                      />
                      <div className="font-mono text-[9px] text-neutral-400 mt-2">{year}</div>
                      <div className="font-mono text-[8px] text-neutral-300 mt-0.5">{count}×</div>
                      {/* Tooltip */}
                      <div
                        className="absolute top-full mt-4 left-1/2 -translate-x-1/2 bg-white border border-neutral-200 rounded px-3 py-2 opacity-0 group-hover/yr:opacity-100 transition-opacity duration-100 pointer-events-none whitespace-nowrap z-20 shadow-sm"
                      >
                        <div className="font-mono text-[8px] text-neutral-500 flex flex-col gap-0.5">
                          {names.map(n => <span key={n}>{n}</span>)}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ LEGEND / KEY ═══ */}
      <div className="px-6 md:px-12 lg:px-20 py-10 border-t border-neutral-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 font-mono text-[8px] text-neutral-300 uppercase tracking-wider leading-relaxed">
          <div className="flex flex-col gap-1.5">
            <span className="text-neutral-400 text-[9px]">Status</span>
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-neutral-800" /> In Production</span>
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-neutral-400" /> Prototype</span>
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-neutral-200" /> Discontinued</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-neutral-400 text-[9px]">Metrics</span>
            <span>DOF — Degrees of Freedom</span>
            <span>H — Height in centimeters</span>
            <span>W — Weight in kilograms</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-neutral-400 text-[9px]">Data</span>
            <span>{humanoids.length} Active units</span>
            <span>{legends.length} Hall of fame</span>
            <span>{allBots.filter(b => b.purchaseUrl).length} Available to order</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-neutral-400 text-[9px]">Coverage</span>
            <span>{allBots.filter(b => b.year && b.year >= 2023).length} Units from 2023+</span>
            <span>{allBots.filter(b => b.dof).length}/{allBots.length} with DOF data</span>
            <span>{allBots.filter(b => b.cost && b.cost !== 'N/A').length} with pricing</span>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM MARK ═══ */}
      <div className="px-6 md:px-12 lg:px-20 pb-20 pt-4">
        <div className="h-px bg-neutral-200 mb-8" />
        <div className="font-mono text-[9px] text-neutral-200 uppercase tracking-[0.2em] text-center">
          Humanoid Index — {new Date().getFullYear()}
        </div>
      </div>
    </section>
  );
}
