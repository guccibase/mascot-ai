import { OrbPreview, createOrbPoseSource } from "./orb-mascot-factory";

export const POSE_SOURCE = createOrbPoseSource("glint");

export default function GlintMascot() {
  return <OrbPreview slug="glint" />;
}
