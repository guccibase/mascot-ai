import { ChickPreview, createChickPoseSource } from "./chick-mascot-factory";

export const POSE_SOURCE = createChickPoseSource("nox");

export default function NoxMascot() {
  return <ChickPreview slug="nox" />;
}
