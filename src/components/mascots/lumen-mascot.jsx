"use client";
import { LanternStudio, createLanternPoseSource } from "./lantern-mascot-factory";

export const POSE_SOURCE = createLanternPoseSource("lumen");

export default function LumenStudio() {
  return <LanternStudio slug="lumen" />;
}
