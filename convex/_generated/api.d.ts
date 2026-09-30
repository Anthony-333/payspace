/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as categories from "../categories.js";
import type * as costing from "../costing.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as lib_authEmails from "../lib/authEmails.js";
import type * as lib_businessDate from "../lib/businessDate.js";
import type * as lib_catalog from "../lib/catalog.js";
import type * as lib_clientIp from "../lib/clientIp.js";
import type * as lib_costing from "../lib/costing.js";
import type * as lib_csv from "../lib/csv.js";
import type * as lib_loyalty from "../lib/loyalty.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_password from "../lib/password.js";
import type * as lib_plan from "../lib/plan.js";
import type * as lib_polarWebhook from "../lib/polarWebhook.js";
import type * as lib_products from "../lib/products.js";
import type * as lib_quantity from "../lib/quantity.js";
import type * as lib_sale from "../lib/sale.js";
import type * as lib_signature from "../lib/signature.js";
import type * as lib_slugs from "../lib/slugs.js";
import type * as lib_stock from "../lib/stock.js";
import type * as lib_templateData from "../lib/templateData.js";
import type * as lib_tenant from "../lib/tenant.js";
import type * as loyalty from "../loyalty.js";
import type * as loyaltyCustomer from "../loyaltyCustomer.js";
import type * as members from "../members.js";
import type * as modifiers from "../modifiers.js";
import type * as photos from "../photos.js";
import type * as products from "../products.js";
import type * as recipes from "../recipes.js";
import type * as sales from "../sales.js";
import type * as templates from "../templates.js";
import type * as tenants from "../tenants.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auth: typeof auth;
  billing: typeof billing;
  categories: typeof categories;
  costing: typeof costing;
  crons: typeof crons;
  emails: typeof emails;
  http: typeof http;
  inventory: typeof inventory;
  "lib/authEmails": typeof lib_authEmails;
  "lib/businessDate": typeof lib_businessDate;
  "lib/catalog": typeof lib_catalog;
  "lib/clientIp": typeof lib_clientIp;
  "lib/costing": typeof lib_costing;
  "lib/csv": typeof lib_csv;
  "lib/loyalty": typeof lib_loyalty;
  "lib/money": typeof lib_money;
  "lib/password": typeof lib_password;
  "lib/plan": typeof lib_plan;
  "lib/polarWebhook": typeof lib_polarWebhook;
  "lib/products": typeof lib_products;
  "lib/quantity": typeof lib_quantity;
  "lib/sale": typeof lib_sale;
  "lib/signature": typeof lib_signature;
  "lib/slugs": typeof lib_slugs;
  "lib/stock": typeof lib_stock;
  "lib/templateData": typeof lib_templateData;
  "lib/tenant": typeof lib_tenant;
  loyalty: typeof loyalty;
  loyaltyCustomer: typeof loyaltyCustomer;
  members: typeof members;
  modifiers: typeof modifiers;
  photos: typeof photos;
  products: typeof products;
  recipes: typeof recipes;
  sales: typeof sales;
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
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
