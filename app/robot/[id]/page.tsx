import Link from "next/link";
import { humanoids } from "@/data/humanoids";
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

export default async function RobotPage({ params }: PageProps) {
  const { id } = await params;
  const currentIndex = humanoids.findIndex((h) => h.id === id);
  const robot = humanoids[currentIndex];

  if (!robot) {
    notFound();
  }

  const prevRobot = currentIndex > 0 ? humanoids[currentIndex - 1] : null;
  const nextRobot = currentIndex < humanoids.length - 1 ? humanoids[currentIndex + 1] : null;

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

        {/* Prev / Next navigation */}
        <div className="flex items-center gap-6 text-[12px]">
          {prevRobot ? (
            <Link
              href={`/robot/${prevRobot.id}`}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              style={{ color: "rgba(98, 93, 93, 0.6)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              {prevRobot.name}
            </Link>
          ) : (
            <span style={{ color: "rgba(98, 93, 93, 0.2)" }}>—</span>
          )}

          <span style={{ color: "rgba(98, 93, 93, 0.3)" }}>/</span>

          {nextRobot ? (
            <Link
              href={`/robot/${nextRobot.id}`}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              style={{ color: "rgba(98, 93, 93, 0.6)" }}
            >
              {nextRobot.name}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <span style={{ color: "rgba(98, 93, 93, 0.2)" }}>—</span>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Robot image */}
          <div
            className="aspect-square rounded-xl flex items-center justify-center p-8"
            style={{ backgroundColor: "#FAFAFA" }}
          >
            {robot.imageUrl ? (
              <img
                src={robot.imageUrl}
                alt={robot.name}
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

          {/* Robot info */}
          <div className="flex flex-col justify-center">
            <h1 className="text-[24px] mb-1" style={{ color: "#625D5D" }}>
              {robot.name}
            </h1>
            <p
              className="text-[12px] mb-8"
              style={{ color: "rgba(98, 93, 93, 0.6)" }}
            >
              {robot.manufacturer}
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Stat label="Status" value={robot.status || "—"} />
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

            {/* Description */}
            {robot.description && (
              <p
                className="text-[12px] mt-8 leading-relaxed"
                style={{ color: "rgba(98, 93, 93, 0.6)" }}
              >
                {robot.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[12px]" style={{ color: "rgba(98, 93, 93, 0.6)" }}>
        {label}
      </div>
      <div className="text-[12px]" style={{ color: "#625D5D" }}>
        {value}
      </div>
    </div>
  );
}
