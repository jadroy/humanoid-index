import { humanoids } from "@/data/humanoids";
import { notFound } from "next/navigation";
import CollectionDetail from "../CollectionDetail";
import { humanoidToDetail, humanoidConfig } from "../humanoidCollection";

// Per-robot detail page = generic CollectionDetail + the humanoid adapter.
export default async function V3DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const robot = humanoids.find((r) => r.id === id);
  if (!robot) notFound();
  return <CollectionDetail item={humanoidToDetail(robot)} config={humanoidConfig} />;
}
