"use client";
import { LanternStudio, createLanternPoseSource } from "./lantern-mascot-factory";

export const POSE_SOURCE = createLanternPoseSource("watt");

export default function WattStudio() {
  return <LanternStudio slug="watt" />;
}
