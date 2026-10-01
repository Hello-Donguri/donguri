-- Cantonese for English speakers: "More Sports" deck — 41 words and
-- 4 grammar points, with Jyutping and example sentences. Generated
-- content, kept here so it can be re-applied to another database (e.g.
-- production). Idempotent: does nothing if the course already has a deck
-- with this title. Run in the Supabase SQL editor, like schema.sql.

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
  if exists (select 1 from public.language_decks where course_id = v_course and title = 'More Sports') then
    raise notice 'More Sports deck already exists — skipping';
    return;
  end if;

  select id into v_category from public.word_categories where name = 'Sports & Exercise';

  insert into public.language_decks (course_id, title, subheading, position)
  values (
    v_course,
    'More Sports',
    'Sports, the verbs that go with them, and talking about matches',
    (select coalesce(max(position), 0) + 1 from public.language_decks where course_id = v_course)
  )
  returning id into v_deck;

  -- 單車
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '單車', 'cycling / bicycle', 'daan1 ce1', 'You ''step on'' a bike in Cantonese: 踩單車 (caai2 daan1 ce1) means to ride a bike.', v_category, 'noun', 1)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I cycle to work every day.', '我每日踩單車返工。', 'ngo5 mui5 jat6 caai2 daan1 ce1 faan1 gung1.', 1),
    (v_word, 'Let''s go cycling at the weekend.', '週末一齊去踩單車啦。', 'zau1 mut6 jat1 cai4 heoi3 caai2 daan1 ce1 laa1.', 2),
    (v_word, 'He wants to be a cyclist.', '佢想做單車手。', 'keoi5 soeng2 zou6 daan1 ce1 sau2.', 3),
    (v_word, 'I bought a new bike.', '我買咗架新單車。', 'ngo5 maai5 zo2 gaa3 san1 daan1 ce1.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '踩單車', 1),
    (v_word, 'Player', '選手', '單車手', 2);

  -- 行山
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '行山', 'hiking', 'haang4 saan1', 'Literally ''walk the mountain''. Hiking is hugely popular in Hong Kong.', v_category, 'verb', 2)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I go hiking every Sunday.', '我每個星期日去行山。', 'ngo5 mui5 go3 sing1 kei4 jat6 heoi3 haang4 saan1.', 1),
    (v_word, 'This hiking trail is very beautiful.', '呢條行山徑好靚。', 'ni1 tiu4 haang4 saan1 ging3 hou2 leng3.', 2),
    (v_word, 'Hiking is really tiring but fun.', '行山好攰，但係好好玩。', 'haang4 saan1 hou2 gui6, daan6 hai6 hou2 hou2 waan2.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Go', '行く', '去行山', 1),
    (v_word, 'Place', '場所', '行山徑', 2);

  -- 瑜伽
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '瑜伽', 'yoga', 'jyu4 gaa1', null, v_category, 'noun', 3)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I do yoga in the morning.', '我朝早做瑜伽。', 'ngo5 ziu1 zou2 zou6 jyu4 gaa1.', 1),
    (v_word, 'She goes to a yoga class every week.', '佢每個星期都去上瑜伽堂。', 'keoi5 mui5 go3 sing1 kei4 dou1 heoi3 soeng5 jyu4 gaa1 tong4.', 2),
    (v_word, 'Yoga is very relaxing.', '瑜伽好放鬆。', 'jyu4 gaa1 hou2 fong3 sung1.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Do', 'する', '做瑜伽', 1),
    (v_word, 'Learn', '習う', '瑜伽堂', 2);

  -- 健身
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '健身', 'working out (at the gym)', 'gin6 san1', null, v_category, 'verb', 4)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I go to the gym after work.', '我放工之後去健身。', 'ngo5 fong3 gung1 zi1 hau6 heoi3 gin6 san1.', 1),
    (v_word, 'The gym is very big.', '間健身室好大。', 'gaan1 gin6 san1 sat1 hou2 daai6.', 2),
    (v_word, 'How often do you work out?', '你幾耐去一次健身？', 'nei5 gei2 noi6 heoi3 jat1 ci3 gin6 san1?', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Go', '行く', '去健身', 1),
    (v_word, 'Place', '場所', '健身室', 2);

  -- 拳擊
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '拳擊', 'boxing', 'kyun4 gik1', null, v_category, 'noun', 5)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I like watching boxing.', '我鍾意睇拳擊。', 'ngo5 zung1 ji3 tai2 kyun4 gik1.', 1),
    (v_word, 'He''s a boxer.', '佢係拳擊手。', 'keoi5 hai6 kyun4 gik1 sau2.', 2),
    (v_word, 'Boxing is really tiring.', '拳擊好攰。', 'kyun4 gik1 hou2 gui6.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Player', '選手', '拳擊手', 1),
    (v_word, 'Watch', '見る', '睇拳擊', 2);

  -- 衝浪
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '衝浪', 'surfing', 'cung1 long6', null, v_category, 'verb', 6)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Let''s go surfing in the summer.', '我哋夏天去衝浪啦。', 'ngo5 dei6 haa6 tin1 heoi3 cung1 long6 laa1.', 1),
    (v_word, 'My surfboard is blue.', '我塊衝浪板係藍色嘅。', 'ngo5 faai3 cung1 long6 baan2 hai6 laam4 sik1 ge3.', 2),
    (v_word, 'Surfing is really hard.', '衝浪好難。', 'cung1 long6 hou2 naan4.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Go', '行く', '去衝浪', 1),
    (v_word, 'Equipment', '道具', '衝浪板', 2);

  -- 潛水
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '潛水', 'scuba diving', 'cim4 seoi2', null, v_category, 'verb', 7)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'We''re going diving tomorrow.', '我哋聽日去潛水。', 'ngo5 dei6 ting1 jat6 heoi3 cim4 seoi2.', 1),
    (v_word, 'You can see lots of fish when diving.', '潛水可以見到好多魚。', 'cim4 seoi2 ho2 ji5 gin3 dou2 hou2 do1 jyu2.', 2),
    (v_word, 'My brother is a diver.', '我細佬係潛水員。', 'ngo5 sai3 lou2 hai6 cim4 seoi2 jyun4.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Go', '行く', '去潛水', 1),
    (v_word, 'Player', '選手', '潛水員', 2);

  -- 划艇
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '划艇', 'rowing / kayaking', 'waa4 teng5', null, v_category, 'verb', 8)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Let''s go kayaking at the weekend.', '我哋週末去划艇啦。', 'ngo5 dei6 zau1 mut6 heoi3 waa4 teng5 laa1.', 1),
    (v_word, 'Kayaking is great fun.', '划艇好好玩。', 'waa4 teng5 hou2 hou2 waan2.', 2),
    (v_word, 'Have you ever been rowing?', '你有冇試過划艇？', 'nei5 jau5 mou5 si3 gwo3 waa4 teng5?', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Go', '行く', '去划艇', 1);

  -- 攀石
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '攀石', 'rock climbing', 'paan1 sek6', null, v_category, 'verb', 9)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I go rock climbing on Thursdays.', '我星期四去攀石。', 'ngo5 sing1 kei4 sei3 heoi3 paan1 sek6.', 1),
    (v_word, 'There''s a climbing gym near my home.', '我屋企附近有個攀石場。', 'ngo5 uk1 kei2 fu6 gan6 jau5 go3 paan1 sek6 coeng4.', 2),
    (v_word, 'Rock climbing is a bit scary.', '攀石有啲驚。', 'paan1 sek6 jau5 di1 geng1.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Go', '行く', '去攀石', 1),
    (v_word, 'Place', '場所', '攀石場', 2);

  -- 欖球
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '欖球', 'rugby', 'laam5 kau4', 'Named after its olive (欖) shape.', v_category, 'noun', 10)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I played rugby at school.', '我讀書嗰陣打欖球。', 'ngo5 duk6 syu1 go2 zan6 daa2 laam5 kau4.', 1),
    (v_word, 'He''s a rugby player.', '佢係欖球員。', 'keoi5 hai6 laam5 kau4 jyun4.', 2),
    (v_word, 'Do you like watching rugby?', '你鍾唔鍾意睇欖球？', 'nei5 zung1 m4 zung1 ji3 tai2 laam5 kau4?', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '打欖球', 1),
    (v_word, 'Player', '選手', '欖球員', 2);

  -- 曲棍球
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '曲棍球', 'hockey', 'kuk1 gwan3 kau4', null, v_category, 'noun', 11)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'My sister plays hockey.', '我家姐打曲棍球。', 'ngo5 gaa1 ze1 daa2 kuk1 gwan3 kau4.', 1),
    (v_word, 'Hockey is very fast.', '曲棍球好快。', 'kuk1 gwan3 kau4 hou2 faai3.', 2),
    (v_word, 'Is there a hockey match today?', '今日有冇曲棍球比賽？', 'gam1 jat6 jau5 mou5 kuk1 gwan3 kau4 bei2 coi3?', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '打曲棍球', 1);

  -- 板球
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '板球', 'cricket', 'baan2 kau4', null, v_category, 'noun', 12)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'People play cricket in England.', '英國人打板球。', 'jing1 gwok3 jan4 daa2 baan2 kau4.', 1),
    (v_word, 'I don''t understand cricket.', '我唔明板球。', 'ngo5 m4 ming4 baan2 kau4.', 2),
    (v_word, 'A cricket match is very long.', '板球比賽好長。', 'baan2 kau4 bei2 coi3 hou2 coeng4.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '打板球', 1);

  -- 保齡球
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '保齡球', 'bowling', 'bou2 ling4 kau4', null, v_category, 'noun', 13)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Let''s go bowling tonight.', '今晚去打保齡球啦。', 'gam1 maan5 heoi3 daa2 bou2 ling4 kau4 laa1.', 1),
    (v_word, 'I''m not good at bowling.', '我唔係好識打保齡球。', 'ngo5 m4 hai6 hou2 sik1 daa2 bou2 ling4 kau4.', 2),
    (v_word, 'Bowling is fun with friends.', '同朋友打保齡球好開心。', 'tung4 pang4 jau5 daa2 bou2 ling4 kau4 hou2 hoi1 sam1.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '打保齡球', 1);

  -- 桌球
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '桌球', 'snooker / pool', 'coek3 kau4', null, v_category, 'noun', 14)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'He plays snooker really well.', '佢打桌球打得好好。', 'keoi5 daa2 coek3 kau4 daa2 dak1 hou2 hou2.', 1),
    (v_word, 'There''s a pool table in the bar.', '間酒吧有張桌球枱。', 'gaan1 zau2 baa1 jau5 zoeng1 coek3 kau4 toi2.', 2),
    (v_word, 'Shall we play pool?', '我哋打唔打桌球？', 'ngo5 dei6 daa2 m4 daa2 coek3 kau4?', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '打桌球', 1);

  -- 壁球
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '壁球', 'squash', 'bik1 kau4', null, v_category, 'noun', 15)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I play squash with my colleague.', '我同同事打壁球。', 'ngo5 tung4 tung4 si6 daa2 bik1 kau4.', 1),
    (v_word, 'Squash makes you sweat a lot.', '打壁球好出汗。', 'daa2 bik1 kau4 hou2 ceot1 hon6.', 2),
    (v_word, 'Is the squash court free?', '個壁球場得唔得閒？', 'go3 bik1 kau4 coeng4 dak1 m4 dak1 haan4?', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '打壁球', 1);

  -- 冰球
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '冰球', 'ice hockey', 'bing1 kau4', null, v_category, 'noun', 16)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'People in Canada love ice hockey.', '加拿大人好鍾意冰球。', 'gaa1 naa4 daai6 jan4 hou2 zung1 ji3 bing1 kau4.', 1),
    (v_word, 'My son plays ice hockey.', '我個仔打冰球。', 'ngo5 go3 zai2 daa2 bing1 kau4.', 2),
    (v_word, 'Ice hockey looks dangerous.', '冰球睇落好危險。', 'bing1 kau4 tai2 lok6 hou2 ngai4 him2.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '打冰球', 1);

  -- 劍擊
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '劍擊', 'fencing', 'gim3 gik1', null, v_category, 'noun', 17)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I want to learn fencing.', '我想學劍擊。', 'ngo5 soeng2 hok6 gim3 gik1.', 1),
    (v_word, 'Hong Kong is very good at fencing.', '香港嘅劍擊好勁。', 'hoeng1 gong2 ge3 gim3 gik1 hou2 ging6.', 2),
    (v_word, 'Fencing needs a lot of practice.', '劍擊要好多練習。', 'gim3 gik1 jiu3 hou2 do1 lin6 zaap6.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Learn', '習う', '學劍擊', 1);

  -- 空手道
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '空手道', 'karate', 'hung1 sau2 dou6', null, v_category, 'noun', 18)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'My daughter is learning karate.', '我個女學緊空手道。', 'ngo5 go3 neoi2 hok6 gan2 hung1 sau2 dou6.', 1),
    (v_word, 'Karate comes from Japan.', '空手道係日本嘅。', 'hung1 sau2 dou6 hai6 jat6 bun2 ge3.', 2),
    (v_word, 'I want to learn karate too.', '我都想學空手道。', 'ngo5 dou1 soeng2 hok6 hung1 sau2 dou6.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Learn', '習う', '學空手道', 1);

  -- 功夫
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '功夫', 'kung fu', 'gung1 fu1', null, v_category, 'noun', 19)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Can you do kung fu?', '你識唔識打功夫？', 'nei5 sik1 m4 sik1 daa2 gung1 fu1?', 1),
    (v_word, 'My kung fu teacher is very strict.', '我個功夫師傅好嚴。', 'ngo5 go3 gung1 fu1 si1 fu2 hou2 jim4.', 2),
    (v_word, 'I love kung fu films.', '我好鍾意功夫戲。', 'ngo5 hou2 zung1 ji3 gung1 fu1 hei3.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '打功夫', 1),
    (v_word, 'Player', '選手', '功夫師傅', 2);

  -- 太極
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '太極', 'tai chi', 'taai3 gik6', null, v_category, 'noun', 20)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Older people do tai chi in the park.', '老人家喺公園打太極。', 'lou5 jan4 gaa1 hai2 gung1 jyun2 daa2 taai3 gik6.', 1),
    (v_word, 'My grandad does tai chi every morning.', '我爺爺每日朝早打太極。', 'ngo5 je4 je2 mui5 jat6 ziu1 zou2 daa2 taai3 gik6.', 2),
    (v_word, 'Tai chi is very slow.', '太極好慢。', 'taai3 gik6 hou2 maan6.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '打太極', 1);

  -- 體操
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '體操', 'gymnastics', 'tai2 cou1', null, v_category, 'noun', 21)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'She often did gymnastics when she was little.', '佢細個成日做體操。', 'keoi5 sai3 go3 seng4 jat6 zou6 tai2 cou1.', 1),
    (v_word, 'Gymnastics is really hard.', '體操好難。', 'tai2 cou1 hou2 naan4.', 2),
    (v_word, 'I like watching gymnastics at the Olympics.', '我鍾意睇奧運嘅體操。', 'ngo5 zung1 ji3 tai2 ou3 wan6 ge3 tai2 cou1.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Do', 'する', '做體操', 1);

  -- 馬拉松
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '馬拉松', 'marathon', 'maa5 laai1 cung4', null, v_category, 'noun', 22)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I want to run a marathon.', '我想跑馬拉松。', 'ngo5 soeng2 paau2 maa5 laai1 cung4.', 1),
    (v_word, 'A marathon is very long.', '馬拉松好長。', 'maa5 laai1 cung4 hou2 coeng4.', 2),
    (v_word, 'He ran the Hong Kong Marathon last year.', '佢舊年跑咗香港馬拉松。', 'keoi5 gau6 nin2 paau2 zo2 hoeng1 gong2 maa5 laai1 cung4.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '跑馬拉松', 1);

  -- 賽馬
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '賽馬', 'horse racing', 'coi3 maa5', 'Horse racing is a big part of Hong Kong life — races are at Happy Valley and Sha Tin.', v_category, 'noun', 23)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Let''s go and watch the horse racing on Wednesday night.', '星期三夜晚去睇賽馬啦。', 'sing1 kei4 saam1 je6 maan5 heoi3 tai2 coi3 maa5 laa1.', 1),
    (v_word, 'Lots of people in Hong Kong like horse racing.', '好多香港人鍾意賽馬。', 'hou2 do1 hoeng1 gong2 jan4 zung1 ji3 coi3 maa5.', 2),
    (v_word, 'Is there horse racing today?', '今日有冇賽馬？', 'gam1 jat6 jau5 mou5 coi3 maa5?', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Watch', '見る', '睇賽馬', 1);

  -- 騎馬
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '騎馬', 'horse riding', 'ke4 maa5', null, v_category, 'verb', 24)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Have you ever tried horse riding?', '你有冇試過騎馬？', 'nei5 jau5 mou5 si3 gwo3 ke4 maa5?', 1),
    (v_word, 'I want to go horse riding.', '我想去騎馬。', 'ngo5 soeng2 heoi3 ke4 maa5.', 2),
    (v_word, 'Horse riding isn''t as easy as it looks.', '騎馬冇睇落咁容易。', 'ke4 maa5 mou5 tai2 lok6 gam3 jung4 ji6.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Go', '行く', '去騎馬', 1);

  -- 跳繩
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '跳繩', 'skipping (rope)', 'tiu3 sing2', null, v_category, 'verb', 25)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Children like skipping.', '細路仔鍾意跳繩。', 'sai3 lou6 zai2 zung1 ji3 tiu3 sing2.', 1),
    (v_word, 'I skip for ten minutes every day.', '我每日跳繩十分鐘。', 'ngo5 mui5 jat6 tiu3 sing2 sap6 fan1 zung1.', 2),
    (v_word, 'Where''s my skipping rope?', '我條跳繩去咗邊？', 'ngo5 tiu4 tiu3 sing2 heoi3 zo2 bin1?', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Equipment', '道具', '條跳繩', 1);

  -- 龍舟
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '龍舟', 'dragon boat', 'lung4 zau1', 'You ''paddle'' a dragon boat: 扒龍舟 (paa4 lung4 zau1). Races are held at the Dragon Boat Festival, 端午節.', v_category, 'noun', 26)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'We paddle dragon boats every summer.', '我哋每年夏天扒龍舟。', 'ngo5 dei6 mui5 nin4 haa6 tin1 paa4 lung4 zau1.', 1),
    (v_word, 'Let''s go and watch the dragon boat race.', '去睇龍舟比賽啦。', 'heoi3 tai2 lung4 zau1 bei2 coi3 laa1.', 2),
    (v_word, 'Dragon boats are really long.', '龍舟好長。', 'lung4 zau1 hou2 coeng4.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '扒龍舟', 1),
    (v_word, 'Competition', '試合', '龍舟比賽', 2);

  -- 滑板
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '滑板', 'skateboarding / skateboard', 'waat6 baan2', null, v_category, 'noun', 27)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'He skateboards in the park.', '佢喺公園玩滑板。', 'keoi5 hai2 gung1 jyun2 waan2 waat6 baan2.', 1),
    (v_word, 'My skateboard is broken.', '我塊滑板壞咗。', 'ngo5 faai3 waat6 baan2 waai6 zo2.', 2),
    (v_word, 'Skateboarding is in the Olympics now.', '滑板而家係奧運項目。', 'waat6 baan2 ji4 gaa1 hai6 ou3 wan6 hong6 muk6.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Play', 'する', '玩滑板', 1);

  -- 跳水
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '跳水', 'diving (into water)', 'tiu3 seoi2', null, v_category, 'verb', 28)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'China is very good at diving.', '中國跳水好勁。', 'zung1 gwok3 tiu3 seoi2 hou2 ging6.', 1),
    (v_word, 'She''s a diver.', '佢係跳水運動員。', 'keoi5 hai6 tiu3 seoi2 wan6 dung6 jyun4.', 2),
    (v_word, 'I''m scared of diving.', '我驚跳水。', 'ngo5 geng1 tiu3 seoi2.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Player', '選手', '跳水運動員', 1);

  -- 射箭
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '射箭', 'archery', 'se6 zin3', null, v_category, 'verb', 29)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I want to learn archery.', '我想學射箭。', 'ngo5 soeng2 hok6 se6 zin3.', 1),
    (v_word, 'Archery needs a lot of focus.', '射箭要好專心。', 'se6 zin3 jiu3 hou2 zyun1 sam1.', 2),
    (v_word, 'Have you ever tried archery?', '你有冇試過射箭？', 'nei5 jau5 mou5 si3 gwo3 se6 zin3?', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Learn', '習う', '學射箭', 1);

  -- 運動
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '運動', 'exercise / sport', 'wan6 dung6', null, v_category, 'noun', 30)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I exercise every day.', '我每日做運動。', 'ngo5 mui5 jat6 zou6 wan6 dung6.', 1),
    (v_word, 'What sports do you like?', '你鍾意咩運動？', 'nei5 zung1 ji3 me1 wan6 dung6?', 2),
    (v_word, 'He''s a professional athlete.', '佢係職業運動員。', 'keoi5 hai6 zik1 jip6 wan6 dung6 jyun4.', 3),
    (v_word, 'I bought a new pair of trainers.', '我買咗對新運動鞋。', 'ngo5 maai5 zo2 deoi3 san1 wan6 dung6 haai4.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Do', 'する', '做運動', 1),
    (v_word, 'Player', '選手', '運動員', 2),
    (v_word, 'Equipment', '道具', '運動鞋', 3);

  -- 比賽
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '比賽', 'match / competition', 'bei2 coi3', null, v_category, 'noun', 31)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Did you watch the match last night?', '你尋晚有冇睇比賽？', 'nei5 cam4 maan5 jau5 mou5 tai2 bei2 coi3?', 1),
    (v_word, 'I''m taking part in a competition next week.', '我下個星期參加比賽。', 'ngo5 haa6 go3 sing1 kei4 caam1 gaa1 bei2 coi3.', 2),
    (v_word, 'The match starts at eight.', '場比賽八點開始。', 'coeng4 bei2 coi3 baat3 dim2 hoi1 ci2.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Watch', '見る', '睇比賽', 1),
    (v_word, 'Take part', '参加する', '參加比賽', 2);

  -- 贏
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '贏', 'to win', 'jeng4', null, v_category, 'verb', 32)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'We won!', '我哋贏咗！', 'ngo5 dei6 jeng4 zo2!', 1),
    (v_word, 'Which team won?', '邊隊贏咗？', 'bin1 deoi6 jeng4 zo2?', 2),
    (v_word, 'I hope we win tomorrow.', '希望我哋聽日贏。', 'hei1 mong6 ngo5 dei6 ting1 jat6 jeng4.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Won', '勝った', '贏咗', 1);

  -- 輸
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '輸', 'to lose', 'syu1', null, v_category, 'verb', 33)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'We lost again.', '我哋又輸咗。', 'ngo5 dei6 jau6 syu1 zo2.', 1),
    (v_word, 'Don''t be sad about losing.', '輸咗唔好唔開心。', 'syu1 zo2 m4 hou2 m4 hoi1 sam1.', 2),
    (v_word, 'They lost two–one.', '佢哋二比一輸咗。', 'keoi5 dei6 ji6 bei2 jat1 syu1 zo2.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Lost', '負けた', '輸咗', 1);

  -- 球隊
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '球隊', 'team', 'kau4 deoi2', null, v_category, 'noun', 34)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Which team do you support?', '你支持邊支球隊？', 'nei5 zi1 ci4 bin1 zi1 kau4 deoi2?', 1),
    (v_word, 'Our team is really strong.', '我哋球隊好強。', 'ngo5 dei6 kau4 deoi2 hou2 koeng4.', 2),
    (v_word, 'I want to join the school team.', '我想加入學校球隊。', 'ngo5 soeng2 gaa1 jap6 hok6 haau6 kau4 deoi2.', 3);

  -- 教練
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '教練', 'coach', 'gaau3 lin6', null, v_category, 'noun', 35)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Our coach is really strict.', '我哋教練好嚴。', 'ngo5 dei6 gaau3 lin6 hou2 jim4.', 1),
    (v_word, 'He''s a swimming coach.', '佢係游水教練。', 'keoi5 hai6 jau4 seoi2 gaau3 lin6.', 2),
    (v_word, 'The coach says we need more practice.', '教練話我哋要多啲練習。', 'gaau3 lin6 waa6 ngo5 dei6 jiu3 do1 di1 lin6 zaap6.', 3);

  -- 入波
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '入波', 'to score a goal', 'jap6 bo1', null, v_category, 'verb', 36)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'He''s great at scoring goals.', '佢好叻入波。', 'keoi5 hou2 lek1 jap6 bo1.', 1),
    (v_word, 'Who scored?', '邊個入波？', 'bin1 go3 jap6 bo1?', 2),
    (v_word, 'Nobody scored in the first half.', '上半場冇人入波。', 'soeng6 bun3 coeng4 mou5 jan4 jap6 bo1.', 3);

  -- 球場
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '球場', 'pitch / court', 'kau4 coeng4', null, v_category, 'noun', 37)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'There''s a football pitch near my home.', '我屋企附近有個球場。', 'ngo5 uk1 kei2 fu6 gan6 jau5 go3 kau4 coeng4.', 1),
    (v_word, 'The basketball court is full.', '籃球場好多人。', 'laam4 kau4 coeng4 hou2 do1 jan4.', 2),
    (v_word, 'Let''s meet at the pitch.', '我哋喺球場等。', 'ngo5 dei6 hai2 kau4 coeng4 dang2.', 3);

  -- 泳池
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '泳池', 'swimming pool', 'wing6 ci4', null, v_category, 'noun', 38)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I swim at the swimming pool every week.', '我每個星期去泳池游水。', 'ngo5 mui5 go3 sing1 kei4 heoi3 wing6 ci4 jau4 seoi2.', 1),
    (v_word, 'The pool is closed today.', '個泳池今日唔開。', 'go3 wing6 ci4 gam1 jat6 m4 hoi1.', 2),
    (v_word, 'The water in the pool is cold.', '泳池啲水好凍。', 'wing6 ci4 di1 seoi2 hou2 dung3.', 3);

  -- 奧運
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '奧運', 'the Olympics', 'ou3 wan6', null, v_category, 'noun', 39)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Did you watch the Olympics?', '你有冇睇奧運？', 'nei5 jau5 mou5 tai2 ou3 wan6?', 1),
    (v_word, 'He went to the Olympics.', '佢參加過奧運。', 'keoi5 caam1 gaa1 gwo3 ou3 wan6.', 2),
    (v_word, 'The Olympics are every four years.', '奧運四年一次。', 'ou3 wan6 sei3 nin4 jat1 ci3.', 3);

  -- 練習
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '練習', 'to practise / practice', 'lin6 zaap6', null, v_category, 'verb', 40)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I practise every day.', '我每日都練習。', 'ngo5 mui5 jat6 dou1 lin6 zaap6.', 1),
    (v_word, 'We have practice tonight.', '我哋今晚要練習。', 'ngo5 dei6 gam1 maan5 jiu3 lin6 zaap6.', 2),
    (v_word, 'Practice makes you better.', '多啲練習就會進步。', 'do1 di1 lin6 zaap6 zau6 wui5 zeon3 bou6.', 3);

  -- 熱身
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', '熱身', 'to warm up', 'jit6 san1', null, v_category, 'verb', 41)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'Warm up before you run.', '跑步之前要熱身。', 'paau2 bou6 zi1 cin4 jiu3 jit6 san1.', 1),
    (v_word, 'Let''s warm up first.', '我哋先熱身。', 'ngo5 dei6 sin1 jit6 san1.', 2),
    (v_word, 'I forgot to warm up.', '我唔記得熱身。', 'ngo5 m4 gei3 dak1 jit6 san1.', 3);

  -- 打 + ball sport
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', '打 + ball sport', 'Say you play a sport where you hit or throw the ball.', 'daa2', 'Most ball games use 打 (hit): 打籃球, 打網球, 打羽毛球. Football is the odd one out — you kick it: 踢波.', v_category, null, 42)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I play basketball on Saturdays.', '我星期六打籃球。', 'ngo5 sing1 kei4 luk6 daa2 laam4 kau4.', 1),
    (v_word, 'Do you play tennis?', '你打唔打網球？', 'nei5 daa2 m4 daa2 mong5 kau4?', 2),
    (v_word, 'Let''s play badminton.', '我哋去打羽毛球啦。', 'ngo5 dei6 heoi3 daa2 jyu5 mou4 kau4 laa1.', 3),
    (v_word, 'He plays rugby at university.', '佢喺大學打欖球。', 'keoi5 hai2 daai6 hok6 daa2 laam5 kau4.', 4);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '打', 1);

  -- 踢波
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', '踢波', 'Say you play football (kick the ball).', 'tek3 bo1', '波 is a ball, so 踢波 is literally ''kick ball'' — the everyday way to say playing football. 踢足球 also works.', v_category, null, 43)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I play football with my friends.', '我同朋友踢波。', 'ngo5 tung4 pang4 jau5 tek3 bo1.', 1),
    (v_word, 'Do you want to play football?', '你想唔想踢波？', 'nei5 soeng2 m4 soeng2 tek3 bo1?', 2),
    (v_word, 'He plays football every day after school.', '佢每日放學都踢波。', 'keoi5 mui5 jat6 fong3 hok6 dou1 tek3 bo1.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '踢波', 1);

  -- 識 + sport
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', '識 + sport', 'Say you can (know how to) do a sport.', 'sik1', '識 means ''know how to''. 識唔識…? asks ''can you …?''.', v_category, null, 44)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'I can swim.', '我識游水。', 'ngo5 sik1 jau4 seoi2.', 1),
    (v_word, 'Can you ski?', '你識唔識滑雪？', 'nei5 sik1 m4 sik1 waat6 syut3?', 2),
    (v_word, 'I can''t ride a bike.', '我唔識踩單車。', 'ngo5 m4 sik1 caai2 daan1 ce1.', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '識', 1);

  -- Verb + 得 + 好 + adjective
  insert into public.words (language_deck_id, path, term, translation, romanization, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'Verb + 得 + 好 + adjective', 'Say how well someone does something (he swims really fast).', 'dak1', 'Put 得 after the verb, then describe how it''s done. With a sport, repeat the verb: 佢游水游得好快.', v_category, null, 45)
  returning id into v_word;
  insert into public.word_examples (word_id, en, ja, romanization, position) values
    (v_word, 'He swims really fast.', '佢游水游得好快。', 'keoi5 jau4 seoi2 jau4 dak1 hou2 faai3.', 1),
    (v_word, 'She plays tennis really well.', '佢打網球打得好好。', 'keoi5 daa2 mong5 kau4 daa2 dak1 hou2 hou2.', 2),
    (v_word, 'You run really fast!', '你跑得好快呀！', 'nei5 paau2 dak1 hou2 faai3 aa3!', 3);
  insert into public.word_forms (word_id, label_en, label_ja, value, position) values
    (v_word, 'Pattern', '文型', '得好', 1);

end;
$$;
