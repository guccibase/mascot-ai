import { ChickPreview, createChickPoseSource } from "./chick-mascot-factory";

export const POSE_SOURCE = createChickPoseSource("quill");

export default function QuillMascot() {
  return <ChickPreview slug="quill" />;
}
