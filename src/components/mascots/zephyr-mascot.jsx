import { OrbPreview, createOrbPoseSource } from "./orb-mascot-factory";

export const POSE_SOURCE = createOrbPoseSource("zephyr");

export default function ZephyrMascot() {
  return <OrbPreview slug="zephyr" />;
}
