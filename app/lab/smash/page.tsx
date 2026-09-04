"use client";

import { humanoids } from "@/data/humanoids";
import SmashPicker from "@/components/SmashPicker";

// SmashPicker had no route — it was built, then orphaned. The shelf gives it one.
export default function SmashPage() {
  return <SmashPicker humanoids={humanoids} />;
}
