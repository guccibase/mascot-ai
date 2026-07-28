"use client";
import { createOctopusStudio } from "./octopus-studio";
import { KELP } from "./octopus-characters";

const { default: KelpStudio, POSE_SOURCE } = createOctopusStudio(KELP);

export { POSE_SOURCE };
export default KelpStudio;
