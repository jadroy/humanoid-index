// Dev-only: MobileDeck rendered on its own so the phone-frame harness can
// iframe it at a real phone width (vw units resolve to the iframe, not the
// desktop window).
import MobileDeck from "@/components/MobileDeck";

export default function MobileFramePage() {
  return <MobileDeck />;
}
