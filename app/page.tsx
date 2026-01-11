import Sidebar from "@/components/Sidebar";
import HumanoidCard from "@/components/HumanoidCard";
import { humanoids } from "@/data/humanoids";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />

      <main className="flex-1 ml-40 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {humanoids.map((humanoid) => (
              <HumanoidCard key={humanoid.id} humanoid={humanoid} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
