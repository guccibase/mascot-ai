"use client";
import { RobotStudio, createRobotPoseSource } from "./robot-mascot-factory";

export const POSE_SOURCE = createRobotPoseSource("relay");

export default function RelayStudio() {
  return <RobotStudio slug="relay" />;
}
