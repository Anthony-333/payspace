import { getPost, POSTS } from "@/content/blog";
import { OG_SIZE, ogCard } from "@/lib/og-card";

export const alt = "Payspace blog article";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  return ogCard({
    eyebrow: post ? `Payspace blog · ${post.category}` : "Payspace blog",
    title: post?.title ?? "Guides for running a more profitable small shop",
  });
}
