"use client";
import { LanternStudio, createLanternPoseSource } from "./lantern-mascot-factory";

export const POSE_SOURCE = createLanternPoseSource("shade");

export default function ShadeStudio() {
  return <LanternStudio slug="shade" />;
}
