/**
 * Parses OCR text from a courier parcel label into receiver details.
 *
 * Main ideas:
 *  1. Split the text into a RECEIVER block and a SENDER block (To / From markers),
 *     so the sender's phone, PIN and address never leak into the challan.
 *  2. Parse only the receiver block: phone, contact person, PIN, city, state, name.
 *  3. Cross-check / fill state from the city or the PIN prefix, and return warnings
 *     for anything that looks wrong.
 */

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */

const STATES = [
  ['Andaman and Nicobar Islands'],
  ['Andhra Pradesh'],
  ['Arunachal Pradesh'],
  ['Assam'],
  ['Bihar'],
  ['Chandigarh'],
  ['Chhattisgarh'],
  ['Dadra and Nagar Haveli and Daman and Diu'],
  ['Delhi', 'NCT of Delhi'],
  ['Goa'],
  ['Gujarat'],
  ['Haryana'],
  ['Himachal Pradesh'],
  ['Jammu and Kashmir'],
  ['Jharkhand'],
  ['Karnataka'],
  ['Kerala'],
  ['Ladakh'],
  ['Lakshadweep'],
  ['Madhya Pradesh'],
  ['Maharashtra'],
  ['Manipur'],
  ['Meghalaya'],
  ['Mizoram'],
  ['Nagaland'],
  ['Odisha', 'Orissa'],
  ['Puducherry', 'Pondicherry'],
  ['Punjab'],
  ['Rajasthan'],
  ['Sikkim'],
  ['Tamil Nadu'],
  ['Telangana'],
  ['Tripura'],
  ['Uttar Pradesh'],
  ['Uttarakhand'],
  ['West Bengal'],
];

const STATE_ENTRIES = STATES.flatMap(([state, ...aliases]) =>
  [state, ...aliases].map((name) => ({ key: name.toLowerCase(), state }))
).sort((a, b) => b.key.length - a.key.length);

// city (lowercase) -> state. Used to recognise cities and to fill a missing state.
const CITY_STATE = {
  mumbai: 'Maharashtra',
  'navi mumbai': 'Maharashtra',
  thane: 'Maharashtra',
  'mira road': 'Maharashtra',
  bhayandar: 'Maharashtra',
  vasai: 'Maharashtra',
  virar: 'Maharashtra',
  kalyan: 'Maharashtra',
  panvel: 'Maharashtra',
  pune: 'Maharashtra',
  nagpur: 'Maharashtra',
  nashik: 'Maharashtra',
  aurangabad: 'Maharashtra',
  delhi: 'Delhi',
  'new delhi': 'Delhi',
  gurgaon: 'Haryana',
  gurugram: 'Haryana',
  faridabad: 'Haryana',
  panchkula: 'Haryana',
  noida: 'Uttar Pradesh',
  ghaziabad: 'Uttar Pradesh',
  lucknow: 'Uttar Pradesh',
  kanpur: 'Uttar Pradesh',
  chandigarh: 'Chandigarh',
  mohali: 'Punjab',
  ludhiana: 'Punjab',
  amritsar: 'Punjab',
  bangalore: 'Karnataka',
  bengaluru: 'Karnataka',
  hyderabad: 'Telangana',
  secunderabad: 'Telangana',
  chennai: 'Tamil Nadu',
  coimbatore: 'Tamil Nadu',
  kochi: 'Kerala',
  cochin: 'Kerala',
  thiruvananthapuram: 'Kerala',
  visakhapatnam: 'Andhra Pradesh',
  vijayawada: 'Andhra Pradesh',
  kolkata: 'West Bengal',
  ahmedabad: 'Gujarat',
  surat: 'Gujarat',
  vadodara: 'Gujarat',
  rajkot: 'Gujarat',
  jaipur: 'Rajasthan',
  indore: 'Madhya Pradesh',
  bhopal: 'Madhya Pradesh',
  patna: 'Bihar',
  ranchi: 'Jharkhand',
  raipur: 'Chhattisgarh',
  bhubaneswar: 'Odisha',
  guwahati: 'Assam',
  dehradun: 'Uttarakhand',
  panaji: 'Goa',
};

const CITY_KEYS = Object.keys(CITY_STATE).sort((a, b) => b.length - a.length);

// First two PIN digits -> state. Deliberately skips ambiguous prefixes
// (16 Chandigarh/Punjab, 24-26 UP/Uttarakhand, 81-82 Bihar/Jharkhand, 66-69 edge cases).
const PIN_PREFIX_STATE = {
  11: 'Delhi', 12: 'Haryana', 13: 'Haryana', 14: 'Punjab', 15: 'Punjab',
  17: 'Himachal Pradesh', 18: 'Jammu and Kashmir', 19: 'Jammu and Kashmir',
  20: 'Uttar Pradesh', 21: 'Uttar Pradesh', 22: 'Uttar Pradesh', 23: 'Uttar Pradesh',
  27: 'Uttar Pradesh', 28: 'Uttar Pradesh',
  30: 'Rajasthan', 31: 'Rajasthan', 32: 'Rajasthan', 33: 'Rajasthan', 34: 'Rajasthan',
  36: 'Gujarat', 37: 'Gujarat', 38: 'Gujarat', 39: 'Gujarat',
  40: 'Maharashtra', 41: 'Maharashtra', 42: 'Maharashtra', 43: 'Maharashtra', 44: 'Maharashtra',
  45: 'Madhya Pradesh', 46: 'Madhya Pradesh', 47: 'Madhya Pradesh', 48: 'Madhya Pradesh',
  49: 'Chhattisgarh',
  50: 'Telangana', 51: 'Andhra Pradesh', 52: 'Andhra Pradesh', 53: 'Andhra Pradesh',
  56: 'Karnataka', 57: 'Karnataka', 58: 'Karnataka', 59: 'Karnataka',
  60: 'Tamil Nadu', 62: 'Tamil Nadu', 63: 'Tamil Nadu', 64: 'Tamil Nadu',
  67: 'Kerala', 68: 'Kerala', 69: 'Kerala',
  70: 'West Bengal', 71: 'West Bengal', 72: 'West Bengal', 73: 'West Bengal', 74: 'West Bengal',
  75: 'Odisha', 76: 'Odisha', 77: 'Odisha',
  78: 'Assam',
  80: 'Bihar', 84: 'Bihar', 85: 'Bihar',
  83: 'Jharkhand',
};

function stateFromPin(pin) {
  if (!/^\d{6}$/.test(pin || '')) return '';
  if (pin.startsWith('403')) return 'Goa';
  if (pin.startsWith('396')) return ''; // Daman / Dadra: ambiguous with Gujarat
  if (pin.startsWith('605')) return ''; // Puducherry / Tamil Nadu mix
  return PIN_PREFIX_STATE[pin.slice(0, 2)] || '';
}

/* ------------------------------------------------------------------ */
/* Patterns                                                            */
/* ------------------------------------------------------------------ */

const FROM_RE = /^(?:from|sender|shipper|consignor|return\s*(?:to|address)|sold\s*by)\b/i;
const TO_RE =
  /^(?:to|ship\s*to|deliver\s*to|consignee|recipient|receiver|deliver(?:y)?\s*address|shipping\s*address)\b/i;

const ADDR_PREFIX =
  /^(?:address|addr|add|delivery address|shipping address|consignee address)\s*[:.\-]\s*/i;
const HEADER_ONLY =
  /^(?:address|addr|add|delivery address|shipping address|ship to|deliver to|consignee|receiver|recipient|name)\s*[:.\-]?$/i;
const NOISE_PATTERNS = [
  /^subject\s*:/i,
  /^(?:ref|order|awb|invoice|inv|po|dc|date|weight|wt|qty|cod)\b\s*(?:no\.?|number|id)?\s*[:#-]/i,
];
const CONTACT_RE =
  /^(?:contact\s*person|contact\s*name|contact|attn|attention|kind\s*attn)\b\.?\s*(?:name\s*&?\s*)?(?:mob(?:ile)?\.?\s*(?:no\.?|number)?)?\s*[:.\-]*\s*(.*)$/i;
const CONTACT_WORDS = new Set([
  'contact', 'person', 'name', 'mob', 'mobile', 'no', 'number', 'ph', 'phone',
  'tel', 'telephone', 'and', 'details', 'cell', 'whatsapp', 'wa',
]);

const ORG_RE =
  /\b(?:pvt|private|ltd|limited|llp|inc|corp|corporation|company|enterprises?|industries|traders?|services|solutions|technologies|systems|associates|bank|stores?|mart|shop|agency|agencies|hospital|school|college|university|trust|foundation|exports?|imports?|international|global|group|consultants?|advisory|management|logistics|pharma|labs?|infotech|motors|textiles?|electronics|retail)\b/i;
const DESIG_RE =
  /^(?:co-?founder|founder|director|manager|ceo|cto|cfo|md|proprietor|owner|partner|head|executive|officer|president|vp|hr|admin|accounts?)\b/i;
const ADDR_WORDS =
  /\b(?:road|rd|street|st|lane|nagar|colony|layout|sector|plot|flat|floor|wing|block|building|bldg|tower|park|complex|market|marg|chowk|society|apartment|apt|house|villa|opp|near|behind|above|landmark|cross|main|avenue|highway|industrial|area|estate|phase|mall|office|shop|pin|pincode)\b/i;
const PIN_LABEL_END = /(?:pin\s*code|pincode|pin|postal\s*code|zip(?:\s*code)?)\s*[:#.\-]*\s*$/i;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const norm = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u00a0\u2000-\u200b]/g, ' ')
    .replace(/[\t ]+/g, ' ')
    .trim();

const trimEdges = (value) =>
  norm(value)
    .replace(/^[\s,;:|/.\-_~*]+/, '')
    .replace(/[\s,;:|/.\-_~*]+$/, '')
    .trim();

const tidyLine = (line) =>
  trimEdges(line).replace(/\s+,/g, ',').replace(/,(?=\S)/g, ', ');

const hasLetters = (value) => /[A-Za-z]/.test(value);

function splitLines(text) {
  const rawLines = String(text || '').split(/\r?\n/).map((line) => norm(line.replace(/\|/g, ' ')));
  const lines = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    let line = rawLines[i];
    // "6-3-" + "1192, ..." : the label wrapped in the middle of a hyphenated number
    while (/\d-$/.test(line) && i + 1 < rawLines.length) {
      i += 1;
      line += rawLines[i];
    }
    if ((line.match(/[A-Za-z0-9]/g) || []).length >= 2) lines.push(line);
  }
  return lines;
}

function matchState(text, allowCityStates = false) {
  const clean = trimEdges(text);
  const lower = clean.toLowerCase();
  for (const entry of STATE_ENTRIES) {
    if (!allowCityStates && CITY_STATE[entry.key]) continue;
    if (!lower.endsWith(entry.key)) continue;
    const before = lower.length - entry.key.length;
    if (before === 0 || /[\s,.\-]/.test(lower[before - 1])) {
      return { state: entry.state, rest: trimEdges(clean.slice(0, before)) };
    }
  }
  return null;
}

function matchCity(text) {
  const clean = trimEdges(text);
  const lower = clean.toLowerCase();
  for (const key of CITY_KEYS) {
    if (!lower.endsWith(key)) continue;
    const before = lower.length - key.length;
    if (before === 0 || /[\s,.\-]/.test(lower[before - 1])) {
      return { city: clean.slice(before), rest: trimEdges(clean.slice(0, before)) };
    }
  }
  return null;
}

function findPhones(line) {
  const found = [];
  const re = /[6-9](?:[ -]?\d){9}/g;
  let match;
  while ((match = re.exec(line))) {
    let start = match.index;
    const end = start + match[0].length;
    const prev = line[start - 1];
    const next = line[end];
    if ((prev && /\d/.test(prev)) || (next && /\d/.test(next))) {
      re.lastIndex = start + 1;
      continue;
    }
    const prefix = line.slice(0, start).match(/(?:\+\s*91|\b91|\b0)[ -]?$/);
    if (prefix) start -= prefix[0].length;
    found.push({ digits: match[0].replace(/\D/g, ''), start, end });
  }
  return found;
}

function findPin(line) {
  for (const match of line.matchAll(/\d+/g)) {
    if (match[0].length === 6 && match[0][0] !== '0') {
      return { pin: match[0], start: match.index, end: match.index + 6 };
    }
  }
  // OCR often reads 0 as O and 1 as l/I inside a PIN
  for (const match of line.matchAll(/(^|[^A-Za-z0-9])([0-9OoIl]{6})(?![A-Za-z0-9])/g)) {
    const token = match[2];
    const digitCount = (token.match(/\d/g) || []).length;
    const fixed = token.replace(/[Oo]/g, '0').replace(/[Il]/g, '1');
    if (digitCount >= 4 && fixed[0] !== '0') {
      const start = match.index + match[1].length;
      return { pin: fixed, start, end: start + 6 };
    }
  }
  return null;
}

function isIdToken(line) {
  return /^(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9-]{8,}$/.test(line);
}

function isContactHeader(line) {
  if (/\d/.test(line)) return false;
  const tokens = line.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => CONTACT_WORDS.has(token));
}

function stripLabels(value) {
  return trimEdges(
    value.replace(
      /\b(?:contact|mobile|mob|phone|ph|tel|telephone|cell|whatsapp|no|nos|number)\b\.?/gi,
      ' '
    )
  );
}

function isPersonLike(value) {
  const text = trimEdges(value);
  if (!text || text.length > 40) return false;
  const words = text.split(/\s+/);
  if (words.length > 4) return false;
  if (!words.every((word) => /^[A-Za-z][A-Za-z.'-]*$/.test(word))) return false;
  if (ORG_RE.test(text) || DESIG_RE.test(text) || ADDR_WORDS.test(text)) return false;
  if (/^(?:the|m\/s)\b/i.test(text)) return false;
  const asState = matchState(text, true);
  if (asState && !asState.rest) return false;
  if (matchCity(text) && !matchCity(text).rest) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Step 1: split into receiver / sender blocks                         */
/* ------------------------------------------------------------------ */

function splitBlocks(lines) {
  const marks = [];
  lines.forEach((line, index) => {
    if (FROM_RE.test(line)) marks.push({ index, type: 'from' });
    else if (TO_RE.test(line)) marks.push({ index, type: 'to' });
  });

  if (!marks.length) return { receiver: lines, sender: [] };

  const segments = marks.map((mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : lines.length;
    const first = lines[mark.index];
    let remainder = first.replace(mark.type === 'from' ? FROM_RE : TO_RE, '');
    if (mark.type === 'from') remainder = remainder.replace(/\s+to\s*$/i, '');
    return {
      type: mark.type,
      lines: [trimEdges(remainder), ...lines.slice(mark.index + 1, end)].filter(Boolean),
    };
  });

  const pre = lines.slice(0, marks[0].index);
  const toLines = segments.filter((s) => s.type === 'to').flatMap((s) => s.lines);
  const fromLines = segments.filter((s) => s.type === 'from').flatMap((s) => s.lines);

  if (toLines.length) return { receiver: toLines, sender: fromLines };

  // No "To" marker. Receiver is whatever came before "From" ...
  if (pre.length) return { receiver: pre, sender: fromLines };

  // ... or "From" was first: sender block ends at its PIN line (+ phone line).
  const pinAt = fromLines.findIndex((line) => findPin(line));
  if (pinAt === -1) return { receiver: [], sender: fromLines };
  let senderEnd = pinAt + 1;
  if (fromLines[senderEnd] && findPhones(fromLines[senderEnd]).length) senderEnd += 1;
  return { receiver: fromLines.slice(senderEnd), sender: fromLines.slice(0, senderEnd) };
}

/* ------------------------------------------------------------------ */
/* Step 2: parse the receiver block                                    */
/* ------------------------------------------------------------------ */

function parseLocation(before, after) {
  let remainder = trimEdges(before.replace(PIN_LABEL_END, ''));
  const tail = trimEdges(after);
  let state = '';
  let city = '';

  const tailState = tail ? matchState(tail, true) : null;
  if (tailState && !tailState.rest) state = tailState.state;

  const stateMatch = matchState(remainder);
  if (stateMatch) {
    if (!state) state = stateMatch.state;
    remainder = stateMatch.rest;
  }

  const cityMatch = matchCity(remainder);
  if (cityMatch) {
    city = cityMatch.city;
    remainder = cityMatch.rest;
  } else if (state || remainder.includes(',')) {
    const segments = remainder.split(',').map(trimEdges).filter(Boolean);
    const last = segments[segments.length - 1];
    const wordCount = last ? last.split(/\s+/).length : 0;
    if (
      last &&
      !/\d/.test(last) &&
      wordCount <= 3 &&
      !ADDR_WORDS.test(last) &&
      (segments.length > 1 || wordCount <= 2)
    ) {
      city = last;
      remainder = segments.slice(0, -1).join(', ');
    }
  }

  if (!city && tail && !tailState) {
    const tailCity = matchCity(tail);
    if (tailCity && !tailCity.rest) city = tailCity.city;
  }

  return { state, city, remainder: trimEdges(remainder) };
}

function pickName(head) {
  const drop = new Set();
  if (!head.length) return { name: '', contactPerson: '', drop };

  const first = head[0];
  if (isPersonLike(first)) {
    for (let j = 1; j < Math.min(head.length, 4); j += 1) {
      const line = head[j];
      if (DESIG_RE.test(line)) continue;
      if (ORG_RE.test(line) && !/\d/.test(line) && !/^c\/o\b/i.test(line)) {
        for (let k = 0; k < j; k += 1) drop.add(k);
        drop.add(j);
        return { name: trimEdges(line), contactPerson: trimEdges(first), drop };
      }
      break;
    }
  }

  drop.add(0);
  return { name: trimEdges(first), contactPerson: '', drop };
}

function parseReceiver(blockLines) {
  const warnings = [];
  const phones = [];
  let contactPerson = '';
  let email = '';
  const kept = [];

  for (const original of blockLines) {
    let line = trimEdges(original.replace(ADDR_PREFIX, ''));
    if (!line) continue;
    if (
      NOISE_PATTERNS.some((re) => re.test(line)) ||
      isIdToken(line) ||
      HEADER_ONLY.test(line) ||
      isContactHeader(line)
    ) {
      continue;
    }

    const emailMatch = line.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
    if (emailMatch) {
      if (!email) email = emailMatch[0].toLowerCase();
      line = trimEdges(line.replace(emailMatch[0], ' '));
      if (!line) continue;
    }

    const found = findPhones(line);
    let working = line;
    for (const phone of [...found].reverse()) {
      working = `${working.slice(0, phone.start)} ${working.slice(phone.end)}`;
    }
    working = trimEdges(working);
    found.forEach((phone) => phones.push(phone.digits));

    const contactMatch = working.match(CONTACT_RE);
    if (contactMatch) {
      const person = stripLabels(contactMatch[1]);
      if (person && isPersonLike(person) && !contactPerson) contactPerson = person;
      continue;
    }

    if (found.length) {
      const label = stripLabels(working);
      if (!label) continue;
      if (isPersonLike(label) && !findPin(label) && !contactPerson) {
        contactPerson = label;
        continue;
      }
      line = trimEdges(
        working.replace(/\b(?:mobile|mob|phone|ph|tel|contact)\b[\s.]*(?:no|number)?\.?[\s:.-]*$/i, '')
      );
      if (!line) continue;
    }

    kept.push(line);
  }

  const uniquePhones = [...new Set(phones)];
  if (uniquePhones.length > 1) {
    warnings.push(`Several phone numbers found (${uniquePhones.join(', ')}). The first one was used.`);
  }
  if (!uniquePhones.length) warnings.push('No receiver phone number found on the label.');

  // --- PIN / location ------------------------------------------------
  let pinIndex = -1;
  let pinInfo = null;
  kept.some((line, index) => {
    const found = findPin(line);
    if (found) {
      pinIndex = index;
      pinInfo = found;
      return true;
    }
    return false;
  });

  let head = kept;
  let pinRest = '';
  let tail = [];
  let pin = '';
  let state = '';
  let city = '';

  if (pinInfo) {
    const line = kept[pinIndex];
    pin = pinInfo.pin;
    const loc = parseLocation(line.slice(0, pinInfo.start), line.slice(pinInfo.end));
    state = loc.state;
    city = loc.city;
    pinRest = loc.remainder;
    head = kept.slice(0, pinIndex);
    tail = kept.slice(pinIndex + 1);

    // State on its own line right after the PIN line ("Telangana")
    if (tail.length) {
      const nextState = matchState(tail[0], true);
      if (nextState && !nextState.rest) {
        if (!state) state = nextState.state;
        tail = tail.slice(1);
      }
    }

    // Name-like lines after the PIN line are the contact person (table-style labels)
    if (!contactPerson) {
      const names = [];
      while (tail.length && isPersonLike(tail[0]) && names.length < 3) {
        names.push(tail[0]);
        tail = tail.slice(1);
      }
      const joined = names.join(' ');
      if (joined && joined.split(/\s+/).length <= 4) contactPerson = joined;
      else tail = [...names, ...tail];
    }

    // City sometimes sits on the line above a "Pincode - 4xxxxx" line
    if (!city) {
      for (const candidate of [pinRest, ...head.slice(-2).reverse()]) {
        const last = trimEdges(String(candidate || '').split(',').pop());
        const cityMatch = last && matchCity(last);
        if (cityMatch) {
          city = cityMatch.city;
          break;
        }
      }
    }
  } else {
    warnings.push('PIN code not found. Add it manually.');
  }

  // --- name / contact person ----------------------------------------
  const picked = pickName(head);
  if (picked.contactPerson && !contactPerson) contactPerson = picked.contactPerson;
  const addressLines = [
    ...head.filter((_, index) => !picked.drop.has(index)),
    pinRest,
    ...tail,
  ]
    .map(tidyLine)
    .filter(Boolean);

  let name = picked.name;
  if (!name && addressLines.length) name = addressLines.shift();

  // --- state resolution + sanity checks -----------------------------
  let inferredState = false;
  const pinState = stateFromPin(pin);
  if (!state && city) state = CITY_STATE[city.toLowerCase().replace(/\s+/g, ' ')] || '';
  if (!state && pinState) {
    state = pinState;
    inferredState = true;
  }
  if (inferredState) warnings.push(`State was filled from the PIN (${pinState}). Please confirm.`);
  if (state && pinState && state !== pinState) {
    warnings.push(`PIN ${pin} normally belongs to ${pinState}, but the label says ${state}. Check the PIN.`);
  }
  if (pin && !city) warnings.push('City not recognised. Please add it.');

  const result = {
    name,
    address: addressLines.join('\n'),
    city,
    state,
    pin,
    contactNo: uniquePhones[0] || '',
    email,
    contactPerson,
    meta: {
      warnings,
      phones: uniquePhones,
      receiverText: blockLines.join('\n'),
      inferredState,
      score: 0,
    },
  };
  result.meta.score = scoreScannedAddress(result);
  return result;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function scoreScannedAddress(recipient) {
  if (!recipient) return 0;
  let score = 0;
  if (/^[1-9]\d{5}$/.test(recipient.pin || '')) score += 35;
  if (/^\d{10}$/.test(recipient.contactNo || '')) score += 15;
  if ((recipient.name || '').length >= 3) score += 15;
  if (recipient.city) score += 10;
  if (recipient.state) score += 10;
  if ((recipient.address || '').length >= 8) score += 15;
  return score;
}

export function extractScannedAddress(text) {
  const lines = splitLines(text);
  const { receiver } = splitBlocks(lines);
  return parseReceiver(receiver);
}

/* ---------------------------- client matching ---------------------- */

export const normalizeForMatch = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function editDistanceAtMostOne(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (a.length < b.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const last10 = (value) => String(value || '').replace(/\D/g, '').slice(-10);

/**
 * Ranks saved clients against a scanned recipient.
 * Only the RECEIVER text is used, so the sender (your own customers) never match.
 * `strong` = phone matched, or PIN matched together with at least one name word.
 */
export function rankSavedClientMatches(clients, recipient) {
  const receiverText = normalizeForMatch(recipient?.meta?.receiverText || '');
  const words = receiverText.split(' ').filter(Boolean);
  const phones = new Set((recipient?.meta?.phones || []).map(last10));
  const pin = String(recipient?.pin || '');
  const city = normalizeForMatch(recipient?.city);

  return (Array.isArray(clients) ? clients : [])
    .map((client) => {
      const tokens = normalizeForMatch(client.name)
        .split(' ')
        .filter((token) => token.length >= 4);
      const matched = tokens.filter((token) =>
        words.some((word) => word === token || (token.length >= 6 && editDistanceAtMostOne(word, token)))
      ).length;
      const allTokens = tokens.length > 0 && matched === tokens.length;
      const phoneMatch = last10(client.contactNo).length === 10 && phones.has(last10(client.contactNo));
      const pinMatch = pin && String(client.pin || '').trim() === pin;
      const cityMatch = city && normalizeForMatch(client.city) === city;

      if (!phoneMatch && !pinMatch && matched === 0) return null;

      const score =
        (phoneMatch ? 90 : 0) +
        (pinMatch ? 80 : 0) +
        (allTokens ? 40 : 0) +
        matched * 10 +
        (cityMatch ? 15 : 0);
      const strong = Boolean(phoneMatch || (pinMatch && matched >= 1));
      return { client, score, strong };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// Backwards-compatible wrapper
export function findSavedClientMatches(clients, recipient, recognizedText) {
  const withText = recipient?.meta?.receiverText
    ? recipient
    : { ...(recipient || {}), meta: { receiverText: recognizedText || '', phones: [] } };
  return rankSavedClientMatches(clients, withText).map(({ client }) => client);
}