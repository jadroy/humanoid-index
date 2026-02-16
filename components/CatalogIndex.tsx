"use client";

import { Humanoid } from "@/data/humanoids";

interface CatalogIndexProps {
  humanoids: Humanoid[];
  legends: Humanoid[];
}

function formatSpecs(h: Humanoid): string[] {
  const specs: string[] = [];
  if (h.height) specs.push(`H${h.height}cm`);
  if (h.weight) specs.push(`W${h.weight}kg`);
  if (h.dof) specs.push(`${h.dof} DOF`);
  if (h.maxSpeed) specs.push(`${h.maxSpeed}m/s`);
  return specs;
}

export default function CatalogIndex({ humanoids, legends }: CatalogIndexProps) {
  const allBots = [...humanoids, ...legends];

  return (
    <section className="w-full border-t border-neutral-200 bg-white">
      {/* Header */}
      <div className="px-8 md:px-16 lg:px-24 pt-16 pb-10">
        <div className="flex items-baseline justify-between">
          <div className="font-mono">
            <div className="text-[11px] uppercase tracking-wider text-neutral-400">Reference</div>
            <div className="text-[22px] tracking-tight text-neutral-900 leading-none mt-1">Index</div>
          </div>
          <div className="font-mono text-[10px] text-neutral-300 uppercase tracking-wider">
            {allBots.length} Units Cataloged
          </div>
        </div>
        <div className="h-px bg-neutral-200 mt-6" />
      </div>

      {/* Catalog Grid */}
      <div className="px-8 md:px-16 lg:px-24 pb-8">
        <div
          className="grid gap-x-6 gap-y-0"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
        >
          {allBots.map((bot, i) => {
            const idx = String(i + 1).padStart(2, '0');
            const specs = formatSpecs(bot);
            const isLegend = bot.id.startsWith('legend');

            return (
              <div
                key={bot.id}
                className="font-mono py-4 border-t border-neutral-100 group"
                style={{
                  opacity: 0,
                  animation: `grid-item-in 300ms ease-out ${i * 20}ms forwards`,
                }}
              >
                {/* Index number */}
                <div className="text-[9px] text-neutral-300 mb-1.5">[{idx}]</div>

                {/* Name + Manufacturer */}
                <div className="text-[12px] leading-tight text-neutral-900 font-medium">
                  {bot.name}
                </div>
                <div className="text-[11px] leading-tight text-neutral-400 mt-0.5">
                  {bot.manufacturer}
                </div>

                {/* Specs block */}
                <div className="text-[9px] leading-[1.7] text-neutral-400 mt-2 flex flex-col">
                  {bot.year && (
                    <span>{bot.year}{bot.status === 'Discontinued' ? ' · Discontinued' : ''}</span>
                  )}
                  {specs.length > 0 && (
                    <span>{specs.join(' · ')}</span>
                  )}
                  {bot.cost && bot.cost !== 'N/A' && (
                    <span className="text-neutral-500">{bot.cost}</span>
                  )}
                  {isLegend && (
                    <span className="text-neutral-300 italic">Legend</span>
                  )}
                </div>

                {/* Link */}
                {bot.purchaseUrl && (
                  <a
                    href={bot.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[9px] text-neutral-400 hover:text-neutral-900 underline underline-offset-2 decoration-neutral-200 hover:decoration-neutral-400 transition-colors mt-1.5"
                  >
                    Order →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / Colophon */}
      <div className="px-8 md:px-16 lg:px-24 py-12 border-t border-neutral-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 font-mono text-[9px] text-neutral-300 uppercase tracking-wider leading-relaxed">
          <div className="flex flex-col gap-1">
            <span className="text-neutral-400">Classification</span>
            <span>Bipedal Humanoid</span>
            <span>Wheeled Humanoid</span>
            <span>Social Robot</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-neutral-400">Status Key</span>
            <span>In Production</span>
            <span>Prototype</span>
            <span>Discontinued</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-neutral-400">Metrics</span>
            <span>DOF — Degrees of Freedom</span>
            <span>H — Height (cm)</span>
            <span>W — Weight (kg)</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-neutral-400">Data</span>
            <span>{humanoids.length} Active Units</span>
            <span>{legends.length} Legends</span>
            <span>{allBots.filter(b => b.purchaseUrl).length} Available to Order</span>
          </div>
        </div>
      </div>

      {/* Bottom mark */}
      <div className="px-8 md:px-16 lg:px-24 pb-16 pt-4">
        <div className="h-px bg-neutral-100 mb-6" />
        <div className="font-mono text-[9px] text-neutral-200 uppercase tracking-widest text-center">
          Humanoid Index — {new Date().getFullYear()}
        </div>
      </div>
    </section>
  );
}
