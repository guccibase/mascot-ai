"use client";
import { RobotStudio, createRobotPoseSource } from "./robot-mascot-factory";

export const POSE_SOURCE = createRobotPoseSource("orbit");

export default function OrbitStudio() {
  return <RobotStudio slug="orbit" />;
}
