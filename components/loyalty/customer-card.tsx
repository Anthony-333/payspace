"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { Gift, LogOut, Stamp } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { FieldError } from "@/components/auth/auth-card";
import { SignatureView } from "@/components/loyalty/signature-view";
import { StampCard } from "@/components/loyalty/stamp-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";

// The customer's view of their loyalty card, at /loyalty/[shop]/[username]. The username comes
// from the link, so they only type the password the shop gave them (convex/loyaltyCustomer.ts).
// /loyalty/[shop] asks for both and then moves to the personal link. The session token is kept
// in this browser's localStorage, per shop; the server stores only its hash, and it lasts 30 days.

const key = (shop: string) => `payspace:loyalty:${shop}`;
const CHANGE = "payspace:loyalty-token";

function readToken(shop: string) {
  try {
    return window.localStorage.getItem(key(shop));
  } catch {
    return null;
  }
}

function writeToken(shop: string, token: string | null) {
  try {
    if (token) window.localStorage.setItem(key(shop), token);
    else window.localStorage.removeItem(key(shop));
  } catch {
    // Private mode or blocked storage: the card still works until the tab closes.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

/** The saved token, read as external state so it never runs during render on the server. */
function useToken(shop: string) {
  return useSyncExternalStore(subscribe, () => readToken(shop), () => null);
}

const date = (at: number) => new Date(at).toLocaleDateString("en-PH", { dateStyle: "medium" });

const cardPath = (shop: string, username: string) => `/loyalty/${encodeURIComponent(shop)}/${encodeURIComponent(username)}`;

export function CustomerCard({ shop, username }: { shop: string; username?: string }) {
  const router = useRouter();
  const info = useQuery(api.loyaltyCustomer.shop, { shop });
  const token = useToken(shop);
  const card = useQuery(api.loyaltyCustomer.card, token ? { shop, token } : "skip");

  // A token the server no longer accepts (expired, password reset, card archived) is dropped.
  useEffect(() => {
    if (token && card === null) writeToken(shop, null);
  }, [token, card, shop]);

  // Signed in from the shop-wide link: move to this card's own link.
  useEffect(() => {
    if (!username && card) router.replace(cardPath(shop, card.username));
  }, [username, card, shop, router]);

  if (info === undefined || (token && card === undefined)) {
    return <div className="mx-auto h-80 w-full max-w-sm animate-pulse rounded-2xl bg-card" />;
  }
  if (info === null) {
    return (
      <div className="mx-auto grid max-w-sm gap-3 rounded-2xl border bg-card p-10 text-center text-muted-foreground">
        <Stamp className="mx-auto size-8" />
        <p className="font-medium text-foreground">There&apos;s no loyalty card here.</p>
        <p className="text-sm">Check the link, or ask the shop for it.</p>
      </div>
    );
  }
  // A session for a different card on this shop (a shared phone) asks for this card's password.
  if (!token || !card || (username && card.username !== username)) return <SignIn shop={shop} info={info} username={username} />;

  const left = card.stampsRequired - card.stamps;
  return (
    <div className="mx-auto grid w-full max-w-sm gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">Signed in as @{card.username}</p>
          <h1 className="truncate text-xl font-semibold">Hi, {card.name}</h1>
        </div>
        <SignOut shop={shop} token={token} />
      </div>

      <StampCard
        shopName={card.shopName}
        cardName={card.program.name}
        reward={card.program.reward}
        color={card.program.color}
        holder={card.name}
        stampsRequired={card.stampsRequired}
        stamps={card.current}
      />

      <p className="rounded-xl border bg-card p-4 text-center text-sm">
        {left <= 0 ? (
          <><Gift className="mr-1 inline size-4 text-primary" /> <strong>Your reward is ready.</strong> Show this card at the counter.</>
        ) : (
          <><strong>{left} more stamp{left === 1 ? "" : "s"}</strong> to {card.program.reward.charAt(0).toLowerCase() + card.program.reward.slice(1)}.</>
        )}
        {card.rewardsEarned > 0 && (
          <span className="mt-1 block text-muted-foreground">Rewards earned so far: {card.rewardsEarned}</span>
        )}
      </p>

      {card.history.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <ol className="grid divide-y rounded-xl border bg-card">
            {card.history.map((entry, i) => (
              <li key={i} className="flex items-center gap-3 p-3 text-sm">
                <div className="h-9 w-16 shrink-0 rounded-md border bg-white p-1 text-[#1b2a6b]">
                  <SignatureView signature={entry.signature} label="Staff signature" className="size-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{entry.kind === "stamp" ? `Stamp for receipt #${entry.saleNumber}` : "Reward received"}</p>
                  <p className="text-xs text-muted-foreground">{date(entry.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {card.program.terms && <p className="text-xs text-muted-foreground">{card.program.terms}</p>}
      <p className="text-xs text-muted-foreground">Each stamp is signed by the staff member who gave it. To change your password, ask the shop.</p>
    </div>
  );
}

type Info = NonNullable<ReturnType<typeof useQuery<typeof api.loyaltyCustomer.shop>>>;

function SignIn({ shop, info, username: fixed }: { shop: string; info: Info; username?: string }) {
  const signIn = useMutation(api.loyaltyCustomer.signIn);
  const [username, setUsername] = useState(fixed ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(fixed ? "Enter your password." : "Enter your username and password.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const res = await signIn({ shop, username, password });
      if (res.ok) writeToken(shop, res.token);
      else setError(res.error);
    } catch {
      setError("Couldn't sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-sm gap-6">
      <StampCard
        shopName={info.shopName}
        cardName={info.cardName}
        reward={info.reward}
        color={info.color}
        stampsRequired={info.stampsRequired}
        stamps={[]}
      />
      <form onSubmit={submit} noValidate className="grid gap-4 rounded-2xl border bg-card p-5">
        <div>
          <h1 className="text-lg font-semibold">See your stamps</h1>
          <p className="text-sm text-muted-foreground">
            {fixed ? <>Signing in as <strong>@{fixed}</strong>. Enter the password {info.shopName} gave you.</> : <>Sign in with the username and password {info.shopName} gave you.</>}
          </p>
        </div>
        {fixed ? (
          // Kept in the form so password managers save the right username.
          <input type="hidden" name="username" autoComplete="username" value={fixed} />
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="cc-username">Username</Label>
            <Input id="cc-username" className="h-11" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="cc-password">Password</Label>
          <Input id="cc-password" type="password" className="h-11" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <FieldError message={error} />
        <Button type="submit" className="h-11" disabled={busy}>Sign in</Button>
        <p className="text-xs text-muted-foreground">Forgot your password? Ask the staff at {info.shopName} to reset it.</p>
        {fixed && (
          <a href={`/loyalty/${encodeURIComponent(shop)}`} className="text-xs text-muted-foreground underline underline-offset-2">Not @{fixed}? Use a different username</a>
        )}
      </form>
    </div>
  );
}

function SignOut({ shop, token }: { shop: string; token: string }) {
  const signOut = useMutation(api.loyaltyCustomer.signOut);
  return (
    <Button
      variant="ghost"
      className="h-11"
      onClick={async () => {
        writeToken(shop, null);
        await signOut({ token }).catch(() => undefined);
      }}
    >
      <LogOut className="size-4" /> Sign out
    </Button>
  );
}
