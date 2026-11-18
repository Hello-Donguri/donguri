"use client";

import { useTransition } from "react";
import { deleteCategory } from "@/lib/actions/admin-content";
import { useTranslations } from "@/components/i18n/locale-provider";

// Deleting a deck after a confirm — for the "Delete" item in an admin deck
// card's menu (see DeckActionsMenu).
export function useDeleteDeck({
  languageDeckId,
  label,
  wordCount,
}: {
  languageDeckId: string;
  label: string;
  wordCount: number;
}) {
  const t = useTranslations();
  const [deleting, startDeleteTransition] = useTransition();

  const deleteDeck = () => {
    if (
      !confirm(
        t(
          "admin_course_decks.confirm_delete",
          'Permanently delete "{{label}}" and all {{count}} of its words? This also deletes every learner\'s progress on them. This can\'t be undone — use the show/hide toggle instead if you just want to hide it.',
          { label, count: wordCount },
        ),
      )
    )
      return;
    startDeleteTransition(() => deleteCategory(languageDeckId));
  };

  return { deleting, deleteDeck };
}
