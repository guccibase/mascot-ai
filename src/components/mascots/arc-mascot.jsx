"use client";
import { LanternStudio, createLanternPoseSource } from "./lantern-mascot-factory";

export const POSE_SOURCE = createLanternPoseSource("arc");

export default function ArcStudio() {
  return <LanternStudio slug="arc" />;
}
