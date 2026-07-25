export type GesturePreset = {
  key: string;
  label: string;
  cat: string;
  tip: string;
  use: string;
};

/** Shared gesture menu users can pick from when creating a mascot. */
export const GESTURE_PRESETS: GesturePreset[] = [
  { key: "idle", label: "Idle", cat: "Core", tip: "Resting companion — floats, blinks, soft sway.", use: "Home screen" },
  { key: "wave", label: "Wave", cat: "Core", tip: "Friendly hello — one limb raised and flapping.", use: "Hello · goodbye" },
  { key: "happy", label: "Happy", cat: "Core", tip: "Easy joy — creased eyes, warm grin.", use: "Good news" },
  { key: "thinking", label: "Thinking", cat: "Core", tip: "Working it out — gaze up, thoughtful mouth.", use: "Loading · AI planning" },
  { key: "listening", label: "Listening", cat: "Core", tip: "Attentive — lean in, soft focus.", use: "Voice input" },
  { key: "talking", label: "Talking", cat: "Core", tip: "Speaking — animated mouth, open posture.", use: "AI reply" },
  { key: "confused", label: "Confused", cat: "Core", tip: "Not sure — crooked mouth, question energy.", use: "Error · not found" },
  { key: "celebrate", label: "Celebrate", cat: "Moods", tip: "Big win — confetti energy, wide grin.", use: "Streak · success" },
  { key: "love", label: "Love", cat: "Moods", tip: "Affection — hearts, soft eyes.", use: "Thanks · rating" },
  { key: "sad", label: "Sad", cat: "Moods", tip: "Gentle disappointment — soft eyes, droop.", use: "Missed goal — kindly" },
  { key: "grumpy", label: "Grumpy", cat: "Moods", tip: "Mildly annoyed — brows down, pout.", use: "Too early · friction" },
  { key: "sleepy", label: "Sleepy", cat: "Moods", tip: "Winding down — heavy lids, slow blink.", use: "Night mode" },
  { key: "alarm", label: "Alarm!", cat: "Action", tip: "Wake alert — wide eyes, ringing energy.", use: "Notification · alarm" },
  { key: "encourage", label: "Encourage", cat: "Action", tip: "You've got this — open posture, warm face.", use: "Nudge · coaching" },
  { key: "proud", label: "Proud", cat: "Moods", tip: "Personal best — lifted chin, bright glow.", use: "Milestone" },
  { key: "oops", label: "Oops", cat: "Moods", tip: "Soft fail — sheepish smile, no shame.", use: "Rough take — kindly" },
];

export const GESTURE_CATEGORIES = ["Core", "Moods", "Action"] as const;
