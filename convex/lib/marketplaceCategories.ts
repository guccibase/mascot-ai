import { v } from "convex/values";

/** App-store style categories for marketplace listings. */
export const MARKETPLACE_CATEGORY_LABELS = {
  art_design: "Art & Design",
  auto_vehicles: "Auto & Vehicles",
  beauty: "Beauty",
  books_reference: "Books & Reference",
  business: "Business",
  comics: "Comics",
  communication: "Communication",
  dating: "Dating",
  education: "Education",
  entertainment: "Entertainment",
  events: "Events",
  finance: "Finance",
  food_drink: "Food & Drink",
  health_fitness: "Health & Fitness",
  house_home: "House & Home",
  lifestyle: "Lifestyle",
  maps_navigation: "Maps & Navigation",
  medical: "Medical",
  media: "Media",
  news_magazines: "News & Magazines",
  parenting: "Parenting",
  personalization: "Personalization",
  photography: "Photography",
  productivity: "Productivity",
  shopping: "Shopping",
  social: "Social",
  sports: "Sports",
  tools: "Tools",
  travel_local: "Travel & Local",
  video_players: "Video Players & Editors",
  weather: "Weather",
} as const;

export type MarketplaceCategory = keyof typeof MARKETPLACE_CATEGORY_LABELS;

export const MARKETPLACE_CATEGORIES = Object.keys(
  MARKETPLACE_CATEGORY_LABELS
) as MarketplaceCategory[];

export const marketplaceCategoryValidator = v.union(
  v.literal("art_design"),
  v.literal("auto_vehicles"),
  v.literal("beauty"),
  v.literal("books_reference"),
  v.literal("business"),
  v.literal("comics"),
  v.literal("communication"),
  v.literal("dating"),
  v.literal("education"),
  v.literal("entertainment"),
  v.literal("events"),
  v.literal("finance"),
  v.literal("food_drink"),
  v.literal("health_fitness"),
  v.literal("house_home"),
  v.literal("lifestyle"),
  v.literal("maps_navigation"),
  v.literal("medical"),
  v.literal("media"),
  v.literal("news_magazines"),
  v.literal("parenting"),
  v.literal("personalization"),
  v.literal("photography"),
  v.literal("productivity"),
  v.literal("shopping"),
  v.literal("social"),
  v.literal("sports"),
  v.literal("tools"),
  v.literal("travel_local"),
  v.literal("video_players"),
  v.literal("weather")
);
