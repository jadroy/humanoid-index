"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import HumanoidCard from "@/components/HumanoidCard";
import { humanoids } from "@/data/humanoids";

export default function Home() {
  const [gridSize, setGridSize] = useState(2);

  const getGridClass = () => {
    switch (gridSize) {
      case 1:
        return "grid grid-cols-1 gap-4";
      case 2:
        return "grid grid-cols-1 md:grid-cols-2 gap-4";
      case 3:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
      default:
        return "grid grid-cols-1 md:grid-cols-2 gap-4";
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar gridSize={gridSize} onGridSizeChange={setGridSize} />

      <main className="flex-1 ml-40 p-8">
        <div className="max-w-5xl mx-auto">
          <div className={getGridClass()}>
            {humanoids.map((humanoid) => (
              <HumanoidCard key={humanoid.id} humanoid={humanoid} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
