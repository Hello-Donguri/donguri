-- English for Japanese speakers: "Noodles" deck — a single word, noodles,
-- with lots of example sentences. Its forms are the plural (the everyday
-- word) and the singular (one strand), each tied to the examples that use
-- it so they turn into fill-in-the-blank questions. Idempotent: does
-- nothing if the course already has a deck with this title. Run in the
-- Supabase SQL editor, like schema.sql.

do $$
declare
  v_course uuid;
  v_deck uuid;
  v_word uuid;
  v_plural uuid;
  v_singular uuid;
begin
  select id into v_course from public.courses where slug = 'en-for-ja';
  if v_course is null then
    raise notice 'en-for-ja course not found — skipping';
    return;
  end if;
  if exists (select 1 from public.language_decks where course_id = v_course and title = 'Noodles') then
    raise notice 'Noodles deck already exists — skipping';
    return;
  end if;

  insert into public.language_decks (course_id, title, subheading, tags, position)
  values (
    v_course,
    'Noodles',
    'One word, lots of examples',
    '{"Food"}',
    (select coalesce(max(position), 0) + 1 from public.language_decks where course_id = v_course)
  )
  returning id into v_deck;

  insert into public.words (language_deck_id, path, term, translation, explanation, explanation_ja, category_id, word_type, position)
  values (
    v_deck,
    'vocab',
    'noodles',
    '麺、ヌードル',
    'Usually plural — noodles — because you eat lots of them at once. Use noodle for a single strand. It covers ramen, udon, soba and instant noodles.',
    'ふつうは複数形の noodles を使います（一度にたくさん食べるので）。1本だけのときは noodle です。ラーメン、うどん、そば、インスタント麺など、いろいろな麺に使えます。',
    (select id from public.word_categories where name = 'Food & Drink'),
    'noun',
    1
  )
  returning id into v_word;

  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数形', 'noodles', 1)
  returning id into v_plural;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数形', 'noodle', 2)
  returning id into v_singular;

  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_plural, 'I had noodles for lunch today.', '今日はお昼に麺を食べました。', 'noodles', '麺', 1),
    (v_word, v_plural, 'These noodles are too hot to eat.', 'この麺は熱すぎて食べられません。', 'noodles', '麺', 2),
    (v_word, v_plural, 'My favorite noodles are ramen.', '私の好きな麺はラーメンです。', 'noodles', '麺', 3),
    (v_word, v_plural, 'Do you like cold noodles in summer?', '夏に冷たい麺は好きですか？', 'noodles', '麺', 4),
    (v_word, v_plural, 'She cooks noodles for her children every Sunday.', '彼女は毎週日曜日に子どもたちに麺を作ります。', 'noodles', '麺', 5),
    (v_word, v_plural, 'This shop makes its own noodles by hand.', 'この店は麺を手作りしています。', 'noodles', '麺', 6),
    (v_word, v_plural, 'Udon noodles are thick and soft.', 'うどんの麺は太くて柔らかいです。', 'noodles', '麺', 7),
    (v_word, v_plural, 'Soba noodles are made from buckwheat.', 'そばの麺はそば粉から作られます。', 'noodles', '麺', 8),
    (v_word, v_plural, 'Boil the noodles for three minutes.', '麺を3分間ゆでてください。', 'noodles', '麺', 9),
    (v_word, v_plural, 'In Japan, it''s okay to slurp your noodles.', '日本では、麺をすすって食べても大丈夫です。', 'noodles', '麺', 10),
    (v_word, v_plural, 'Let''s get some noodles after work.', '仕事のあとで麺を食べに行こう。', 'noodles', '麺', 11),
    (v_word, v_plural, 'Instant noodles are quick but not very healthy.', 'インスタント麺は手軽ですが、あまり健康的ではありません。', 'Instant noodles', 'インスタント麺', 12),
    (v_word, v_plural, 'Would you like rice or noodles with that?', 'ご飯と麺、どちらにしますか？', 'noodles', '麺', 13),
    (v_word, v_plural, 'I''m so hungry I could eat a big bowl of noodles.', 'お腹がぺこぺこで、大盛りの麺が食べられそうです。', 'noodles', '麺', 14),
    (v_word, v_singular, 'There''s one long noodle left in the bowl.', 'どんぶりに長い麺が一本残っています。', 'noodle', '麺', 15),
    (v_word, v_singular, 'He dropped a noodle on his shirt.', '彼はシャツに麺を一本落としました。', 'noodle', '麺', 16);

  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'めん', 1),
    (v_word, '麺類', 2);
end;
$$;
