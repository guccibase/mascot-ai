"use client";
import { createOctopusStudio } from "./octopus-studio";
import { NUMI } from "./octopus-characters";

const { default: NumiStudio, POSE_SOURCE } = createOctopusStudio(NUMI);

export { POSE_SOURCE };
export default NumiStudio;
