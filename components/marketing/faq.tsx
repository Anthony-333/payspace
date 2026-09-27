"use client";

import { useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { cn } from "cn";
import { FAQ, type FaqCategory } from "./content";

const CATEGORIES: FaqCategory[] = ["General", "Pricing", "Payments", "Data"];

export function Faq() {
  const [category, setCategory] = useState<FaqCategory>("General");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(FAQ[0].q);

  // A search looks across every category; otherwise show the selected one.
  const needle = query.trim().toLowerCase();
  const items = needle
    ? FAQ.filter((f) => (f.q + " " + f.a).toLowerCase().includes(needle))
    : FAQ.filter((f) => f.category === category);

  return (
    <section id="faq" className="mx-auto w-full max-w-7xl scroll-mt-6 px-4 py-8 sm:px-6">
      <div className="rounded-[32px] bg-muted px-6 py-12 sm:px-14 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-md text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Frequently asked questions
          </h2>
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="flex w-full max-w-sm items-center rounded-full bg-card p-1.5 pl-5 shadow-sm"
          >
            <label htmlFor="faq-search" className="sr-only">
              Search questions
            </label>
            <input
              id="faq-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your question here"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Search className="size-4" /> Search
            </button>
          </form>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-[180px_1fr]">
          <div role="group" aria-label="Question topics" className="flex gap-2 overflow-x-auto md:flex-col">
            {CATEGORIES.map((c) => {
              const active = !needle && c === category;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setQuery("");
                    setCategory(c);
                  }}
                  className={cn(
                    "shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-card text-primary"
                      : "border-transparent text-foreground/80 hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div className="divide-y">
            {items.length === 0 && (
              <p className="py-5 text-muted-foreground">
                No questions match “{query}”. Try another word.
              </p>
            )}
            {items.map((f) => {
              const isOpen = open === f.q;
              const id = `faq-${FAQ.indexOf(f)}`;
              return (
                <div key={f.q} className="py-5 first:pt-0">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={id}
                      onClick={() => setOpen(isOpen ? null : f.q)}
                      className={cn(
                        "flex w-full items-center justify-between gap-4 text-left text-lg font-medium",
                        isOpen && "text-primary",
                      )}
                    >
                      {f.q}
                      {isOpen ? <Minus className="size-5 shrink-0" /> : <Plus className="size-5 shrink-0" />}
                    </button>
                  </h3>
                  <p id={id} hidden={!isOpen} className="mt-3 max-w-2xl text-muted-foreground">
                    {f.a}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
