"use client";
import { createOctopusStudio } from "./octopus-studio";
import { CODA } from "./octopus-characters";

const { default: CodaStudio, POSE_SOURCE } = createOctopusStudio(CODA);

export { POSE_SOURCE };
export default CodaStudio;
