import { humanoids } from "@/data/humanoids";
import V3Client from "./V3Client";

// Server component: hand the catalog to the client shell. Keeps data loading
// on the server; all the calm-layout interaction lives in V3Client.
export default function V3Page() {
  return <V3Client robots={humanoids} />;
}
