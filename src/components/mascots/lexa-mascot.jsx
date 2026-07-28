"use client";
import { createOctopusStudio } from "./octopus-studio";
import { LEXA } from "./octopus-characters";

const { default: LexaStudio, POSE_SOURCE } = createOctopusStudio(LEXA);

export { POSE_SOURCE };
export default LexaStudio;
