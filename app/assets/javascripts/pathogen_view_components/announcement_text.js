// Joins message fragments into one spoken string, adding a period after any
// non-final fragment that does not already end in sentence punctuation. Screen
// readers voice this, so toast bodies and coalesced announcements share one rule.
const joinAsSentences = (parts) =>
  parts.map((part, index) => (index < parts.length - 1 && !/[.!?]$/.test(part) ? `${part}.` : part)).join(" ");

export { joinAsSentences };
