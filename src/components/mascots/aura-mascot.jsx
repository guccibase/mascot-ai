import { OrbPreview, createOrbPoseSource } from "./orb-mascot-factory";

export const POSE_SOURCE = createOrbPoseSource("aura");

export default function AuraMascot() {
  return <OrbPreview slug="aura" />;
}
