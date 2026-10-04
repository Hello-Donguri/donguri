-- Cantonese for English speakers: "Test Grammar" deck — 3 grammar points
-- (咗, 緊, 有冇) with Jyutping and example sentences, for trying out
-- grammar reviews/quizzes. The examples set `en_highlight` so the English
-- translation highlights the verb even where its English form differs from
-- the grammar point's wording ("ate", "went", ...). Idempotent: does nothing
-- if the course already has a deck with this title.
-- Run in the Supabase SQL editor, like schema.sql.

do $$
declare
  v_course uuid;
  v_deck uuid;
  v_word uuid;
begin
  select id into v_course from public.courses where slug = 'yue-for-en';
  if v_course is null then
    raise notice 'yue-for-en course not found — skipping';
    return;
  end if;
  if exists (select 1 from public.language_decks where course_id = v_course and title = 'Test Grammar') then
    raise notice 'Test Grammar deck already exists — skipping';
    return;
  end if;

  insert into public.language_decks (course_id, title, subheading, position)
  values (
    v_course,
    'Test Grammar',
    'Finished actions, things happening now, and yes/no questions',
    (select coalesce(max(position), 0) + 1 from public.language_decks where course_id = v_course)
  )
  returning id into v_deck;

  -- Verb + 咗
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'Verb + 咗', 'Say an action is finished (did / have done).', 'zo2', 'Put 咗 straight after the verb. Cantonese verbs don''t change form for the past — 咗 does that job: 食 (eat) → 食咗 (ate / have eaten).', null, null, 1)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, en_highlight, ja_highlight, position) values
    (v_word, 'I ate lunch.', '我食咗晏。', 'ngo5 sik6 zo2 aan3.', 'ate', null, 1),
    (v_word, 'She went to Hong Kong.', '佢去咗香港。', 'keoi5 heoi3 zo2 hoeng1 gong2.', 'went', '去咗', 2),
    (v_word, 'I bought a book.', '我買咗一本書。', 'ngo5 maai5 zo2 jat1 bun2 syu1.', 'bought', null, 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '咗', 1);

  -- Verb + 緊
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'Verb + 緊', 'Say an action is happening right now (is doing).', 'gan2', 'Put 緊 straight after the verb, like English -ing: 食 (eat) → 食緊 (is eating).', null, null, 2)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, en_highlight, ja_highlight, position) values
    (v_word, 'I''m eating.', '我食緊飯。', 'ngo5 sik6 gan2 faan6.', 'eating', null, 1),
    (v_word, 'He''s watching TV.', '佢睇緊電視。', 'keoi5 tai2 gan2 din6 si6.', 'watching', null, 2),
    (v_word, 'It''s raining outside.', '外面落緊雨。', 'ngoi6 min6 lok6 gan2 jyu5.', 'raining', null, 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '緊', 1);

  -- 有冇 + noun / verb?
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', '有冇 + noun / verb?', 'Ask a yes/no question about having or doing (do you have ...? / did you ...?).', 'jau5 mou5', '有冇 is "have" (有) + "not have" (冇) — literally "have or not have?". Before a noun it asks "do you have ...?"; before a verb it asks "did you ...?". Answer 有 (yes) or 冇 (no).', null, null, 3)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, en_highlight, ja_highlight, position) values
    (v_word, 'Do you have any money?', '你有冇錢？', 'nei5 jau5 mou5 cin2?', 'Do you have', null, 1),
    (v_word, 'Have you been to Japan?', '你有冇去過日本？', 'nei5 jau5 mou5 heoi3 gwo3 jat6 bun2?', 'Have you been', null, 2),
    (v_word, 'Did he come?', '佢有冇嚟？', 'keoi5 jau5 mou5 lei4?', 'Did he come', null, 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '有冇', 1);

end;
$$;
