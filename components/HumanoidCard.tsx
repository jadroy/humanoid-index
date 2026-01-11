import Link from "next/link";
import type { Humanoid } from "@/data/humanoids";

interface HumanoidCardProps {
  humanoid: Humanoid;
}

export default function HumanoidCard({ humanoid }: HumanoidCardProps) {
  return (
    <Link href={`/robot/${humanoid.id}`} className="flex flex-col group">
      {/* Card with robot image */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-50 hover:bg-neutral-100 transition-colors">
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <img
            src={humanoid.imageUrl || "/robots/placeholder.png"}
            alt={humanoid.name}
            draggable="false"
            className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
      </div>

      {/* Text labels BELOW the card */}
      <div className="flex items-baseline justify-between mt-2 gap-2">
        <span className="text-[12px] truncate" style={{ color: '#625D5D' }}>{humanoid.name}</span>
        <span className="text-[12px] truncate flex-shrink-0" style={{ color: 'rgba(98, 93, 93, 0.6)' }}>{humanoid.manufacturer}</span>
      </div>
    </Link>
  );
}
