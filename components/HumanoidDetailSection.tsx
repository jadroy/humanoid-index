"use client";

import { Humanoid } from "@/data/humanoids";

interface HumanoidDetailSectionProps {
  humanoid: Humanoid;
  isActive: boolean;
  onScrollUp?: () => void;
}

export default function HumanoidDetailSection({ humanoid, isActive, onScrollUp }: HumanoidDetailSectionProps) {
  return (
    <div className="min-h-screen w-full px-4 sm:px-8 md:px-16 lg:px-32 py-16">
      {/* Main content */}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16 pt-8">
          <div className="text-sm text-neutral-400 uppercase tracking-wider mb-2">{humanoid.manufacturer}</div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium text-neutral-900 tracking-tight mb-6">{humanoid.name}</h1>
          {humanoid.description && (
            <p className="text-xl text-neutral-600 leading-relaxed max-w-3xl">
              {humanoid.description}
            </p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 mb-20">
          {humanoid.year && (
            <div className="bg-neutral-50 rounded-2xl p-6">
              <div className="text-3xl font-light text-neutral-900">{humanoid.year}</div>
              <div className="text-sm text-neutral-400 mt-1">Year</div>
            </div>
          )}
          {humanoid.status && (
            <div className="bg-neutral-50 rounded-2xl p-6">
              <div className="text-lg font-medium text-neutral-900">{humanoid.status}</div>
              <div className="text-sm text-neutral-400 mt-1">Status</div>
            </div>
          )}
          {humanoid.cost && (
            <div className="bg-neutral-50 rounded-2xl p-6">
              <div className="text-2xl font-light text-neutral-900">{humanoid.cost}</div>
              <div className="text-sm text-neutral-400 mt-1">Price</div>
            </div>
          )}
          {humanoid.height && (
            <div className="bg-neutral-50 rounded-2xl p-6">
              <div className="text-3xl font-light text-neutral-900">{humanoid.height}</div>
              <div className="text-sm text-neutral-400 mt-1">Height (cm)</div>
            </div>
          )}
          {humanoid.weight && (
            <div className="bg-neutral-50 rounded-2xl p-6">
              <div className="text-3xl font-light text-neutral-900">{humanoid.weight}</div>
              <div className="text-sm text-neutral-400 mt-1">Weight (kg)</div>
            </div>
          )}
          {humanoid.dof && (
            <div className="bg-neutral-50 rounded-2xl p-6">
              <div className="text-3xl font-light text-neutral-900">{humanoid.dof}</div>
              <div className="text-sm text-neutral-400 mt-1">DOF</div>
            </div>
          )}
          {humanoid.maxSpeed && (
            <div className="bg-neutral-50 rounded-2xl p-6">
              <div className="text-3xl font-light text-neutral-900">{humanoid.maxSpeed}</div>
              <div className="text-sm text-neutral-400 mt-1">m/s</div>
            </div>
          )}
        </div>

        {/* Media gallery */}
        {humanoid.media && humanoid.media.length > 0 && (
          <div className="mb-20">
            <h2 className="text-2xl font-medium text-neutral-800 mb-8">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {humanoid.media.map((item, idx) => (
                <div
                  key={idx}
                  className="aspect-square rounded-2xl overflow-hidden bg-neutral-100 relative group"
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.caption || `${humanoid.name} media ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                      <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm">{item.caption}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Large robot image */}
        {humanoid.imageUrl && (
          <div className="mb-20 flex justify-center">
            <img
              src={humanoid.imageUrl}
              alt={humanoid.name}
              className="max-h-[600px] object-contain"
            />
          </div>
        )}

        {/* CTA section */}
        <div className="flex flex-col items-center justify-center py-16 border-t border-neutral-100">
          {humanoid.purchaseUrl ? (
            <a
              href={humanoid.purchaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-neutral-900 text-white rounded-full text-lg font-medium hover:bg-neutral-800 transition-colors"
            >
              Learn More
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
          ) : (
            <div className="text-neutral-400 text-lg">More information coming soon</div>
          )}
        </div>

        {/* Return hint */}
        <div className="text-center pb-8">
          <button
            onClick={onScrollUp}
            className="text-neutral-400 hover:text-neutral-600 transition-colors flex flex-col items-center gap-2"
          >
            <svg className="w-5 h-5 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            <span className="text-sm">Return to carousel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
