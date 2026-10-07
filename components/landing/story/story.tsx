import type { TFunction } from "@/lib/i18n/translate";
import { LearnStory } from "@/components/landing/story/learn-story";
import { QuizStory } from "@/components/landing/story/quiz-story";
import { ReviewStory } from "@/components/landing/story/review-story";
import { ChatStory } from "@/components/landing/story/chat-story";

// The landing page's four steps — learn, quiz, review, daily chat — each a
// scroll-driven scene (see ScrollStory). Translated here on the server and
// handed down as plain strings, since the scenes run in the browser.
export function Story({ t }: { t: TFunction }) {
  return (
    <>
      <LearnStory
        copy={{
          step: 1,
          eyebrow: t("home.story.learn_eyebrow", "Learn"),
          heading: t("home.story.learn_heading", "Three new words at a time."),
          body: t(
            "home.story.learn_body",
            "Each with a picture, audio and real examples, explained in Japanese.",
          ),
        }}
        labels={{
          vocabulary: t("home.mock.vocabulary", "Vocabulary"),
          listen: t("home.mock.listen", "Listen"),
          example: t("home.mock.example", "Example"),
          gotIt: t("home.story.got_it", "Got it"),
        }}
      />

      <QuizStory
        copy={{
          step: 2,
          eyebrow: t("home.story.quiz_eyebrow", "Quiz"),
          heading: t("home.story.quiz_heading", "Test yourself straight away."),
          body: t("home.story.quiz_body", "Pick it, then type it. Get it right and the XP rolls in."),
        }}
        labels={{
          quiz: t("home.story.quiz_eyebrow", "Quiz"),
          typeYourAnswer: t("test_session.type_answer_placeholder", "Type your answer"),
          check: t("test_session.check", "Check"),
          whatDoesThisMean: t("home.story.what_does_this_mean", "What does this mean?"),
          fillBlank: t("home.mock.fill_blank", "Fill in the blank"),
          greatJob: t("home.mock.great_job", "Great job! You got it."),
        }}
      />

      <ReviewStory
        copy={{
          step: 3,
          eyebrow: t("home.story.review_eyebrow", "Review"),
          heading: t("home.story.review_heading", "Words come back just in time."),
          body: t(
            "home.story.review_body",
            "Right before you'd forget, and further apart each time, until they're yours for good.",
          ),
        }}
        labels={{
          // The real stages and waits — STAGES in lib/srs.ts.
          stages: [
            { name: t("home.review.stage_basic", "Basic 1"), wait: t("home.review.wait_15m", "15 minutes") },
            { name: t("home.review.stage_1", "Beginner 1"), wait: t("home.review.wait_4h", "4 hours") },
            { name: t("home.review.stage_2", "Beginner 2"), wait: t("home.review.wait_1d", "1 day") },
            { name: t("home.review.stage_3", "Beginner 3"), wait: t("home.review.wait_3d", "3 days") },
            { name: t("home.review.stage_4", "Intermediate 1"), wait: t("home.review.wait_1w", "1 week") },
            { name: t("home.review.stage_5", "Intermediate 2"), wait: t("home.review.wait_2w", "2 weeks") },
            { name: t("home.review.stage_6", "Expert 1"), wait: t("home.review.wait_1m", "1 month") },
          ],
          mastered: t("home.review.mastered", "Mastered"),
        }}
      />

      <ChatStory
        copy={{
          step: 4,
          eyebrow: t("home.story.chat_eyebrow", "Daily chat"),
          heading: t("home.story.chat_heading", "Meet Charles Duck."),
          body: t(
            "home.story.chat_body",
            "Your friendly chat buddy. He chats about everyday things and helps you use your new words for real.",
          ),
        }}
        labels={{
          hello: t("home.story.charles_hello", "Hi! I'm Charles 👋"),
          todaysWord: t("home.mock.todays_word", "Today's word:"),
          online: t("home.story.online", "Online now"),
          complete: t("home.story.challenge_complete", "Challenge complete"),
          try: t("home.mock.try", "Try"),
          scores: [
            { label: t("home.mock.score_grammar", "Grammar"), score: 9 },
            { label: t("home.mock.score_natural", "Natural phrasing"), score: 8 },
            { label: t("home.mock.score_relevance", "Relevance"), score: 10 },
            { label: t("home.mock.score_complexity", "Complexity"), score: 7 },
          ],
        }}
      />
    </>
  );
}
