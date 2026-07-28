"use client";
import { RobotStudio, createRobotPoseSource } from "./robot-mascot-factory";

export const POSE_SOURCE = createRobotPoseSource("brew");

export default function BrewStudio() {
  return <RobotStudio slug="brew" />;
}
