/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminUsers from "../adminUsers.js";
import type * as billing from "../billing.js";
import type * as billingSync from "../billingSync.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_adminGrant from "../lib/adminGrant.js";
import type * as lib_appAssetPaths from "../lib/appAssetPaths.js";
import type * as lib_appAssetStorage from "../lib/appAssetStorage.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_billingExpiry from "../lib/billingExpiry.js";
import type * as lib_billingPolicy from "../lib/billingPolicy.js";
import type * as lib_marketplace from "../lib/marketplace.js";
import type * as lib_marketplaceCategories from "../lib/marketplaceCategories.js";
import type * as lib_plans from "../lib/plans.js";
import type * as lib_publicExamples from "../lib/publicExamples.js";
import type * as lib_revenueCatSubscriber from "../lib/revenueCatSubscriber.js";
import type * as lib_serverAuth from "../lib/serverAuth.js";
import type * as lib_spendCapacity from "../lib/spendCapacity.js";
import type * as lib_spendSplit from "../lib/spendSplit.js";
import type * as lib_tokens from "../lib/tokens.js";
import type * as lib_userMerge from "../lib/userMerge.js";
import type * as maintenance from "../maintenance.js";
import type * as marketplace from "../marketplace.js";
import type * as marketplaceStripe from "../marketplaceStripe.js";
import type * as mascotAppAssets from "../mascotAppAssets.js";
import type * as mascots from "../mascots.js";
import type * as referenceAssets from "../referenceAssets.js";
import type * as tokens from "../tokens.js";
import type * as users from "../users.js";
import type * as usersInternal from "../usersInternal.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminUsers: typeof adminUsers;
  billing: typeof billing;
  billingSync: typeof billingSync;
  crons: typeof crons;
  http: typeof http;
  "lib/adminGrant": typeof lib_adminGrant;
  "lib/appAssetPaths": typeof lib_appAssetPaths;
  "lib/appAssetStorage": typeof lib_appAssetStorage;
  "lib/auth": typeof lib_auth;
  "lib/billingExpiry": typeof lib_billingExpiry;
  "lib/billingPolicy": typeof lib_billingPolicy;
  "lib/marketplace": typeof lib_marketplace;
  "lib/marketplaceCategories": typeof lib_marketplaceCategories;
  "lib/plans": typeof lib_plans;
  "lib/publicExamples": typeof lib_publicExamples;
  "lib/revenueCatSubscriber": typeof lib_revenueCatSubscriber;
  "lib/serverAuth": typeof lib_serverAuth;
  "lib/spendCapacity": typeof lib_spendCapacity;
  "lib/spendSplit": typeof lib_spendSplit;
  "lib/tokens": typeof lib_tokens;
  "lib/userMerge": typeof lib_userMerge;
  maintenance: typeof maintenance;
  marketplace: typeof marketplace;
  marketplaceStripe: typeof marketplaceStripe;
  mascotAppAssets: typeof mascotAppAssets;
  mascots: typeof mascots;
  referenceAssets: typeof referenceAssets;
  tokens: typeof tokens;
  users: typeof users;
  usersInternal: typeof usersInternal;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
