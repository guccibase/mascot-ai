export type GesturePreset = {
  key: string;
  label: string;
  cat: string;
  tip: string;
  use: string;
};

/** Shared gesture menu users can pick from when creating a mascot. */
export const GESTURE_PRESETS: GesturePreset[] = [
  { key: "idle", label: "Idle", cat: "Core", tip: "At rest: floats, blinks, soft sway.", use: "Home screen" },
  { key: "wave", label: "Wave", cat: "Core", tip: "A friendly hello. One limb raised and flapping.", use: "Hello · goodbye" },
  { key: "happy", label: "Happy", cat: "Core", tip: "Creased eyes and a warm grin.", use: "Good news" },
  { key: "thinking", label: "Thinking", cat: "Core", tip: "Gaze drifts up, mouth thoughtful.", use: "Loading · AI planning" },
  { key: "listening", label: "Listening", cat: "Core", tip: "Leans in with soft focus.", use: "Voice input" },
  { key: "talking", label: "Talking", cat: "Core", tip: "Mouth mid-word, posture open.", use: "AI reply" },
  { key: "confused", label: "Confused", cat: "Core", tip: "Crooked mouth, a little lost.", use: "Error · not found" },
  { key: "celebrate", label: "Celebrate", cat: "Moods", tip: "Wide grin, confetti energy.", use: "Streak · success" },
  { key: "love", label: "Love", cat: "Moods", tip: "Soft eyes, hearts floating off.", use: "Thanks · rating" },
  { key: "sad", label: "Sad", cat: "Moods", tip: "Soft eyes and a gentle droop. Never mean about it.", use: "Missed goal, kindly" },
  { key: "grumpy", label: "Grumpy", cat: "Moods", tip: "Brows down, small pout.", use: "Too early · friction" },
  { key: "sleepy", label: "Sleepy", cat: "Moods", tip: "Heavy lids, slow blink.", use: "Night mode" },
  { key: "alarm", label: "Alarm!", cat: "Action", tip: "Wide eyes, ringing energy.", use: "Notification · alarm" },
  { key: "encourage", label: "Encourage", cat: "Action", tip: "Open posture, warm face. You've got this.", use: "Nudge · coaching" },
  { key: "proud", label: "Proud", cat: "Moods", tip: "Chin up, bright glow.", use: "Milestone" },
  { key: "oops", label: "Oops", cat: "Moods", tip: "Sheepish smile. Soft fail, no shame.", use: "Rough take, kindly" },
];

export const GESTURE_CATEGORIES = ["Core", "Moods", "Action"] as const;
