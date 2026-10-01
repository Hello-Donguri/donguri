import { connection, type NextRequest } from "next/server";
import { getLessonWord } from "@/lib/dal";

// One word's learn card, for the quizzes' lesson (the "See the lesson"
// modal, and the review's lesson shown after a wrong answer). A route
// handler rather than a server action: the review preloads it in the
// background while the question is up, and the client runs server actions
// one at a time, so a preload could otherwise hold up the answer behind it.
// Read-only; getLessonWord checks the learner is enrolled in the course.
export async function GET(request: NextRequest) {
  await connection();
  const course = request.nextUrl.searchParams.get("course");
  const word = request.nextUrl.searchParams.get("word");
  if (!course || !word) {
    return Response.json(null, { status: 400 });
  }

  const lesson = await getLessonWord(course, word);
  return Response.json(lesson, {
    status: lesson ? 200 : 404,
    headers: { "Cache-Control": "no-store" },
  });
}
