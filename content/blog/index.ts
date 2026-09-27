import bakeryBatchCosting from "./posts/bakery-batch-costing-per-piece";
import gcashMaya from "./posts/gcash-maya-payments-end-of-day";
import foodCostPerDrink from "./posts/how-to-compute-food-cost-per-drink";
import markupVsMargin from "./posts/markup-vs-margin-pricing";
import inventoryCount from "./posts/sari-sari-store-inventory-count";
import vatInclusive from "./posts/vat-inclusive-pricing-philippines";
import type { BlogPost } from "./types";

// Every published post, newest first. Adding a post here publishes it everywhere.
export const POSTS: BlogPost[] = [
  foodCostPerDrink,
  markupVsMargin,
  bakeryBatchCosting,
  vatInclusive,
  inventoryCount,
  gcashMaya,
].sort((a, b) => b.published.localeCompare(a.published));

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}

/** Up to `n` other posts, preferring ones that share an industry or category. */
export function relatedPosts(post: BlogPost, n = 3) {
  const score = (p: BlogPost) =>
    (p.category === post.category ? 2 : 0) + p.industries.filter((i) => post.industries.includes(i)).length;
  return POSTS.filter((p) => p.slug !== post.slug)
    .sort((a, b) => score(b) - score(a))
    .slice(0, n);
}

export function formatPostDate(iso: string) {
  // Fixed format so the server and every browser agree.
  const [y, m, d] = iso.split("-").map(Number);
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
