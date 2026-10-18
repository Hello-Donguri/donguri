"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";
import { searchUsers } from "@/lib/actions/friends";
import type { FollowUser } from "@/lib/definitions";
import { DonguriAvatar } from "@/components/icons/DonguriAvatar";
import { FollowButton } from "@/components/social/follow-button";
import { useTranslations } from "@/components/i18n/locale-provider";

const DEBOUNCE_MS = 250;

// Find people to follow: results appear as you type — part of a username,
// or someone's exact email — each with their Donguri, level and a Follow /
// Follow back / Following button (see searchUsersToFollow in lib/dal.ts).
export function UserSearch() {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FollowUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  // Only the newest search's answer is shown, however they arrive.
  const latest = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Searches a moment after typing stops; under two letters clears it.
  const change = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const id = ++latest.current;
    const trimmed = value.trim();

    if (trimmed.replace(/^@/, "").length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    timer.current = setTimeout(() => {
      searchUsers(trimmed)
        .then((found) => {
          if (id === latest.current) setResults(found);
        })
        .finally(() => {
          if (id === latest.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
  };

  return (
    <div>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-sumi-soft" />
        <input
          type="search"
          value={query}
          onChange={(event) => change(event.target.value)}
          placeholder={t("user_search.placeholder", "Find friends by username or email")}
          aria-label={t("user_search.label", "Find people to follow")}
          autoComplete="off"
          className="h-10 w-full rounded-full border border-sumi/15 bg-washi pr-10 pl-10 text-sm text-sumi outline-none transition focus:border-ai/50 [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="absolute top-1/2 right-3 -translate-y-1/2">
          {loading ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin text-sumi-soft" />
          ) : (
            query && (
              <button
                type="button"
                onClick={() => change("")}
                aria-label={t("user_search.clear", "Clear search")}
                className="flex h-5 w-5 items-center justify-center rounded-full text-sumi-soft hover:bg-sumi/5 hover:text-sumi"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </span>
      </div>

      {results && (
        <div className="mt-2 rounded-2xl border border-card-border bg-washi p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-sumi-soft">
              {t("user_search.none", "No one found — check the spelling, or try their email.")}
            </p>
          ) : (
            <ul aria-live="polite">
              {results.map((person) => (
                <li key={person.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-washi-soft">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised">
                    <DonguriAvatar equippedAccessory={person.equippedAccessory} className="h-7 w-7" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {person.profileHref ? (
                      <Link href={person.profileHref} className="block truncate text-sm font-semibold text-sumi hover:underline">
                        @{person.username}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm font-semibold text-sumi">@{person.username}</span>
                    )}
                    <span className="text-xs text-sumi-soft">
                      {t("xp_counter.level", "Lv {{level}}", { level: person.level })}
                      {person.followsViewer && <> · {t("follow.follows_you", "Follows you")}</>}
                    </span>
                  </div>
                  <FollowButton
                    userId={person.id}
                    username={person.username}
                    initialFollowing={person.viewerFollows}
                    followsYou={person.followsViewer}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
