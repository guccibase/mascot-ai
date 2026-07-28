import { ChickPreview, createChickPoseSource } from "./chick-mascot-factory";

export const POSE_SOURCE = createChickPoseSource("pip");

export default function PipMascot() {
  return <ChickPreview slug="pip" />;
}
