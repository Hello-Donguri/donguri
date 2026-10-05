-- French for English speakers: "General" deck — 33 words and 7
-- grammar points on plants & gardening, birds and sport, pitched at
-- intermediate–advanced (B2–C1) learners. Generated content, kept here so it
-- can be re-applied to another database (e.g. production). The French is
-- in the `ja` column of word_examples (the target-language side, as for
-- Cantonese) and English in `en`; both highlights are set, since the
-- automatic highlighting only knows English and Japanese. Idempotent: does
-- nothing if the course already has a deck with this title. Needs the
-- fr-for-en course (section 51 of schema.sql). Run in the Supabase SQL
-- editor, like schema.sql.

insert into public.word_categories (name, color, position) values
  ('Plants & Gardening', '#4d7c0f', (select coalesce(max(position), 0) + 1 from public.word_categories)),
  ('Birds', '#0369a1', (select coalesce(max(position), 0) + 2 from public.word_categories))
on conflict (name) do nothing;

do $$
declare
  v_course uuid;
  v_deck uuid;
  v_word uuid;
  v_form1 uuid;
  v_form2 uuid;
  v_form3 uuid;
begin
  select id into v_course from public.courses where slug = 'fr-for-en';
  if v_course is null then
    raise notice 'fr-for-en course not found — skipping';
    return;
  end if;
  if exists (select 1 from public.language_decks where course_id = v_course and title = 'General') then
    raise notice 'General deck already exists — skipping';
    return;
  end if;

  insert into public.language_decks (course_id, title, subheading, tags, position)
  values (
    v_course,
    'General',
    'Plants & gardening, birds and sport',
    '{"CEFR B2–C1"}',
    (select coalesce(max(position), 0) + 1 from public.language_decks where course_id = v_course)
  )
  returning id into v_deck;


  -- tailler
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'tailler', 'to prune / to trim', 'Used for plants, hedges and trees — and for a beard or a pencil (tailler un crayon, to sharpen a pencil). Une taille is a pruning.', (select id from public.word_categories where name = 'Plants & Gardening'), 'verb', 1)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'tailler', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Past participle', '過去分詞', 'taillé', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'You need to prune the roses at the end of winter.', 'Il faut tailler les rosiers à la fin de l''hiver.', 'prune', 'tailler', 1),
    (v_word, v_form2, 'I trimmed the hedge this morning — it had got huge.', 'J''ai taillé la haie ce matin, elle était devenue énorme.', 'trimmed', 'taillé', 2),
    (v_word, null, 'Don''t prune the lavender too short.', 'Ne taille pas la lavande trop court.', 'prune', 'taille', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'prune', 1),
    (v_word, 'trim', 2);

  -- désherber
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'désherber', 'to weed', 'Built from herbe (grass, weed) with dé- for removing it. The weedkiller is le désherbant.', (select id from public.word_categories where name = 'Plants & Gardening'), 'verb', 2)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'désherber', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Past participle', '過去分詞', 'désherbé', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'I spend my Sundays weeding the vegetable patch.', 'Je passe mes dimanches à désherber le potager.', 'weeding', 'désherber', 1),
    (v_word, v_form2, 'We haven''t weeded for a month and it shows.', 'On n''a pas désherbé depuis un mois et ça se voit.', 'weeded', 'désherbé', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'weed', 1);

  -- potager
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'potager', 'vegetable garden / vegetable patch', 'Masculine: un potager. As an adjective it means ''for eating'' — les plantes potagères are vegetable plants.', (select id from public.word_categories where name = 'Plants & Gardening'), 'noun', 3)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'potager', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'potagers', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'My grandparents had a huge vegetable garden behind the house.', 'Mes grands-parents avaient un immense potager derrière la maison.', 'vegetable garden', 'potager', 1),
    (v_word, v_form2, 'Shared vegetable gardens are springing up all over the city.', 'Les potagers partagés se multiplient en ville.', 'vegetable gardens', 'potagers', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'le potager', 1),
    (v_word, 'un potager', 2);

  -- semer
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'semer', 'to sow', 'Like acheter, it takes a grave accent when the ending is silent: je sème, ils sèment — but nous semons. Figuratively, semer la panique is to spread panic, and semer quelqu''un is to shake someone off.', (select id from public.word_categories where name = 'Plants & Gardening'), 'verb', 4)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'semer', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Past participle', '過去分詞', 'semé', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'You can sow radishes as early as March.', 'On peut semer les radis dès le mois de mars.', 'sow', 'semer', 1),
    (v_word, v_form2, 'She sowed sunflowers along the fence.', 'Elle a semé des tournesols le long de la clôture.', 'sowed', 'semé', 2),
    (v_word, null, 'I always sow my lettuce in rows.', 'Je sème toujours ma laitue en rangs.', 'sow', 'sème', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'sow', 1);

  -- arrosoir
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'arrosoir', 'watering can', 'Masculine: un arrosoir. From arroser (to water) — and un arroseur is a sprinkler.', (select id from public.word_categories where name = 'Plants & Gardening'), 'noun', 5)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'arrosoir', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'arrosoirs', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'Fill the watering can before the sun gets too strong.', 'Remplis l''arrosoir avant que le soleil soit trop fort.', 'watering can', 'arrosoir', 1),
    (v_word, v_form2, 'We keep the watering cans in the shed at the bottom of the garden.', 'On range les arrosoirs dans la cabane au fond du jardin.', 'watering cans', 'arrosoirs', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'l''arrosoir', 1),
    (v_word, 'un arrosoir', 2);

  -- il faut que + subjonctif
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'il faut que + subjonctif', 'Say what has to be done — someone must / needs to …', 'Il faut que is always followed by the subjunctive, even where English uses an ordinary verb: il faut que tu arroses, que nous partions, qu''il fasse. Il faudrait que is the softer ''someone ought to''. Before a vowel, que becomes qu'' (il faut qu''on parte).', null, null, 6)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Subjunctive (tu arroser)', '接続法 (tu arroser)', 'arroses', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Subjunctive (nous partir)', '接続法 (nous partir)', 'partions', 2)
  returning id into v_form2;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Subjunctive (il faire)', '接続法 (il faire)', 'fasse', 3)
  returning id into v_form3;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'You need to water the tomatoes tonight.', 'Il faut que tu arroses les tomates ce soir.', 'need to water', 'Il faut que tu arroses', 1),
    (v_word, v_form2, 'We have to leave early to see the birds at dawn.', 'Il faut que nous partions tôt pour voir les oiseaux à l''aube.', 'have to leave', 'Il faut que nous partions', 2),
    (v_word, v_form3, 'The team really ought to make more of an effort in defence.', 'Il faudrait que l''équipe fasse plus d''efforts en défense.', 'ought to make', 'Il faudrait que l''équipe fasse', 3);

  -- mauvaise herbe
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'mauvaise herbe', 'weed', 'Feminine: une mauvaise herbe — literally ''bad grass''. Both words take the plural: des mauvaises herbes.', (select id from public.word_categories where name = 'Plants & Gardening'), 'noun', 7)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'mauvaise herbe', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'mauvaises herbes', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'This weed grows back as soon as you pull it up.', 'Cette mauvaise herbe repousse dès qu''on l''arrache.', 'weed', 'mauvaise herbe', 1),
    (v_word, v_form2, 'Weeds have taken over the whole lawn.', 'Les mauvaises herbes ont envahi toute la pelouse.', 'Weeds', 'mauvaises herbes', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'la mauvaise herbe', 1),
    (v_word, 'une mauvaise herbe', 2);

  -- bourgeon
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'bourgeon', 'bud', 'Masculine: un bourgeon. The verb is bourgeonner, to bud.', (select id from public.word_categories where name = 'Plants & Gardening'), 'noun', 8)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'bourgeon', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'bourgeons', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'Every bud will become a flower in spring.', 'Chaque bourgeon donnera une fleur au printemps.', 'bud', 'bourgeon', 1),
    (v_word, v_form2, 'The first buds are already appearing on the cherry tree.', 'Les premiers bourgeons apparaissent déjà sur le cerisier.', 'buds', 'bourgeons', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'le bourgeon', 1),
    (v_word, 'un bourgeon', 2);

  -- fleurir
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'fleurir', 'to flower / to bloom', 'A regular -ir verb: ils fleurissent. Une plante fleurie is in flower; un balcon fleuri is decked with flowers.', (select id from public.word_categories where name = 'Plants & Gardening'), 'verb', 9)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'fleurir', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Present (ils/elles)', '現在形 (ils/elles)', 'fleurissent', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'The lilacs start to bloom at the end of April.', 'Les lilas commencent à fleurir fin avril.', 'bloom', 'fleurir', 1),
    (v_word, v_form2, 'These roses flower twice a year.', 'Ces rosiers fleurissent deux fois par an.', 'flower', 'fleurissent', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'flower', 1),
    (v_word, 'bloom', 2);

  -- engrais
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'engrais', 'fertiliser', 'Masculine and the same in the plural: un engrais, des engrais. Usually with du: mettre de l''engrais.', (select id from public.word_categories where name = 'Plants & Gardening'), 'noun', 10)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'engrais', 1)
  returning id into v_form1;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'I use compost rather than chemical fertiliser.', 'J''utilise du compost plutôt que de l''engrais chimique.', 'fertiliser', 'engrais', 1),
    (v_word, v_form1, 'Too much fertiliser can burn the roots.', 'Trop d''engrais peut brûler les racines.', 'fertiliser', 'engrais', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'l''engrais', 1),
    (v_word, 'de l''engrais', 2),
    (v_word, 'fertilizer', 3);

  -- racine
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'racine', 'root', 'Feminine: une racine. Also figurative, as in English: retrouver ses racines, to go back to your roots.', (select id from public.word_categories where name = 'Plants & Gardening'), 'noun', 11)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'racine', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'racines', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'Pull the plant up by its root, or it''ll grow back.', 'Arrache la plante avec sa racine, sinon elle repoussera.', 'root', 'racine', 1),
    (v_word, v_form2, 'The roots of this oak are lifting the pavement.', 'Les racines de ce chêne soulèvent le trottoir.', 'roots', 'racines', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'la racine', 1),
    (v_word, 'une racine', 2);

  -- se faner
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'se faner', 'to wilt / to fade', 'Reflexive: les fleurs se fanent. The past participle fané is used as an adjective — des roses fanées, wilted roses. Also for colours and beauty that fade.', (select id from public.word_categories where name = 'Plants & Gardening'), 'verb', 12)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'se faner', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Feminine plural', '女性複数形', 'fanées', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'The flowers are starting to wilt in this heat.', 'Les fleurs commencent à se faner avec cette chaleur.', 'wilt', 'se faner', 1),
    (v_word, v_form2, 'I threw away the wilted roses.', 'J''ai jeté les roses fanées.', 'wilted', 'fanées', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'faner', 1),
    (v_word, 'wilt', 2),
    (v_word, 'fade', 3);

  -- faire + infinitif
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'faire + infinitif', 'Have something done by someone else, or make someone do something.', 'faire + infinitive: the action is done by someone else. J''ai fait abattre l''arbre = I had the tree cut down (I didn''t do it myself). The person doing it comes after par, or as an object: il nous fait courir. The past participle fait never agrees here: les arbres que j''ai fait abattre.', null, null, 13)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'faire (past participle)', 'faire (過去分詞)', 'fait', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'faire (infinitive)', 'faire (不定詞)', 'faire', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'We had the old oak cut down — it was diseased.', 'On a fait abattre le vieux chêne, il était malade.', 'had the old oak cut down', 'fait abattre', 1),
    (v_word, v_form2, 'I''m going to have the hedge trimmed by a professional.', 'Je vais faire tailler la haie par un professionnel.', 'have the hedge trimmed', 'faire tailler', 2),
    (v_word, v_form1, 'The coach made us run ten laps of the pitch.', 'L''entraîneur nous a fait courir dix tours de terrain.', 'made us run', 'fait courir', 3);

  -- moineau
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'moineau', 'sparrow', 'Masculine, with the -eau plural in -x: un moineau, des moineaux. Manger comme un moineau is to eat like a bird.', (select id from public.word_categories where name = 'Birds'), 'noun', 14)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'moineau', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'moineaux', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'A sparrow came to peck at the crumbs on the table.', 'Un moineau est venu picorer les miettes sur la table.', 'sparrow', 'moineau', 1),
    (v_word, v_form2, 'Sparrows are becoming rarer and rarer in cities.', 'Les moineaux se font de plus en plus rares en ville.', 'Sparrows', 'moineaux', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'le moineau', 1),
    (v_word, 'un moineau', 2);

  -- rouge-gorge
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'rouge-gorge', 'robin', 'Masculine, literally ''red throat''. Both halves take the plural: des rouges-gorges.', (select id from public.word_categories where name = 'Birds'), 'noun', 15)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'rouge-gorge', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'rouges-gorges', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'A robin follows me around while I dig.', 'Un rouge-gorge me suit pendant que je bêche.', 'robin', 'rouge-gorge', 1),
    (v_word, v_form2, 'Robins sing even in the middle of winter.', 'Les rouges-gorges chantent même en plein hiver.', 'Robins', 'rouges-gorges', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'le rouge-gorge', 1),
    (v_word, 'un rouge-gorge', 2),
    (v_word, 'rouge gorge', 3);

  -- mésange
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'mésange', 'tit (small songbird)', 'Feminine: une mésange. Une mésange bleue is a blue tit and une mésange charbonnière a great tit.', (select id from public.word_categories where name = 'Birds'), 'noun', 16)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'mésange', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'mésanges', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'A blue tit has built its nest in the nest box.', 'Une mésange bleue a fait son nid dans le nichoir.', 'blue tit', 'mésange bleue', 1),
    (v_word, v_form2, 'In winter I hang up fat balls for the tits.', 'En hiver, j''accroche des boules de graisse pour les mésanges.', 'tits', 'mésanges', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'la mésange', 1),
    (v_word, 'une mésange', 2),
    (v_word, 'tit', 3),
    (v_word, 'chickadee', 4);

  -- hirondelle
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'hirondelle', 'swallow', 'Feminine: une hirondelle (h muet, so l''hirondelle). The proverb Une hirondelle ne fait pas le printemps is ''one swallow doesn''t make a summer'' — spring in French.', (select id from public.word_categories where name = 'Birds'), 'noun', 17)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'hirondelle', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'hirondelles', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'One swallow doesn''t make a summer.', 'Une hirondelle ne fait pas le printemps.', 'swallow', 'hirondelle', 1),
    (v_word, v_form2, 'Swallows come back from Africa every spring.', 'Les hirondelles reviennent d''Afrique chaque printemps.', 'Swallows', 'hirondelles', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'l''hirondelle', 1),
    (v_word, 'une hirondelle', 2);

  -- nid
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'nid', 'nest', 'Masculine: un nid. The verb is nicher (to nest) and a nest box is un nichoir. Un nid-de-poule is a pothole.', (select id from public.word_categories where name = 'Birds'), 'noun', 18)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'nid', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'nids', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'The magpies built their nest right at the top of the poplar.', 'Les pies ont construit leur nid tout en haut du peuplier.', 'nest', 'nid', 1),
    (v_word, v_form2, 'You should never touch nests during the breeding season.', 'Il ne faut jamais toucher aux nids pendant la saison de reproduction.', 'nests', 'nids', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'le nid', 1),
    (v_word, 'un nid', 2);

  -- dont
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'dont', 'Join two ideas with ''whose'', or ''of / about which'' — replacing de + noun.', 'Use dont when the verb or expression takes de — parler de, avoir besoin de, être fier de — and for ''whose''. The word order after dont stays normal: le joueur dont la jambe est cassée (not dont est cassée la jambe). English often drops the word entirely: the garden I told you about.', null, null, 19)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Pattern', '文型', 'dont', 1)
  returning id into v_form1;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'That''s the garden I told you about.', 'C''est le jardin dont je t''ai parlé.', 'told you about', 'dont je t''ai parlé', 1),
    (v_word, v_form1, 'The player whose leg is broken will be out for six months.', 'Le joueur dont la jambe est cassée sera absent six mois.', 'whose', 'dont', 2),
    (v_word, v_form1, 'Here''s the bird whose feathers change colour in winter.', 'Voici l''oiseau dont les plumes changent de couleur en hiver.', 'whose', 'dont', 3);

  -- plume
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'plume', 'feather', 'Feminine: une plume — also the nib of a pen, and by extension a writer''s style. Léger comme une plume: light as a feather.', (select id from public.word_categories where name = 'Birds'), 'noun', 20)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'plume', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'plumes', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'I found a jay feather — a beautiful blue.', 'J''ai trouvé une plume de geai, d''un bleu magnifique.', 'feather', 'plume', 1),
    (v_word, v_form2, 'The peacock spreads its feathers to attract the female.', 'Le paon déploie ses plumes pour séduire la femelle.', 'feathers', 'plumes', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'la plume', 1),
    (v_word, 'une plume', 2);

  -- bec
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'bec', 'beak', 'Masculine: un bec. Informally it''s also a mouth — clouer le bec à quelqu''un is to shut someone up — and tomber sur un bec is to hit a snag.', (select id from public.word_categories where name = 'Birds'), 'noun', 21)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'bec', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'becs', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'The woodpecker hammers the bark with its beak.', 'Le pic frappe l''écorce avec son bec.', 'beak', 'bec', 1),
    (v_word, v_form2, 'Flamingos'' beaks curve downwards.', 'Les becs des flamants sont recourbés vers le bas.', 'beaks', 'becs', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'le bec', 1),
    (v_word, 'un bec', 2),
    (v_word, 'bill', 3);

  -- migrer
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'migrer', 'to migrate', 'Regular -er verb. The noun is la migration, and a migratory bird is un oiseau migrateur.', (select id from public.word_categories where name = 'Birds'), 'verb', 22)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'migrer', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Present (ils/elles)', '現在形 (ils/elles)', 'migrent', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form2, 'Storks migrate to Africa at the end of the summer.', 'Les cigognes migrent vers l''Afrique à la fin de l''été.', 'migrate', 'migrent', 1),
    (v_word, v_form1, 'Some birds no longer bother to migrate because of global warming.', 'Certains oiseaux ne prennent plus la peine de migrer à cause du réchauffement.', 'migrate', 'migrer', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'migrate', 1);

  -- couver
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'couver', 'to sit on (eggs) / to brood', 'For a bird keeping its eggs warm. Figuratively, couver une grippe is to be coming down with flu, and couver quelqu''un is to mollycoddle them.', (select id from public.word_categories where name = 'Birds'), 'verb', 23)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'couver', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Present (il/elle)', '現在形 (il/elle)', 'couve', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form2, 'The female sits on her eggs for two weeks.', 'La femelle couve ses œufs pendant deux semaines.', 'sits on', 'couve', 1),
    (v_word, v_form1, 'The male and female take turns to sit on the eggs.', 'Le mâle et la femelle se relaient pour couver.', 'sit on the eggs', 'couver', 2),
    (v_word, null, 'I think I''m coming down with a cold.', 'Je crois que je couve un rhume.', 'coming down with', 'couve', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'brood', 1),
    (v_word, 'sit on eggs', 2),
    (v_word, 'incubate', 3);

  -- rapace
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'rapace', 'bird of prey', 'Masculine: un rapace. As an adjective it means greedy or grasping — un homme d''affaires rapace.', (select id from public.word_categories where name = 'Birds'), 'noun', 24)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'rapace', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'rapaces', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'We saw a bird of prey circling over the field.', 'On a vu un rapace tourner au-dessus du champ.', 'bird of prey', 'rapace', 1),
    (v_word, v_form2, 'Buzzards and falcons are diurnal birds of prey.', 'La buse et le faucon sont des rapaces diurnes.', 'birds of prey', 'rapaces', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'le rapace', 1),
    (v_word, 'un rapace', 2),
    (v_word, 'raptor', 3);

  -- chouette
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'chouette', 'owl', 'Feminine: une chouette — an owl without ear tufts (one with tufts is un hibou). Informally, chouette also means ''great!'': C''est chouette !', (select id from public.word_categories where name = 'Birds'), 'noun', 25)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'chouette', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'chouettes', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'We hear an owl hooting every night.', 'On entend une chouette hululer chaque nuit.', 'owl', 'chouette', 1),
    (v_word, v_form2, 'Barn owls nest in old farm buildings.', 'Les chouettes effraies nichent dans les vieilles granges.', 'Barn owls', 'chouettes effraies', 2),
    (v_word, null, 'It''s great that you came!', 'C''est chouette que tu sois venu !', 'great', 'chouette', 3);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'la chouette', 1),
    (v_word, 'une chouette', 2);

  -- en + participe présent (gérondif)
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'en + participe présent (gérondif)', 'Say two things happen at once, or how something happens — while / by …ing.', 'en + present participle: take the nous form, drop -ons and add -ant (nous courons → en courant). Both actions must have the same subject. Add tout to stress a contrast: tout en sachant… = even though he knew…', null, null, 26)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Gerund (courir)', 'ジェロンディフ (courir)', 'en courant', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Gerund (écouter)', 'ジェロンディフ (écouter)', 'en écoutant', 2)
  returning id into v_form2;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Gerund (désherber)', 'ジェロンディフ (désherber)', 'en désherbant', 3)
  returning id into v_form3;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'He twisted his ankle while running after the ball.', 'Il s''est tordu la cheville en courant après le ballon.', 'while running', 'en courant', 1),
    (v_word, v_form2, 'I learned to recognise birds by listening to their song.', 'J''ai appris à reconnaître les oiseaux en écoutant leur chant.', 'by listening', 'en écoutant', 2),
    (v_word, v_form3, 'She always hums while she''s weeding.', 'Elle chantonne toujours en désherbant.', 'while she''s weeding', 'en désherbant', 3);

  -- arbitre
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'arbitre', 'referee / umpire', 'Masculine or feminine: un or une arbitre. The verb arbitrer is to referee. Le libre arbitre is free will.', (select id from public.word_categories where name = 'Sports & Exercise'), 'noun', 27)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'arbitre', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'arbitres', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'The players disputed the referee''s decision.', 'Les joueurs ont contesté la décision de l''arbitre.', 'referee', 'arbitre', 1),
    (v_word, v_form2, 'Referees now use video replays.', 'Les arbitres utilisent désormais la vidéo.', 'Referees', 'arbitres', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'l''arbitre', 1),
    (v_word, 'un arbitre', 2),
    (v_word, 'une arbitre', 3),
    (v_word, 'referee', 4),
    (v_word, 'umpire', 5);

  -- siffler
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'siffler', 'to whistle / to blow the whistle / to boo', 'A referee siffle a foul or the end of the match. French crowds whistle rather than boo, so siffler une équipe means to boo it.', (select id from public.word_categories where name = 'Sports & Exercise'), 'verb', 28)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'siffler', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Past participle', '過去分詞', 'sifflé', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form2, 'The referee blew the final whistle.', 'L''arbitre a sifflé la fin du match.', 'blew the final whistle', 'sifflé', 1),
    (v_word, v_form1, 'The crowd started booing the other team.', 'Le public s''est mis à siffler l''équipe adverse.', 'booing', 'siffler', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'whistle', 1),
    (v_word, 'boo', 2),
    (v_word, 'to whistle', 3),
    (v_word, 'to boo', 4);

  -- match nul
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'match nul', 'draw (in a match)', 'Masculine: un match nul. Faire match nul is to draw. Both words take the plural: des matchs nuls.', (select id from public.word_categories where name = 'Sports & Exercise'), 'noun', 29)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'match nul', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'matchs nuls', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'The two teams drew, one-all.', 'Les deux équipes ont fait match nul, un partout.', 'drew', 'match nul', 1),
    (v_word, v_form2, 'Three draws in a row isn''t enough to win the league.', 'Trois matchs nuls d''affilée, ce n''est pas suffisant pour gagner le championnat.', 'draws', 'matchs nuls', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'un match nul', 1),
    (v_word, 'le match nul', 2),
    (v_word, 'draw', 3),
    (v_word, 'tie', 4);

  -- marquer
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'marquer', 'to score', 'marquer un but (a goal), un essai (a try), des points. Outside sport it means to mark or to leave its mark: ce voyage m''a marqué.', (select id from public.word_categories where name = 'Sports & Exercise'), 'verb', 30)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'marquer', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Past participle', '過去分詞', 'marqué', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form2, 'He scored two goals in the first half.', 'Il a marqué deux buts en première mi-temps.', 'scored', 'marqué', 1),
    (v_word, v_form1, 'We absolutely have to score before half-time.', 'Il faut absolument marquer avant la pause.', 'score', 'marquer', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'score', 1);

  -- but
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'but', 'goal', 'Masculine: un but. The t can be sounded or silent (both are heard). It also means aim or purpose: dans le but de, with the aim of. The goalkeeper is le gardien de but.', (select id from public.word_categories where name = 'Sports & Exercise'), 'noun', 31)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'but', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'buts', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'What a fantastic goal!', 'Quel but magnifique !', 'goal', 'but', 1),
    (v_word, v_form2, 'They conceded three goals in ten minutes.', 'Ils ont encaissé trois buts en dix minutes.', 'goals', 'buts', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'le but', 1),
    (v_word, 'un but', 2);

  -- si + plus-que-parfait → conditionnel passé
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'si + plus-que-parfait → conditionnel passé', 'Say what would have happened if things had been different.', 'The si clause takes the plus-que-parfait (imperfect of avoir/être + past participle); the result takes the conditionnel passé (conditional of avoir/être + past participle). Never put the conditional straight after si: si j''aurais su ✗ → si j''avais su ✓.', null, null, 32)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Pluperfect (je)', '大過去 (je)', 'avais', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Past conditional (il)', '条件法過去 (il)', 'aurait', 2)
  returning id into v_form2;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Past conditional (nous)', '条件法過去 (nous)', 'aurions', 3)
  returning id into v_form3;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'If I''d sown earlier, I would have had tomatoes in July.', 'Si j''avais semé plus tôt, j''aurais eu des tomates en juillet.', 'If I''d sown', 'Si j''avais semé', 1),
    (v_word, v_form2, 'If the referee had seen the foul, he would have given a penalty.', 'Si l''arbitre avait vu la faute, il aurait sifflé un penalty.', 'would have given', 'aurait sifflé', 2),
    (v_word, v_form3, 'We would have won if we had scored that penalty.', 'Nous aurions gagné si nous avions marqué ce penalty.', 'would have won', 'aurions gagné', 3);

  -- s'entraîner
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 's''entraîner', 'to train / to practise', 'Reflexive: je m''entraîne, elle s''entraîne. Without se, entraîner means to train someone (or to drag along, to lead to). The 1990 spelling reform allows s''entrainer without the circumflex.', (select id from public.word_categories where name = 'Sports & Exercise'), 'verb', 33)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 's''entraîner', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Present (il/elle)', '現在形 (il/elle)', 's''entraîne', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'To improve, you have to train regularly.', 'Pour progresser, il faut s''entraîner régulièrement.', 'train', 's''entraîner', 1),
    (v_word, v_form2, 'She trains four times a week for the marathon.', 'Elle s''entraîne quatre fois par semaine pour le marathon.', 'trains', 's''entraîne', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 's''entrainer', 1),
    (v_word, 'train', 2),
    (v_word, 'practise', 3),
    (v_word, 'practice', 4);

  -- entraîneur
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'entraîneur', 'coach / manager (of a team)', 'Feminine: une entraîneuse. In football it''s the word for the manager. Also spelt entraineur since the 1990 reform.', (select id from public.word_categories where name = 'Sports & Exercise'), 'noun', 34)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Masculine', '男性形', 'entraîneur', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Feminine', '女性形', 'entraîneuse', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'The manager was sacked after the defeat.', 'L''entraîneur a été limogé après la défaite.', 'manager', 'entraîneur', 1),
    (v_word, v_form2, 'Our coach makes us run ten kilometres every morning.', 'Notre entraîneuse nous fait courir dix kilomètres tous les matins.', 'coach', 'entraîneuse', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'l''entraîneur', 1),
    (v_word, 'un entraîneur', 2),
    (v_word, 'entraineur', 3),
    (v_word, 'coach', 4),
    (v_word, 'manager', 5);

  -- épreuve
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'épreuve', 'event (in a competition) / test / ordeal', 'Feminine: une épreuve. In athletics it''s an event; in general a test or a hard time. À l''épreuve de means proof against: à l''épreuve des balles, bulletproof.', (select id from public.word_categories where name = 'Sports & Exercise'), 'noun', 35)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'épreuve', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Plural', '複数', 'épreuves', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'She won the 200 metres event.', 'Elle a remporté l''épreuve du 200 mètres.', 'event', 'épreuve', 1),
    (v_word, v_form2, 'The decathlon has ten events.', 'Le décathlon compte dix épreuves.', 'events', 'épreuves', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'l''épreuve', 1),
    (v_word, 'une épreuve', 2),
    (v_word, 'event', 3);

  -- remporter
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'remporter', 'to win (a title, match or prize)', 'More formal than gagner, and used with what is won: remporter un match, une médaille, les élections. Remporter un succès is to be a success.', (select id from public.word_categories where name = 'Sports & Exercise'), 'verb', 36)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'remporter', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Past participle', '過去分詞', 'remporté', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form2, 'They won the league for the third year running.', 'Ils ont remporté le championnat pour la troisième année consécutive.', 'won', 'remporté', 1),
    (v_word, v_form1, 'He''s the youngest player to win this tournament.', 'C''est le plus jeune joueur à remporter ce tournoi.', 'win', 'remporter', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'win', 1);

  -- échauffement
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'échauffement', 'warm-up', 'Masculine: un échauffement. The verb is s''échauffer, to warm up. Échauffer les esprits is to get people worked up.', (select id from public.word_categories where name = 'Sports & Exercise'), 'noun', 37)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Singular', '単数', 'échauffement', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Verb', '動詞', 's''échauffer', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'Never skip the warm-up — that''s how you get injured.', 'Ne saute jamais l''échauffement, c''est comme ça qu''on se blesse.', 'warm-up', 'échauffement', 1),
    (v_word, v_form2, 'The substitutes are starting to warm up along the touchline.', 'Les remplaçants commencent à s''échauffer le long de la ligne de touche.', 'warm up', 's''échauffer', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'l''échauffement', 1),
    (v_word, 'un échauffement', 2),
    (v_word, 'warm up', 3),
    (v_word, 'warmup', 4);

  -- se blesser
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'vocab', 'se blesser', 'to get injured / to hurt yourself', 'Reflexive: il s''est blessé au genou (he hurt his knee). Un blessé is an injured person and une blessure an injury.', (select id from public.word_categories where name = 'Sports & Exercise'), 'verb', 38)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'se blesser', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Past participle', '過去分詞', 'blessé', 2)
  returning id into v_form2;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'You can easily get hurt if you don''t warm up.', 'On peut facilement se blesser si on ne s''échauffe pas.', 'get hurt', 'se blesser', 1),
    (v_word, v_form2, 'He injured his knee in training.', 'Il s''est blessé au genou à l''entraînement.', 'injured', 'blessé', 2);
  insert into public.word_alternate_answers (word_id, value, position) values
    (v_word, 'blesser', 1),
    (v_word, 'get injured', 2),
    (v_word, 'get hurt', 3);

  -- bien que + subjonctif
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'bien que + subjonctif', 'Say ''although'' / ''even though''.', 'Bien que (and the more formal quoique) always takes the subjunctive, even though English uses an ordinary verb: bien que le terrain soit détrempé. Before il, elle or on, que becomes qu''. A very common mistake is the indicative: bien que le terrain est… ✗.', null, null, 39)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Pattern', '文型', 'bien que', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Subjunctive (il être)', '接続法 (il être)', 'soit', 2)
  returning id into v_form2;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Subjunctive (ils être)', '接続法 (ils être)', 'soient', 3)
  returning id into v_form3;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form2, 'Although the pitch is waterlogged, the match will go ahead.', 'Bien que le terrain soit détrempé, le match aura lieu.', 'Although', 'Bien que le terrain soit', 1),
    (v_word, v_form1, 'The rose bush flowered even though I never pruned it.', 'Le rosier a fleuri bien que je ne l''aie jamais taillé.', 'even though', 'bien que je ne l''aie jamais taillé', 2),
    (v_word, v_form3, 'Although the swallows are back, it''s still cold.', 'Bien que les hirondelles soient de retour, il fait encore froid.', 'Although', 'Bien que les hirondelles soient', 3);

  -- se faire + infinitif
  insert into public.words (language_deck_id, path, term, translation, explanation, category_id, word_type, position)
  values (v_deck, 'grammar', 'se faire + infinitif', 'Say something was done to someone — usually something unwelcome: to get …ed.', 'se faire + infinitive is the everyday way to say ''get done (to you)'': se faire expulser (get sent off), se faire piquer (get stung). In the passé composé it takes être, and fait doesn''t agree: elle s''est fait voler son vélo.', null, null, 40)
  returning id into v_word;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Passé composé (il)', '複合過去 (il)', 's''est fait', 1)
  returning id into v_form1;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Passé composé (je)', '複合過去 (je)', 'me suis fait', 2)
  returning id into v_form2;
  insert into public.word_forms (word_id, label_en, label_ja, value, position)
  values (v_word, 'Infinitive', '不定詞', 'se faire', 3)
  returning id into v_form3;
  insert into public.word_examples (word_id, form_id, en, ja, en_highlight, ja_highlight, position) values
    (v_word, v_form1, 'The defender got sent off in the 80th minute.', 'Le défenseur s''est fait expulser à la 80e minute.', 'got sent off', 's''est fait expulser', 1),
    (v_word, v_form2, 'I got stung by a wasp while picking raspberries.', 'Je me suis fait piquer par une guêpe en cueillant des framboises.', 'got stung', 'me suis fait piquer', 2),
    (v_word, v_form3, 'Small birds can easily get caught by cats.', 'Les petits oiseaux peuvent facilement se faire attraper par les chats.', 'get caught', 'se faire attraper', 3);

end;
$$;

