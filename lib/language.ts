// Whether a target-language term can be safely typed on a standard Latin
// keyboard: Latin letters (accented ones too — French "élève", "cœur"),
// digits, punctuation and spaces, with nothing from another script. It decides
// whether a typed quiz question needs a romanized answer (vocab, whose
// `romanization` is a full transliteration of the term) or should avoid
// asking the learner to type the term back at all (grammar, whose
// `romanization` — when present — is just a key-particle pronunciation
// note, not a full transliteration of the pattern).
export function isLatinTypeable(term: string): boolean {
  return /^[\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]*$/u.test(term);
}
