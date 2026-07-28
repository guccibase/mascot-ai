"use client";
import { RobotStudio, createRobotPoseSource } from "./robot-mascot-factory";

export const POSE_SOURCE = createRobotPoseSource("bolt");

export default function BoltStudio() {
  return <RobotStudio slug="bolt" />;
}
