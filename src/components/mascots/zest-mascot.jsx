import { ChickPreview, createChickPoseSource } from "./chick-mascot-factory";

export const POSE_SOURCE = createChickPoseSource("zest");

export default function ZestMascot() {
  return <ChickPreview slug="zest" />;
}
