import { notFound } from "next/navigation";
import ThumbnailsClient from "./ThumbnailsClient";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ThumbnailsClient />;
}
