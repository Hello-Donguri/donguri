-- Cantonese for English speakers: "Time & Dates" deck — 51 words and
-- 13 grammar points about telling the time and date, with Jyutping and
-- example sentences. Generated content, kept here so it can be re-applied to
-- another database (e.g. production). Idempotent: does nothing if the course
-- already has a deck with this title.
-- Run in the Supabase SQL editor, like schema.sql.

do $$
declare
  v_course uuid;
  v_deck uuid;
  v_category uuid;
  v_word uuid;
begin
  select id into v_course from public.courses where slug = 'yue-for-en';
  if v_course is null then
    raise notice 'yue-for-en course not found — skipping';
    return;
  end if;
  if exists (select 1 from public.language_decks where course_id = v_course and title = 'Time & Dates') then
    raise notice 'Time & Dates deck already exists — skipping';
    return;
  end if;

  select id into v_category from public.word_categories where name = 'Time & Weather';

  insert into public.language_decks (course_id, title, subheading, position)
  values (
    v_course,
    'Time & Dates',
    'Telling the time, days, dates and ''how long ago''',
    (select coalesce(max(position), 0) + 1 from public.language_decks where course_id = v_course)
  )
  returning id into v_deck;

  -- 今日
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '今日', 'today', 'gam1 jat6', null, v_category, 'noun', 1)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Today is Monday.', '今日係星期一。', 'gam1 jat6 hai6 sing1 kei4 jat1.', 1),
    (v_word, 'I''m really busy today.', '我今日好忙。', 'ngo5 gam1 jat6 hou2 mong4.', 2),
    (v_word, 'What are you doing today?', '你今日做乜嘢呀？', 'nei5 gam1 jat6 zou6 mat1 je5 aa3?', 3);

  -- 聽日
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '聽日', 'tomorrow', 'ting1 jat6', null, v_category, 'noun', 2)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'See you tomorrow!', '聽日見！', 'ting1 jat6 gin3!', 1),
    (v_word, 'Are you free tomorrow?', '你聽日得唔得閒呀？', 'nei5 ting1 jat6 dak1 m4 dak1 haan4 aa3?', 2),
    (v_word, 'I have to work tomorrow.', '我聽日要返工。', 'ngo5 ting1 jat6 jiu3 faan1 gung1.', 3);

  -- 尋日
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '尋日', 'yesterday', 'cam4 jat6', null, v_category, 'noun', 3)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'What did you do yesterday?', '你尋日做咗乜嘢呀？', 'nei5 cam4 jat6 zou6 zo2 mat1 je5 aa3?', 1),
    (v_word, 'It was really cold yesterday.', '尋日好凍。', 'cam4 jat6 hou2 dung3.', 2),
    (v_word, 'I went to see a film yesterday.', '我尋日去咗睇戲。', 'ngo5 cam4 jat6 heoi3 zo2 tai2 hei3.', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, '琴日', 1);

  -- 後日
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '後日', 'the day after tomorrow', 'hau6 jat6', null, v_category, 'noun', 4)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I''m going to Hong Kong the day after tomorrow.', '我後日去香港。', 'ngo5 hau6 jat6 heoi3 hoeng1 gong2.', 1),
    (v_word, 'The day after tomorrow is Saturday.', '後日係星期六。', 'hau6 jat6 hai6 sing1 kei4 luk6.', 2),
    (v_word, 'Let''s meet the day after tomorrow.', '我哋後日見啦。', 'ngo5 dei6 hau6 jat6 gin3 laa1.', 3);

  -- 前日
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '前日', 'the day before yesterday', 'cin4 jat6', null, v_category, 'noun', 5)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I saw him the day before yesterday.', '我前日見到佢。', 'ngo5 cin4 jat6 gin3 dou2 keoi5.', 1),
    (v_word, 'It rained the day before yesterday.', '前日落雨。', 'cin4 jat6 lok6 jyu5.', 2),
    (v_word, 'She came back the day before yesterday.', '佢前日返咗嚟。', 'keoi5 cin4 jat6 faan1 zo2 lai4.', 3);

  -- 朝早
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '朝早', 'morning', 'ziu1 zou2', null, v_category, 'noun', 6)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I drink coffee every morning.', '我每日朝早飲咖啡。', 'ngo5 mui5 jat6 ziu1 zou2 jam2 gaa3 fe1.', 1),
    (v_word, 'It''s nice and cool in the morning.', '朝早好涼。', 'ziu1 zou2 hou2 loeng4.', 2),
    (v_word, 'I go running in the morning.', '我朝早去跑步。', 'ngo5 ziu1 zou2 heoi3 paau2 bou6.', 3);

  -- 晏晝
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '晏晝', 'midday / lunchtime', 'aan3 zau3', 'Around midday and early afternoon — the time you''d have lunch. 晏晝飯 is lunch.', v_category, 'noun', 7)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'What do you want to eat at lunchtime?', '你晏晝想食乜嘢？', 'nei5 aan3 zau3 soeng2 sik6 mat1 je5?', 1),
    (v_word, 'I have a meeting at midday today.', '我今日晏晝要開會。', 'ngo5 gam1 jat6 aan3 zau3 jiu3 hoi1 wui2.', 2),
    (v_word, 'It''s really hot at midday.', '晏晝好熱。', 'aan3 zau3 hou2 jit6.', 3);

  -- 下晝
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '下晝', 'afternoon', 'haa6 zau3', null, v_category, 'noun', 8)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I''m free in the afternoon.', '我下晝得閒。', 'ngo5 haa6 zau3 dak1 haan4.', 1),
    (v_word, 'Let''s go shopping in the afternoon.', '我哋下晝去行街啦。', 'ngo5 dei6 haa6 zau3 heoi3 haang4 gaai1 laa1.', 2),
    (v_word, 'He has a nap in the afternoon.', '佢下晝瞓覺。', 'keoi5 haa6 zau3 fan3 gaau3.', 3);

  -- 夜晚
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '夜晚', 'evening / night', 'je6 maan5', null, v_category, 'noun', 9)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I study at night.', '我夜晚溫書。', 'ngo5 je6 maan5 wan1 syu1.', 1),
    (v_word, 'The city is really pretty at night.', '夜晚個城市好靚。', 'je6 maan5 go3 sing4 si5 hou2 leng3.', 2),
    (v_word, 'Don''t drink coffee in the evening.', '夜晚唔好飲咖啡。', 'je6 maan5 m4 hou2 jam2 gaa3 fe1.', 3);

  -- 今朝
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '今朝', 'this morning', 'gam1 ziu1', null, v_category, 'noun', 10)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'What did you eat this morning?', '你今朝食咗乜嘢？', 'nei5 gam1 ziu1 sik6 zo2 mat1 je5?', 1),
    (v_word, 'I got up really early this morning.', '我今朝好早起身。', 'ngo5 gam1 ziu1 hou2 zou2 hei2 san1.', 2),
    (v_word, 'It was raining this morning.', '今朝落緊雨。', 'gam1 ziu1 lok6 gan2 jyu5.', 3);

  -- 今晚
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '今晚', 'tonight', 'gam1 maan5', null, v_category, 'noun', 11)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'What are we eating tonight?', '我哋今晚食乜嘢？', 'ngo5 dei6 gam1 maan5 sik6 mat1 je5?', 1),
    (v_word, 'Are you free tonight?', '你今晚得唔得閒？', 'nei5 gam1 maan5 dak1 m4 dak1 haan4?', 2),
    (v_word, 'I''m staying at home tonight.', '我今晚留喺屋企。', 'ngo5 gam1 maan5 lau4 hai2 uk1 kei2.', 3);

  -- 尋晚
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '尋晚', 'last night', 'cam4 maan5', null, v_category, 'noun', 12)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Did you sleep well last night?', '你尋晚瞓得好唔好？', 'nei5 cam4 maan5 fan3 dak1 hou2 m4 hou2?', 1),
    (v_word, 'I went out with friends last night.', '我尋晚同朋友出咗去。', 'ngo5 cam4 maan5 tung4 pang4 jau5 ceot1 zo2 heoi3.', 2),
    (v_word, 'It was really cold last night.', '尋晚好凍。', 'cam4 maan5 hou2 dung3.', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, '琴晚', 1);

  -- 聽朝
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '聽朝', 'tomorrow morning', 'ting1 ziu1', null, v_category, 'noun', 13)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I''ll call you tomorrow morning.', '我聽朝打俾你。', 'ngo5 ting1 ziu1 daa2 bei2 nei5.', 1),
    (v_word, 'I have to get up early tomorrow morning.', '我聽朝要早啲起身。', 'ngo5 ting1 ziu1 jiu3 zou2 di1 hei2 san1.', 2),
    (v_word, 'See you tomorrow morning.', '聽朝見。', 'ting1 ziu1 gin3.', 3);

  -- 星期一
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '星期一', 'Monday', 'sing1 kei4 jat1', 'The days are just numbers: 星期 (week) + one to six. Sunday is 星期日. 禮拜一 is another common way to say it.', v_category, 'noun', 14)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I go back to work on Monday.', '我星期一返工。', 'ngo5 sing1 kei4 jat1 faan1 gung1.', 1),
    (v_word, 'Mondays are always busy.', '星期一成日都好忙。', 'sing1 kei4 jat1 seng4 jat6 dou1 hou2 mong4.', 2),
    (v_word, 'See you on Monday!', '星期一見！', 'sing1 kei4 jat1 gin3!', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, '禮拜一', 1);

  -- 星期二
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '星期二', 'Tuesday', 'sing1 kei4 ji6', null, v_category, 'noun', 15)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I have a Cantonese class on Tuesday.', '我星期二有廣東話堂。', 'ngo5 sing1 kei4 ji6 jau5 gwong2 dung1 waa2 tong4.', 1),
    (v_word, 'I was ill last Tuesday.', '上個星期二我病咗。', 'soeng6 go3 sing1 kei4 ji6 ngo5 beng6 zo2.', 2),
    (v_word, 'Are you free on Tuesday?', '你星期二得唔得閒？', 'nei5 sing1 kei4 ji6 dak1 m4 dak1 haan4?', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, '禮拜二', 1);

  -- 星期三
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '星期三', 'Wednesday', 'sing1 kei4 saam1', null, v_category, 'noun', 16)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'We meet up every Wednesday.', '我哋每個星期三見面。', 'ngo5 dei6 mui5 go3 sing1 kei4 saam1 gin3 min6.', 1),
    (v_word, 'I have Wednesday off.', '星期三我放假。', 'sing1 kei4 saam1 ngo5 fong3 gaa3.', 2),
    (v_word, 'The shop is closed on Wednesday.', '間舖頭星期三唔開。', 'gaan1 pou3 tau2 sing1 kei4 saam1 m4 hoi1.', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, '禮拜三', 1);

  -- 星期四
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '星期四', 'Thursday', 'sing1 kei4 sei3', null, v_category, 'noun', 17)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I play football on Thursday.', '我星期四踢波。', 'ngo5 sing1 kei4 sei3 tek3 bo1.', 1),
    (v_word, 'I''m free on Thursday evening.', '我星期四夜晚得閒。', 'ngo5 sing1 kei4 sei3 je6 maan5 dak1 haan4.', 2),
    (v_word, 'Is the party on Thursday?', '個派對係唔係星期四呀？', 'go3 paai3 deoi3 hai6 m4 hai6 sing1 kei4 sei3 aa3?', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, '禮拜四', 1);

  -- 星期五
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '星期五', 'Friday', 'sing1 kei4 ng5', null, v_category, 'noun', 18)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Friday is my favourite day.', '星期五係我最鍾意嘅日子。', 'sing1 kei4 ng5 hai6 ngo5 zeoi3 zung1 ji3 ge3 jat6 zi2.', 1),
    (v_word, 'Let''s go for a drink on Friday night.', '星期五夜晚去飲嘢啦。', 'sing1 kei4 ng5 je6 maan5 heoi3 jam2 je5 laa1.', 2),
    (v_word, 'I finish work early on Friday.', '我星期五早啲放工。', 'ngo5 sing1 kei4 ng5 zou2 di1 fong3 gung1.', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, '禮拜五', 1);

  -- 星期六
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '星期六', 'Saturday', 'sing1 kei4 luk6', null, v_category, 'noun', 19)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I don''t have to work on Saturday.', '我星期六唔使返工。', 'ngo5 sing1 kei4 luk6 m4 sai2 faan1 gung1.', 1),
    (v_word, 'What are you doing on Saturday?', '你星期六做乜嘢呀？', 'nei5 sing1 kei4 luk6 zou6 mat1 je5 aa3?', 2),
    (v_word, 'Let''s go hiking on Saturday.', '我哋星期六去行山啦。', 'ngo5 dei6 sing1 kei4 luk6 heoi3 haang4 saan1 laa1.', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, '禮拜六', 1);

  -- 星期日
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '星期日', 'Sunday', 'sing1 kei4 jat6', null, v_category, 'noun', 20)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I rest on Sunday.', '我星期日休息。', 'ngo5 sing1 kei4 jat6 jau1 sik1.', 1),
    (v_word, 'On Sunday we go for dim sum with the family.', '星期日我哋同屋企人飲茶。', 'sing1 kei4 jat6 ngo5 dei6 tung4 uk1 kei2 jan4 jam2 caa4.', 2),
    (v_word, 'Is the shop open on Sunday?', '間舖頭星期日開唔開？', 'gaan1 pou3 tau2 sing1 kei4 jat6 hoi1 m4 hoi1?', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, '禮拜日', 1);

  -- 週末
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '週末', 'weekend', 'zau1 mut6', null, v_category, 'noun', 21)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'What did you do at the weekend?', '你週末做咗乜嘢呀？', 'nei5 zau1 mut6 zou6 zo2 mat1 je5 aa3?', 1),
    (v_word, 'I love weekends.', '我鍾意週末。', 'ngo5 zung1 ji3 zau1 mut6.', 2),
    (v_word, 'I''m going to the beach this weekend.', '我呢個週末去海灘。', 'ngo5 ni1 go3 zau1 mut6 heoi3 hoi2 taan1.', 3);

  -- 今個星期
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '今個星期', 'this week', 'gam1 go3 sing1 kei4', null, v_category, 'phrase', 22)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I''m really busy this week.', '我今個星期好忙。', 'ngo5 gam1 go3 sing1 kei4 hou2 mong4.', 1),
    (v_word, 'How''s your week going?', '你今個星期點呀？', 'nei5 gam1 go3 sing1 kei4 dim2 aa3?', 2),
    (v_word, 'It''s rained every day this week.', '今個星期日日都落雨。', 'gam1 go3 sing1 kei4 jat6 jat6 dou1 lok6 jyu5.', 3);

  -- 下個星期
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '下個星期', 'next week', 'haa6 go3 sing1 kei4', null, v_category, 'phrase', 23)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I''m going travelling next week.', '我下個星期去旅行。', 'ngo5 haa6 go3 sing1 kei4 heoi3 leoi5 hang4.', 1),
    (v_word, 'See you next week!', '下個星期見！', 'haa6 go3 sing1 kei4 gin3!', 2),
    (v_word, 'My birthday is next week.', '下個星期係我生日。', 'haa6 go3 sing1 kei4 hai6 ngo5 saang1 jat6.', 3);

  -- 上個星期
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '上個星期', 'last week', 'soeng6 go3 sing1 kei4', null, v_category, 'phrase', 24)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I was in Japan last week.', '我上個星期喺日本。', 'ngo5 soeng6 go3 sing1 kei4 hai2 jat6 bun2.', 1),
    (v_word, 'What did you do last week?', '你上個星期做咗乜嘢？', 'nei5 soeng6 go3 sing1 kei4 zou6 zo2 mat1 je5?', 2),
    (v_word, 'I bought this last week.', '呢個我上個星期買嘅。', 'ni1 go3 ngo5 soeng6 go3 sing1 kei4 maai5 ge3.', 3);

  -- 今個月
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '今個月', 'this month', 'gam1 go3 jyut6', null, v_category, 'phrase', 25)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I''ve got lots to do this month.', '今個月好多嘢做。', 'gam1 go3 jyut6 hou2 do1 je5 zou6.', 1),
    (v_word, 'Do you get any time off this month?', '你今個月有冇假放？', 'nei5 gam1 go3 jyut6 jau5 mou5 gaa3 fong3?', 2),
    (v_word, 'It''s really hot this month.', '今個月好熱。', 'gam1 go3 jyut6 hou2 jit6.', 3);

  -- 下個月
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '下個月', 'next month', 'haa6 go3 jyut6', null, v_category, 'phrase', 26)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I''m moving house next month.', '我下個月搬屋。', 'ngo5 haa6 go3 jyut6 bun1 uk1.', 1),
    (v_word, 'See you next month.', '下個月見。', 'haa6 go3 jyut6 gin3.', 2),
    (v_word, 'I start a new job next month.', '我下個月開始新工。', 'ngo5 haa6 go3 jyut6 hoi1 ci2 san1 gung1.', 3);

  -- 上個月
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '上個月', 'last month', 'soeng6 go3 jyut6', null, v_category, 'phrase', 27)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I went to Taiwan last month.', '我上個月去咗台灣。', 'ngo5 soeng6 go3 jyut6 heoi3 zo2 toi4 waan1.', 1),
    (v_word, 'She came back last month.', '佢上個月返咗嚟。', 'keoi5 soeng6 go3 jyut6 faan1 zo2 lai4.', 2),
    (v_word, 'I started learning Cantonese last month.', '我上個月開始學廣東話。', 'ngo5 soeng6 go3 jyut6 hoi1 ci2 hok6 gwong2 dung1 waa2.', 3);

  -- 今年
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '今年', 'this year', 'gam1 nin2', 'In 今年, 舊年 and 出年, 年 is said with a rising tone (nin2). On its own or after a number (三年, three years) it''s nin4.', v_category, 'noun', 28)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'How old are you this year?', '你今年幾多歲？', 'nei5 gam1 nin2 gei2 do1 seoi3?', 1),
    (v_word, 'This year I want to learn Cantonese.', '我今年想學廣東話。', 'ngo5 gam1 nin2 soeng2 hok6 gwong2 dung1 waa2.', 2),
    (v_word, 'This year has gone by so fast.', '今年過得好快。', 'gam1 nin2 gwo3 dak1 hou2 faai3.', 3);

  -- 舊年
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '舊年', 'last year', 'gau6 nin2', null, v_category, 'noun', 29)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I went to Hong Kong last year.', '我舊年去咗香港。', 'ngo5 gau6 nin2 heoi3 zo2 hoeng1 gong2.', 1),
    (v_word, 'Last year was really busy.', '舊年好忙。', 'gau6 nin2 hou2 mong4.', 2),
    (v_word, 'We met last year.', '我哋舊年識嘅。', 'ngo5 dei6 gau6 nin2 sik1 ge3.', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, '去年', 1);

  -- 出年
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '出年', 'next year', 'ceot1 nin2', null, v_category, 'noun', 30)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Next year I want to go to Japan.', '我出年想去日本。', 'ngo5 ceot1 nin2 soeng2 heoi3 jat6 bun2.', 1),
    (v_word, 'See you next year!', '出年見！', 'ceot1 nin2 gin3!', 2),
    (v_word, 'My older brother is getting married next year.', '我哥哥出年結婚。', 'ngo5 go4 go1 ceot1 nin2 git3 fan1.', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, '明年', 1);

  -- 號
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '號', 'day of the month (date)', 'hou6', 'Number + 號 gives the date: 一號 is the 1st, 二十號 the 20th. 幾號 asks ''what date?''.', v_category, 'noun', 31)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Today is the 1st.', '今日係一號。', 'gam1 jat6 hai6 jat1 hou6.', 1),
    (v_word, 'What''s the date today?', '今日幾號呀？', 'gam1 jat6 gei2 hou6 aa3?', 2),
    (v_word, 'My birthday is on the 8th.', '我生日係八號。', 'ngo5 saang1 jat6 hai6 baat3 hou6.', 3);

  -- 春天
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '春天', 'spring', 'ceon1 tin1', null, v_category, 'noun', 32)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Spring is warm.', '春天好暖。', 'ceon1 tin1 hou2 nyun5.', 1),
    (v_word, 'The flowers are beautiful in spring.', '春天啲花好靚。', 'ceon1 tin1 di1 faa1 hou2 leng3.', 2),
    (v_word, 'I like spring.', '我鍾意春天。', 'ngo5 zung1 ji3 ceon1 tin1.', 3);

  -- 夏天
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '夏天', 'summer', 'haa6 tin1', null, v_category, 'noun', 33)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Summer in Hong Kong is really hot.', '香港嘅夏天好熱。', 'hoeng1 gong2 ge3 haa6 tin1 hou2 jit6.', 1),
    (v_word, 'I go swimming in the summer.', '我夏天去游水。', 'ngo5 haa6 tin1 heoi3 jau4 seoi2.', 2),
    (v_word, 'What are you doing this summer?', '你今年夏天做乜嘢？', 'nei5 gam1 nin2 haa6 tin1 zou6 mat1 je5?', 3);

  -- 秋天
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '秋天', 'autumn', 'cau1 tin1', null, v_category, 'noun', 34)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Autumn is the most comfortable season.', '秋天最舒服。', 'cau1 tin1 zeoi3 syu1 fuk6.', 1),
    (v_word, 'The leaves turn red in autumn.', '秋天啲葉會變紅。', 'cau1 tin1 di1 jip6 wui5 bin3 hung4.', 2),
    (v_word, 'We went to Japan in the autumn.', '我哋秋天去咗日本。', 'ngo5 dei6 cau1 tin1 heoi3 zo2 jat6 bun2.', 3);

  -- 冬天
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '冬天', 'winter', 'dung1 tin1', null, v_category, 'noun', 35)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Winter is really cold.', '冬天好凍。', 'dung1 tin1 hou2 dung3.', 1),
    (v_word, 'I don''t like winter.', '我唔鍾意冬天。', 'ngo5 m4 zung1 ji3 dung1 tin1.', 2),
    (v_word, 'Do you go skiing in winter?', '你冬天去唔去滑雪？', 'nei5 dung1 tin1 heoi3 m4 heoi3 waat6 syut3?', 3);

  -- 生日
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '生日', 'birthday', 'saang1 jat6', null, v_category, 'noun', 36)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Happy birthday!', '生日快樂！', 'saang1 jat6 faai3 lok6!', 1),
    (v_word, 'When is your birthday?', '你生日係幾時呀？', 'nei5 saang1 jat6 hai6 gei2 si4 aa3?', 2),
    (v_word, 'Today is my mum''s birthday.', '今日係我媽媽生日。', 'gam1 jat6 hai6 ngo5 maa4 maa1 saang1 jat6.', 3);

  -- 新年
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '新年', 'New Year', 'san1 nin4', null, v_category, 'noun', 37)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Happy New Year!', '新年快樂！', 'san1 nin4 faai3 lok6!', 1),
    (v_word, 'What are you doing for New Year?', '你新年做乜嘢呀？', 'nei5 san1 nin4 zou6 mat1 je5 aa3?', 2),
    (v_word, 'At New Year we visit our relatives.', '新年我哋去拜年。', 'san1 nin4 ngo5 dei6 heoi3 baai3 nin4.', 3);

  -- 假期
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '假期', 'holiday', 'gaa3 kei4', null, v_category, 'noun', 38)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'How was your holiday?', '你個假期點呀？', 'nei5 go3 gaa3 kei4 dim2 aa3?', 1),
    (v_word, 'The holiday is too short.', '個假期太短喇。', 'go3 gaa3 kei4 taai3 dyun2 laa3.', 2),
    (v_word, 'Where are you going this holiday?', '你今個假期去邊度玩呀？', 'nei5 gam1 go3 gaa3 kei4 heoi3 bin1 dou6 waan2 aa3?', 3);

  -- 放假
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '放假', 'to have time off / be on holiday', 'fong3 gaa3', null, v_category, 'verb', 39)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I''m off tomorrow.', '我聽日放假。', 'ngo5 ting1 jat6 fong3 gaa3.', 1),
    (v_word, 'When do you have time off?', '你幾時放假？', 'nei5 gei2 si4 fong3 gaa3?', 2),
    (v_word, 'I love being on holiday.', '我鍾意放假。', 'ngo5 zung1 ji3 fong3 gaa3.', 3);

  -- 分鐘
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '分鐘', 'minute', 'fan1 zung1', null, v_category, 'noun', 40)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Wait five minutes.', '等五分鐘。', 'dang2 ng5 fan1 zung1.', 1),
    (v_word, 'I''ll be there in ten minutes.', '我十分鐘之後到。', 'ngo5 sap6 fan1 zung1 zi1 hau6 dou3.', 2),
    (v_word, 'It''s a twenty-minute walk.', '行路去要二十分鐘。', 'haang4 lou6 heoi3 jiu3 ji6 sap6 fan1 zung1.', 3);

  -- 鐘頭
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '鐘頭', 'hour (length of time)', 'zung1 tau4', 'For how long something lasts. Always put 個 before it: 一個鐘頭 (one hour), 兩個鐘頭 (two hours) — 兩, not 二.', v_category, 'noun', 41)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I waited for an hour.', '我等咗一個鐘頭。', 'ngo5 dang2 zo2 jat1 go3 zung1 tau4.', 1),
    (v_word, 'The film is two hours long.', '套戲有兩個鐘頭。', 'tou3 hei3 jau5 loeng5 go3 zung1 tau4.', 2),
    (v_word, 'I work eight hours a day.', '我每日返八個鐘頭工。', 'ngo5 mui5 jat6 faan1 baat3 go3 zung1 tau4 gung1.', 3);

  -- 時間
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '時間', 'time', 'si4 gaan3', null, v_category, 'noun', 42)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I don''t have time.', '我冇時間。', 'ngo5 mou5 si4 gaan3.', 1),
    (v_word, 'Do you have time tomorrow?', '你聽日有冇時間？', 'nei5 ting1 jat6 jau5 mou5 si4 gaan3?', 2),
    (v_word, 'Time goes by so fast.', '時間過得好快。', 'si4 gaan3 gwo3 dak1 hou2 faai3.', 3);

  -- 而家
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '而家', 'now', 'ji4 gaa1', null, v_category, 'adverb', 43)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I''m busy right now.', '我而家好忙。', 'ngo5 ji4 gaa1 hou2 mong4.', 1),
    (v_word, 'Let''s go now.', '我哋而家走啦。', 'ngo5 dei6 ji4 gaa1 zau2 laa1.', 2),
    (v_word, 'Where are you now?', '你而家喺邊度？', 'nei5 ji4 gaa1 hai2 bin1 dou6?', 3);

  -- 啱啱
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '啱啱', 'just (a moment ago)', 'aam1 aam1', null, v_category, 'adverb', 44)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I just got home.', '我啱啱返到屋企。', 'ngo5 aam1 aam1 faan1 dou3 uk1 kei2.', 1),
    (v_word, 'He just left.', '佢啱啱走咗。', 'keoi5 aam1 aam1 zau2 zo2.', 2),
    (v_word, 'I''ve just eaten.', '我啱啱食咗飯。', 'ngo5 aam1 aam1 sik6 zo2 faan6.', 3);

  -- 遲啲
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '遲啲', 'later (on)', 'ci4 di1', null, v_category, 'adverb', 45)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Talk later!', '遲啲傾！', 'ci4 di1 king1!', 1),
    (v_word, 'I''ll do it later.', '我遲啲先做。', 'ngo5 ci4 di1 sin1 zou6.', 2),
    (v_word, 'Let''s have a meal together sometime.', '遲啲一齊食飯啦。', 'ci4 di1 jat1 cai4 sik6 faan6 laa1.', 3);

  -- 成日
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '成日', 'always / often', 'seng4 jat6', null, v_category, 'adverb', 46)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'He''s always late.', '佢成日遲到。', 'keoi5 seng4 jat6 ci4 dou3.', 1),
    (v_word, 'I often go hiking.', '我成日去行山。', 'ngo5 seng4 jat6 heoi3 haang4 saan1.', 2),
    (v_word, 'It often rains in Hong Kong in the summer.', '香港夏天成日落雨。', 'hoeng1 gong2 haa6 tin1 seng4 jat6 lok6 jyu5.', 3);

  -- 有時
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '有時', 'sometimes', 'jau5 si4', null, v_category, 'adverb', 47)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Sometimes I cook at home.', '我有時喺屋企煮飯。', 'ngo5 jau5 si4 hai2 uk1 kei2 zyu2 faan6.', 1),
    (v_word, 'Sometimes he''s late.', '佢有時遲到。', 'keoi5 jau5 si4 ci4 dou3.', 2),
    (v_word, 'Sometimes I take the bus to work.', '我有時搭巴士返工。', 'ngo5 jau5 si4 daap3 baa1 si2 faan1 gung1.', 3);

  -- 每日
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '每日', 'every day', 'mui5 jat6', null, v_category, 'adverb', 48)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I study Cantonese every day.', '我每日學廣東話。', 'ngo5 mui5 jat6 hok6 gwong2 dung1 waa2.', 1),
    (v_word, 'He goes running every day.', '佢每日跑步。', 'keoi5 mui5 jat6 paau2 bou6.', 2),
    (v_word, 'Do you cook every day?', '你每日都煮飯呀？', 'nei5 mui5 jat6 dou1 zyu2 faan6 aa3?', 3);

  -- 遲到
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '遲到', 'to be late', 'ci4 dou3', null, v_category, 'verb', 49)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Sorry, I''m late.', '唔好意思，我遲到。', 'm4 hou2 ji3 si1, ngo5 ci4 dou3.', 1),
    (v_word, 'Don''t be late!', '唔好遲到呀！', 'm4 hou2 ci4 dou3 aa3!', 2),
    (v_word, 'I was late for work today.', '我今日返工遲到。', 'ngo5 gam1 jat6 faan1 gung1 ci4 dou3.', 3);

  -- 早
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '早', 'early', 'zou2', null, v_category, 'adjective', 50)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'You''re early!', '你好早呀！', 'nei5 hou2 zou2 aa3!', 1),
    (v_word, 'I go to bed early.', '我好早瞓覺。', 'ngo5 hou2 zou2 fan3 gaau3.', 2),
    (v_word, 'Come a bit earlier tomorrow.', '聽日早啲嚟。', 'ting1 jat6 zou2 di1 lai4.', 3);

  -- 遲
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '遲', 'late', 'ci4', null, v_category, 'adjective', 51)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'It''s late — let''s go home.', '好遲喇，返屋企啦。', 'hou2 ci4 laa3, faan1 uk1 kei2 laa1.', 1),
    (v_word, 'I went to bed really late last night.', '我尋晚好遲先瞓。', 'ngo5 cam4 maan5 hou2 ci4 sin1 fan3.', 2),
    (v_word, 'Sorry for the late reply.', '唔好意思，咁遲先覆你。', 'm4 hou2 ji3 si1, gam3 ci4 sin1 fuk1 nei5.', 3);

  -- Number + 點鐘
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'Number + 點鐘', 'Say the hour (X o''clock).', 'dim2 zung1', 'Put the number before 點鐘. In casual speech 點鐘 is often shortened to just 點. For 2 o''clock say 兩點 (loeng5 dim2), not 二點.', v_category, null, 52)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'It''s three o''clock now.', '而家三點鐘。', 'ji4 gaa1 saam1 dim2 zung1.', 1),
    (v_word, 'I get up at seven o''clock.', '我七點鐘起身。', 'ngo5 cat1 dim2 zung1 hei2 san1.', 2),
    (v_word, 'Let''s meet at two o''clock.', '我哋兩點鐘見啦。', 'ngo5 dei6 loeng5 dim2 zung1 gin3 laa1.', 3),
    (v_word, 'The shop opens at ten o''clock.', '間舖頭十點鐘開。', 'gaan1 pou3 tau2 sap6 dim2 zung1 hoi1.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '點鐘', 1);

  -- Number + 點半
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'Number + 點半', 'Say half past the hour (half past X).', 'dim2 bun3', '半 means half. Add it straight after 點: 四點半 is half past four.', v_category, null, 53)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'It''s half past four.', '而家四點半。', 'ji4 gaa1 sei3 dim2 bun3.', 1),
    (v_word, 'She finishes work at half past six.', '佢六點半放工。', 'keoi5 luk6 dim2 bun3 fong3 gung1.', 2),
    (v_word, 'The film starts at half past eight.', '套戲八點半開始。', 'tou3 hei3 baat3 dim2 bun3 hoi1 ci2.', 3),
    (v_word, 'I have lunch at half past twelve.', '我十二點半食晏。', 'ngo5 sap6 ji6 dim2 bun3 sik6 aan3.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '點半', 1);

  -- X 點 Y 個字
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'X 點 Y 個字', 'Say minutes past the hour, counted in fives.', 'go3 zi6', 'Each 字 is one number on the clock face — five minutes. 一個字 = 5 minutes, 三個字 = 15, 九個字 = 45. So 三點一個字 is 3:05.', v_category, null, 54)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'It''s five past three.', '而家三點一個字。', 'ji4 gaa1 saam1 dim2 jat1 go3 zi6.', 1),
    (v_word, 'I''ll wait for you at quarter past nine.', '我九點三個字等你。', 'ngo5 gau2 dim2 saam1 go3 zi6 dang2 nei5.', 2),
    (v_word, 'The bus comes at twenty past ten.', '巴士十點四個字到。', 'baa1 si2 sap6 dim2 sei3 go3 zi6 dou3.', 3),
    (v_word, 'The class finishes at quarter to eight.', '堂課七點九個字完。', 'tong4 fo3 cat1 dim2 gau2 go3 zi6 jyun4.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '個字', 1);

  -- 幾點 + verb?
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', '幾點 + verb?', 'Ask what time something happens (what time ...?).', 'gei2 dim2', null, v_category, null, 55)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'What time is it now?', '而家幾點呀？', 'ji4 gaa1 gei2 dim2 aa3?', 1),
    (v_word, 'What time do you get up?', '你幾點起身？', 'nei5 gei2 dim2 hei2 san1?', 2),
    (v_word, 'What time shall we meet?', '我哋幾點見呀？', 'ngo5 dei6 gei2 dim2 gin3 aa3?', 3),
    (v_word, 'What time do you finish work?', '你幾點放工？', 'nei5 gei2 dim2 fong3 gung1?', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '幾點', 1);

  -- X 月 Y 號
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'X 月 Y 號', 'Say a date (month, then day).', 'jyut6 … hou6', 'Months are just numbers: 一月 is January, 十二月 is December. Say the month first, then the day with 號.', v_category, null, 56)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Today is the 1st of October.', '今日係十月一號。', 'gam1 jat6 hai6 sap6 jyut6 jat1 hou6.', 1),
    (v_word, 'My birthday is the 5th of March.', '我生日係三月五號。', 'ngo5 saang1 jat6 hai6 saam1 jyut6 ng5 hou6.', 2),
    (v_word, 'Christmas is the 25th of December.', '聖誕節係十二月二十五號。', 'sing3 daan3 zit3 hai6 sap6 ji6 jyut6 ji6 sap6 ng5 hou6.', 3),
    (v_word, 'What''s the date today?', '今日幾月幾號呀？', 'gam1 jat6 gei2 jyut6 gei2 hou6 aa3?', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '號', 1);

  -- 星期幾?
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', '星期幾?', 'Ask which day of the week (what day?).', 'sing1 kei4 gei2', null, v_category, null, 57)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'What day is it today?', '今日星期幾呀？', 'gam1 jat6 sing1 kei4 gei2 aa3?', 1),
    (v_word, 'Which day are you free?', '你星期幾得閒？', 'nei5 sing1 kei4 gei2 dak1 haan4?', 2),
    (v_word, 'What day is your birthday this year?', '你今年生日係星期幾？', 'nei5 gam1 nin2 saang1 jat6 hai6 sing1 kei4 gei2?', 3),
    (v_word, 'Which day do you play football?', '你星期幾踢波？', 'nei5 sing1 kei4 gei2 tek3 bo1?', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '星期幾', 1);

  -- Time word + verb
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'Time word + verb', 'Put the time BEFORE the verb (I tonight go ...).', '(time before verb)', 'In English the time often comes at the end (''I''m going out tonight''). In Cantonese it goes before the verb — at the very start, or straight after the person: 我今晚出去.', v_category, null, 58)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I''m going to see a film tonight.', '我今晚去睇戲。', 'ngo5 gam1 maan5 heoi3 tai2 hei3.', 1),
    (v_word, 'Tomorrow I have to work.', '聽日我要返工。', 'ting1 jat6 ngo5 jiu3 faan1 gung1.', 2),
    (v_word, 'He went to Japan last week.', '佢上個星期去咗日本。', 'keoi5 soeng6 go3 sing1 kei4 heoi3 zo2 jat6 bun2.', 3),
    (v_word, 'I bought a new phone yesterday.', '我尋日買咗部新電話。', 'ngo5 cam4 jat6 maai5 zo2 bou6 san1 din6 waa2.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '今晚', 1),
    (v_word, 'Pattern', '文型', '聽日', 2),
    (v_word, 'Pattern', '文型', '上個星期', 3),
    (v_word, 'Pattern', '文型', '尋日', 4);

  -- Length of time + 之前
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'Length of time + 之前', 'Say how long ago something happened (X ago).', 'zi1 cin4', 'Put 之前 after a length of time to say ''ago''. After an action it means ''before'': 食飯之前 is ''before eating''.', v_category, null, 59)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I ate three hours ago.', '我三個鐘頭之前食咗飯。', 'ngo5 saam1 go3 zung1 tau4 zi1 cin4 sik6 zo2 faan6.', 1),
    (v_word, 'She came back two days ago.', '佢兩日之前返咗嚟。', 'keoi5 loeng5 jat6 zi1 cin4 faan1 zo2 lai4.', 2),
    (v_word, 'We met five years ago.', '我哋五年之前識嘅。', 'ngo5 dei6 ng5 nin4 zi1 cin4 sik1 ge3.', 3),
    (v_word, 'Wash your hands before eating.', '食飯之前要洗手。', 'sik6 faan6 zi1 cin4 jiu3 sai2 sau2.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '之前', 1);

  -- Length of time + 之後
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'Length of time + 之後', 'Say when something will happen (in X time / after X).', 'zi1 hau6', 'After a length of time, 之後 means ''in'' or ''later'': 十分鐘之後 is ''in ten minutes''. After an action it means ''after'': 放工之後 is ''after work''.', v_category, null, 60)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I''ll be there in ten minutes.', '我十分鐘之後到。', 'ngo5 sap6 fan1 zung1 zi1 hau6 dou3.', 1),
    (v_word, 'After work I go to the gym.', '放工之後我去健身。', 'fong3 gung1 zi1 hau6 ngo5 heoi3 gin6 san1.', 2),
    (v_word, 'Two weeks later, he came back.', '兩個星期之後，佢返咗嚟。', 'loeng5 go3 sing1 kei4 zi1 hau6, keoi5 faan1 zo2 lai4.', 3),
    (v_word, 'Call me in an hour.', '一個鐘頭之後打俾我。', 'jat1 go3 zung1 tau4 zi1 hau6 daa2 bei2 ngo5.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '之後', 1);

  -- Verb + 咗 + length of time
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'Verb + 咗 + length of time', 'Say how long you''ve done something (I''ve learnt for X).', 'zo2', 'Put 咗 straight after the verb, then the length of time. The thing you did can come after it: 學咗三個月廣東話.', v_category, null, 61)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I waited for you for half an hour.', '我等咗你半個鐘頭。', 'ngo5 dang2 zo2 nei5 bun3 go3 zung1 tau4.', 1),
    (v_word, 'He has lived in Hong Kong for two years.', '佢喺香港住咗兩年。', 'keoi5 hai2 hoeng1 gong2 zyu6 zo2 loeng5 nin4.', 2),
    (v_word, 'I''ve been learning Cantonese for three months.', '我學咗三個月廣東話。', 'ngo5 hok6 zo2 saam1 go3 jyut6 gwong2 dung1 waa2.', 3),
    (v_word, 'We walked for an hour.', '我哋行咗一個鐘頭。', 'ngo5 dei6 haang4 zo2 jat1 go3 zung1 tau4.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '咗', 1);

  -- 幾耐?
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', '幾耐?', 'Ask how long (how long ...?).', 'gei2 noi6', null, v_category, null, 62)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'How long have you been learning Cantonese?', '你學咗廣東話幾耐？', 'nei5 hok6 zo2 gwong2 dung1 waa2 gei2 noi6?', 1),
    (v_word, 'How long does it take to get to the airport?', '去機場要幾耐？', 'heoi3 gei1 coeng4 jiu3 gei2 noi6?', 2),
    (v_word, 'How long have you been waiting?', '你等咗幾耐呀？', 'nei5 dang2 zo2 gei2 noi6 aa3?', 3),
    (v_word, 'How long are you staying in Hong Kong?', '你喺香港留幾耐？', 'nei5 hai2 hoeng1 gong2 lau4 gei2 noi6?', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '幾耐', 1);

  -- 由 X 到 Y
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', '由 X 到 Y', 'Say from one time to another (from X to Y).', 'jau4 … dou3', '由 marks the start and 到 the end. It works for clock times, days and parts of the day.', v_category, null, 63)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I work from nine to six.', '我由九點到六點返工。', 'ngo5 jau4 gau2 dim2 dou3 luk6 dim2 faan1 gung1.', 1),
    (v_word, 'The shop is open from Monday to Friday.', '間舖頭由星期一到星期五開。', 'gaan1 pou3 tau2 jau4 sing1 kei4 jat1 dou3 sing1 kei4 ng5 hoi1.', 2),
    (v_word, 'I''m busy from morning till night.', '我由朝早到夜晚都好忙。', 'ngo5 jau4 ziu1 zou2 dou3 je6 maan5 dou1 hou2 mong4.', 3),
    (v_word, 'The holiday is from the 1st to the 7th.', '假期由一號到七號。', 'gaa3 kei4 jau4 jat1 hou6 dou3 cat1 hou6.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '由', 1);

  -- … 嘅時候
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', '… 嘅時候', 'Say when something happens (when ...).', 'ge3 si4 hau6', 'Put 嘅時候 at the end of the ''when'' part, then say what happens.', v_category, null, 64)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'When I was little, I lived in England.', '我細個嘅時候住喺英國。', 'ngo5 sai3 go3 ge3 si4 hau6 zyu6 hai2 jing1 gwok3.', 1),
    (v_word, 'Don''t look at your phone while you''re eating.', '食飯嘅時候唔好睇電話。', 'sik6 faan6 ge3 si4 hau6 m4 hou2 tai2 din6 waa2.', 2),
    (v_word, 'When I''m on holiday, I like going hiking.', '我放假嘅時候鍾意去行山。', 'ngo5 fong3 gaa3 ge3 si4 hau6 zung1 ji3 heoi3 haang4 saan1.', 3),
    (v_word, 'It was raining when I got home.', '我返到屋企嘅時候落緊雨。', 'ngo5 faan1 dou3 uk1 kei2 ge3 si4 hau6 lok6 gan2 jyu5.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '嘅時候', 1);

end;
$$;
