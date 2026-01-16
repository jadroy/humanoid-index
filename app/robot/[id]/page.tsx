import Link from "next/link";
import { humanoids, type Humanoid } from "@/data/humanoids";
import { notFound } from "next/navigation";
import KeyboardNav from "@/components/KeyboardNav";

export function generateStaticParams() {
  return humanoids.map((robot) => ({
    id: robot.id,
  }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function getStatusColor(status?: string) {
  switch (status) {
    case "In Production":
      return "#4CAF50";
    case "Prototype":
      return "#2196F3";
    case "Concept":
      return "#9C27B0";
    case "Discontinued":
      return "#757575";
    default:
      return "#625D5D";
  }
}

function getRelatedRobots(currentRobot: Humanoid): Humanoid[] {
  return humanoids
    .filter(h => h.id !== currentRobot.id)
    .filter(h => h.manufacturer === currentRobot.manufacturer || h.status === currentRobot.status)
    .slice(0, 3);
}

export default async function RobotPage({ params }: PageProps) {
  const { id } = await params;
  const currentIndex = humanoids.findIndex((h) => h.id === id);
  const robot = humanoids[currentIndex];

  if (!robot) {
    notFound();
  }

  const prevRobot = currentIndex > 0 ? humanoids[currentIndex - 1] : null;
  const nextRobot = currentIndex < humanoids.length - 1 ? humanoids[currentIndex + 1] : null;
  const relatedRobots = getRelatedRobots(robot);

  return (
    <div className="min-h-screen bg-white p-8">
      <KeyboardNav 
        prevId={prevRobot?.id || null} 
        nextId={nextRobot?.id || null} 
      />
      
      {/* Top navigation bar */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] hover:opacity-70 transition-opacity"
          style={{ color: "rgba(98, 93, 93, 0.6)" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        {/* Prev / Next navigation - CHOOSE YOUR STYLE BELOW */}
        
        {/* OPTION 1: Pill-style buttons with backgrounds */}
        {/* <div className="flex items-center gap-3">
          {prevRobot ? (
            <Link
              href={`/robot/${prevRobot.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] hover:bg-neutral-100 transition-all"
              style={{ color: "rgba(98, 93, 93, 0.6)", backgroundColor: "rgba(98, 93, 93, 0.05)" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              {prevRobot.name}
            </Link>
          ) : (
            <div className="px-4 py-2 rounded-full text-[12px]" style={{ color: "rgba(98, 93, 93, 0.2)" }}>—</div>
          )}

          {nextRobot ? (
            <Link
              href={`/robot/${nextRobot.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] hover:bg-neutral-100 transition-all"
              style={{ color: "rgba(98, 93, 93, 0.6)", backgroundColor: "rgba(98, 93, 93, 0.05)" }}
            >
              {nextRobot.name}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <div className="px-4 py-2 rounded-full text-[12px]" style={{ color: "rgba(98, 93, 93, 0.2)" }}>—</div>
          )}
        </div> */}

        {/* OPTION 2: Keyboard key style (active by default) */}
        <div className="flex items-center gap-3">
          {prevRobot ? (
            <Link
              href={`/robot/${prevRobot.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] border border-neutral-300 hover:border-neutral-400 hover:shadow-sm transition-all"
              style={{ 
                color: "rgba(98, 93, 93, 0.7)", 
                backgroundColor: "white",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              {prevRobot.name}
            </Link>
          ) : (
            <div className="px-3 py-2 text-[12px]" style={{ color: "rgba(98, 93, 93, 0.2)" }}>—</div>
          )}

          {nextRobot ? (
            <Link
              href={`/robot/${nextRobot.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] border border-neutral-300 hover:border-neutral-400 hover:shadow-sm transition-all"
              style={{ 
                color: "rgba(98, 93, 93, 0.7)", 
                backgroundColor: "white",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              {nextRobot.name}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <div className="px-3 py-2 text-[12px]" style={{ color: "rgba(98, 93, 93, 0.2)" }}>—</div>
          )}
        </div>

        {/* OPTION 3: Circular buttons with arrows */}
        {/* <div className="flex items-center gap-3">
          {prevRobot ? (
            <Link
              href={`/robot/${prevRobot.id}`}
              className="flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center border border-neutral-300 group-hover:border-neutral-400 group-hover:bg-neutral-50 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "rgba(98, 93, 93, 0.6)" }}>
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <span className="text-[12px] group-hover:opacity-70 transition-opacity" style={{ color: "rgba(98, 93, 93, 0.6)" }}>
                {prevRobot.name}
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center border border-neutral-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "rgba(98, 93, 93, 0.2)" }}>
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            </div>
          )}

          {nextRobot ? (
            <Link
              href={`/robot/${nextRobot.id}`}
              className="flex items-center gap-3 group"
            >
              <span className="text-[12px] group-hover:opacity-70 transition-opacity" style={{ color: "rgba(98, 93, 93, 0.6)" }}>
                {nextRobot.name}
              </span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center border border-neutral-300 group-hover:border-neutral-400 group-hover:bg-neutral-50 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "rgba(98, 93, 93, 0.6)" }}>
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center border border-neutral-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "rgba(98, 93, 93, 0.2)" }}>
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          )}
        </div> */}

        {/* OPTION 4: Minimalist with underline hover */}
        {/* <div className="flex items-center gap-6 text-[12px]">
          {prevRobot ? (
            <Link
              href={`/robot/${prevRobot.id}`}
              className="flex items-center gap-2 group"
              style={{ color: "rgba(98, 93, 93, 0.6)" }}
            >
              <span className="group-hover:opacity-50 transition-opacity">←</span>
              <span className="group-hover:underline underline-offset-4">{prevRobot.name}</span>
            </Link>
          ) : (
            <span style={{ color: "rgba(98, 93, 93, 0.2)" }}>—</span>
          )}

          <span style={{ color: "rgba(98, 93, 93, 0.3)" }}>·</span>

          {nextRobot ? (
            <Link
              href={`/robot/${nextRobot.id}`}
              className="flex items-center gap-2 group"
              style={{ color: "rgba(98, 93, 93, 0.6)" }}
            >
              <span className="group-hover:underline underline-offset-4">{nextRobot.name}</span>
              <span className="group-hover:opacity-50 transition-opacity">→</span>
            </Link>
          ) : (
            <span style={{ color: "rgba(98, 93, 93, 0.2)" }}>—</span>
          )}
        </div> */}

        {/* OPTION 5: Icon-only compact buttons */}
        {/* <div className="flex items-center gap-2">
          {prevRobot ? (
            <Link
              href={`/robot/${prevRobot.id}`}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-all group"
              style={{ backgroundColor: "rgba(98, 93, 93, 0.04)" }}
              title={`Previous: ${prevRobot.name}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:scale-110 transition-transform" style={{ color: "rgba(98, 93, 93, 0.6)" }}>
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(98, 93, 93, 0.02)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "rgba(98, 93, 93, 0.2)" }}>
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          )}
          
          {nextRobot ? (
            <Link
              href={`/robot/${nextRobot.id}`}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-all group"
              style={{ backgroundColor: "rgba(98, 93, 93, 0.04)" }}
              title={`Next: ${nextRobot.name}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:scale-110 transition-transform" style={{ color: "rgba(98, 93, 93, 0.6)" }}>
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(98, 93, 93, 0.02)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "rgba(98, 93, 93, 0.2)" }}>
                <path d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div> */}
      
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header Section with Image and Title */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          {/* Smaller hero image */}
          <div className="md:w-80 flex-shrink-0">
            <div
              className="aspect-[3/4] rounded-xl flex items-center justify-center p-6"
              style={{ backgroundColor: "#FAFAFA" }}
            >
              {robot.imageUrl ? (
                <img
                  src={robot.imageUrl}
                  alt={robot.name}
                  draggable="false"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div
                  className="text-[12px]"
                  style={{ color: "rgba(98, 93, 93, 0.6)" }}
                >
                  No image
                </div>
              )}
            </div>
          </div>

          {/* Title and Quick Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h1 className="text-[40px] mb-2 leading-tight" style={{ color: "#625D5D" }}>
                {robot.name}
              </h1>
              <p
                className="text-[15px] mb-6"
                style={{ color: "rgba(98, 93, 93, 0.6)" }}
              >
                {robot.manufacturer}
              </p>

              {/* Status badge */}
              {robot.status && (
                <div className="mb-8">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
                    style={{
                      backgroundColor: `${getStatusColor(robot.status)}15`,
                      color: getStatusColor(robot.status),
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getStatusColor(robot.status) }}
                    />
                    {robot.status}
                  </span>
                </div>
              )}

              {/* Description */}
              {robot.description && (
                <p
                  className="text-[14px] leading-relaxed mb-8"
                  style={{ color: "rgba(98, 93, 93, 0.7)" }}
                >
                  {robot.description}
                </p>
              )}
            </div>

            {/* Stats grid - horizontal layout */}
            <div className="border border-neutral-200 rounded-lg p-5">
              <div className="grid grid-cols-3 md:grid-cols-5 gap-6">
                <Stat label="Year" value={robot.year?.toString() || "—"} />
                <Stat
                  label="Height"
                  value={robot.height ? `${robot.height} cm` : "—"}
                />
                <Stat
                  label="Weight"
                  value={robot.weight ? `${robot.weight} kg` : "—"}
                />
                <Stat label="DOF" value={robot.dof?.toString() || "—"} />
                <Stat
                  label="Max Speed"
                  value={robot.maxSpeed ? `${robot.maxSpeed} m/s` : "—"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Media Gallery */}
        {robot.media && robot.media.length > 0 && (
          <div className="mb-16">
            <h2
              className="text-[13px] mb-4 font-medium"
              style={{ color: "rgba(98, 93, 93, 0.6)" }}
            >
              Additional Media
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {robot.media.map((item, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
                  style={{ backgroundColor: "#FAFAFA" }}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.caption || `${robot.name} media ${index + 1}`}
                      draggable="false"
                      className="w-full h-full object-contain p-3"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <iframe
                        src={`https://www.youtube.com/embed/${item.url}`}
                        title={item.caption || `${robot.name} video ${index + 1}`}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Robots */}
        {relatedRobots.length > 0 && (
          <div className="mt-20 pt-12 border-t border-neutral-200">
            <h2
              className="text-[13px] mb-6"
              style={{ color: "rgba(98, 93, 93, 0.6)" }}
            >
              Related Humanoids
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedRobots.map((related) => (
                <Link
                  key={related.id}
                  href={`/robot/${related.id}`}
                  className="group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-neutral-50 mb-3">
                    <img
                      src={related.imageUrl || "/robots/placeholder.png"}
                      alt={related.name}
                      draggable="false"
                      className="w-full h-full object-contain p-6"
                    />
                  </div>
                  <div className="text-[12px]" style={{ color: "#625D5D" }}>
                    {related.name}
                  </div>
                  <div
                    className="text-[12px]"
                    style={{ color: "rgba(98, 93, 93, 0.6)" }}
                  >
                    {related.manufacturer}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] mb-1" style={{ color: "rgba(98, 93, 93, 0.6)" }}>
        {label}
      </div>
      <div className="text-[13px]" style={{ color: "#625D5D" }}>
        {value}
      </div>
    </div>
  );
}
