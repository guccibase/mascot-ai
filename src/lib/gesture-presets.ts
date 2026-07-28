export type GesturePreset = {
  key: string;
  label: string;
  cat: string;
  tip: string;
  use: string;
};

/** Shared gesture menu users can pick from when creating a mascot. */
export const GESTURE_PRESETS: GesturePreset[] = [
  // Core
  { key: "idle", label: "Idle", cat: "Core", tip: "At rest: floats, blinks, soft sway.", use: "Home screen" },
  { key: "wave", label: "Wave", cat: "Core", tip: "A friendly hello. One limb raised and flapping.", use: "Hello · goodbye" },
  { key: "happy", label: "Happy", cat: "Core", tip: "Creased eyes and a warm grin.", use: "Good news" },
  { key: "thinking", label: "Thinking", cat: "Core", tip: "Gaze drifts up, mouth thoughtful.", use: "Loading · AI planning" },
  { key: "listening", label: "Listening", cat: "Core", tip: "Leans in with soft focus.", use: "Voice input" },
  { key: "talking", label: "Talking", cat: "Core", tip: "Mouth mid-word, posture open.", use: "AI reply" },
  { key: "pointing", label: "Pointing", cat: "Core", tip: "One arm out, directing attention.", use: "Tour · callout" },
  { key: "writing", label: "Writing", cat: "Core", tip: "Focused on a small pad or keyboard.", use: "Compose · notes" },
  // Moods
  { key: "celebrate", label: "Celebrate", cat: "Moods", tip: "Wide grin, confetti energy.", use: "Streak · success" },
  { key: "love", label: "Love", cat: "Moods", tip: "Soft eyes, hearts floating off.", use: "Thanks · rating" },
  { key: "sad", label: "Sad", cat: "Moods", tip: "Soft eyes and a gentle droop. Never mean about it.", use: "Missed goal, kindly" },
  { key: "crying", label: "Crying", cat: "Moods", tip: "Tears, bigger sorrow than sad.", use: "Bad news · empathy" },
  { key: "grumpy", label: "Grumpy", cat: "Moods", tip: "Brows down, small pout.", use: "Too early · friction" },
  { key: "sleepy", label: "Sleepy", cat: "Moods", tip: "Heavy lids, slow blink.", use: "Night mode" },
  { key: "proud", label: "Proud", cat: "Moods", tip: "Chin up, bright glow.", use: "Milestone" },
  { key: "oops", label: "Oops", cat: "Moods", tip: "Sheepish smile. Soft fail, no shame.", use: "Rough take, kindly" },
  { key: "surprised", label: "Surprised", cat: "Moods", tip: "Wide eyes, small jump.", use: "Wow · discovery" },
  { key: "blowing_kiss", label: "Blowing kiss", cat: "Moods", tip: "Soft kiss blown toward viewer.", use: "Thanks · affection" },
  { key: "facepalm", label: "Facepalm", cat: "Moods", tip: "Hand to face, wry embarrassment.", use: "Facepalm moment" },
  { key: "dancing", label: "Dancing", cat: "Moods", tip: "Upbeat bounce / groove.", use: "Fun · celebration" },
  // Action
  { key: "alarm", label: "Alarm!", cat: "Action", tip: "Wide eyes, ringing energy.", use: "Notification · alarm" },
  { key: "encourage", label: "Encourage", cat: "Action", tip: "Open posture, warm face. You've got this.", use: "Nudge · coaching" },
  { key: "searching", label: "Searching", cat: "Action", tip: "Looking around / scanning.", use: "Search · find" },
  { key: "thumbs_up", label: "Thumbs up", cat: "Action", tip: "Clear approval gesture.", use: "Approve · yes" },
  { key: "thumbs_down", label: "Thumbs down", cat: "Action", tip: "Clear disapproval gesture.", use: "Reject · no" },
  { key: "shrug", label: "Shrug", cat: "Action", tip: "Shoulders up, unsure.", use: "Unknown · maybe" },
  { key: "working", label: "Working", cat: "Action", tip: "Focused busy posture.", use: "Processing · busy" },
  { key: "running", label: "Running", cat: "Action", tip: "Mid-stride energy.", use: "Hurry · progress" },
  { key: "flying", label: "Flying", cat: "Action", tip: "Lifted / soaring pose.", use: "Delight · upgrade" },
  { key: "high_five", label: "High five", cat: "Action", tip: "Arm raised for a high five.", use: "Team win · connect" },
  { key: "clapping", label: "Clapping", cat: "Action", tip: "Hands mid-clap.", use: "Applause · praise" },
  // Feedback
  { key: "confused", label: "Confused", cat: "Feedback", tip: "Crooked mouth, a little lost.", use: "Error · not found" },
  { key: "success", label: "Success", cat: "Feedback", tip: "Clear win pose / check energy.", use: "Done · completed" },
  { key: "error", label: "Error", cat: "Feedback", tip: "Soft alert — concerned, not scary.", use: "Failed request" },
  { key: "empty", label: "Empty", cat: "Feedback", tip: "Gentle “nothing here yet”.", use: "Empty state" },
  { key: "loading", label: "Loading", cat: "Feedback", tip: "Soft wait / spinner energy.", use: "In progress" },
  { key: "waiting", label: "Waiting", cat: "Feedback", tip: "Patient pause, eyes soft.", use: "Queued · hold on" },
];

export const GESTURE_CATEGORIES = ["Core", "Moods", "Action", "Feedback"] as const;
