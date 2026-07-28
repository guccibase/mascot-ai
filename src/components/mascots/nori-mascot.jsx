"use client";
import { createOctopusStudio } from "./octopus-studio";
import { NORI } from "./octopus-characters";

const { default: NoriStudio, POSE_SOURCE } = createOctopusStudio(NORI);

export { POSE_SOURCE };
export default NoriStudio;
