"use client";

import { humanoids } from "@/data/humanoids";
import CatalogIndex from "@/components/CatalogIndex";

export default function CatalogPage() {
  return <CatalogIndex humanoids={humanoids} />;
}
