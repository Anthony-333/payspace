import Link from "next/link";
import { formatPostDate } from "@/content/blog";
import type { BlogPost } from "@/content/blog/types";

export function PostCard({ post }: { post: BlogPost }) {
  return (
    <li className="group relative flex flex-col rounded-3xl bg-muted p-6 transition-colors hover:bg-accent/60">
      <p className="text-sm font-medium text-primary">{post.category}</p>
      <h3 className="mt-3 text-xl leading-snug font-semibold tracking-tight">
        <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
          {post.title}
        </Link>
      </h3>
      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted-foreground">{post.description}</p>
      <p className="mt-5 text-sm text-muted-foreground">
        <time dateTime={post.published}>{formatPostDate(post.published)}</time> · {post.readingMinutes} min read
      </p>
    </li>
  );
}
