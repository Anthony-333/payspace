/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as http from "../http.js";
import type * as lib_catalog from "../lib/catalog.js";
import type * as lib_costing from "../lib/costing.js";
import type * as lib_csv from "../lib/csv.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_products from "../lib/products.js";
import type * as lib_slugs from "../lib/slugs.js";
import type * as lib_templateData from "../lib/templateData.js";
import type * as lib_tenant from "../lib/tenant.js";
import type * as members from "../members.js";
import type * as modifiers from "../modifiers.js";
import type * as products from "../products.js";
import type * as templates from "../templates.js";
import type * as tenants from "../tenants.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  categories: typeof categories;
  http: typeof http;
  "lib/catalog": typeof lib_catalog;
  "lib/costing": typeof lib_costing;
  "lib/csv": typeof lib_csv;
  "lib/money": typeof lib_money;
  "lib/products": typeof lib_products;
  "lib/slugs": typeof lib_slugs;
  "lib/templateData": typeof lib_templateData;
  "lib/tenant": typeof lib_tenant;
  members: typeof members;
  modifiers: typeof modifiers;
  products: typeof products;
  templates: typeof templates;
  tenants: typeof tenants;
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

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
