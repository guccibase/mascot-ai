import { OrbPreview, createOrbPoseSource } from "./orb-mascot-factory";

export const POSE_SOURCE = createOrbPoseSource("trove");

export default function TroveMascot() {
  return <OrbPreview slug="trove" />;
}
