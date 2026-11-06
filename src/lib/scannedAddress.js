const INDIAN_STATES_AND_TERRITORIES = [
  'andaman and nicobar islands',
  'andhra pradesh',
  'arunachal pradesh',
  'dadra and nagar haveli and daman and diu',
  'himachal pradesh',
  'jammu and kashmir',
  'madhya pradesh',
  'tamil nadu',
  'uttar pradesh',
  'west bengal',
  'assam',
  'bihar',
  'chandigarh',
  'chhattisgarh',
  'delhi',
  'goa',
  'gujarat',
  'haryana',
  'jharkhand',
  'karnataka',
  'kerala',
  'ladakh',
  'lakshadweep',
  'maharashtra',
  'manipur',
  'meghalaya',
  'mizoram',
  'nagaland',
  'odisha',
  'punjab',
  'rajasthan',
  'sikkim',
  'telangana',
  'tripura',
  'uttarakhand',
];

const HEADER_LINE =
  /^(?:to|ship\s*to|deliver\s*to|consignee|recipient|receiver|shipping\s*address|delivery\s*address)\s*:?\s*$/i;
const PHONE_LINE = /^(?:phone|mobile|contact|tel|telephone)\s*[:#-]?\s*$/i;

const cleanLine = (line) =>
  line.replace(/[\t ]+/g, ' ').replace(/^[,;|/-]+|[,;|/-]+$/g, '').trim();

function findPhone(lines) {
  for (const line of lines) {
    const match = line.match(
      /(?:^|\D)((?:\+?91[\s().-]?)?[6-9](?:[\s().-]*\d){9})(?!\d)/
    );
    if (!match) continue;

    const digits = match[1].replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
  }
  return '';
}

function findLocation(lines) {
  const pinIndex = lines.findIndex((line) => /\b[1-9]\d{5}\b/.test(line));
  if (pinIndex === -1) return { pin: '', city: '', state: '', pinIndex: -1 };

  const pin = lines[pinIndex].match(/\b[1-9]\d{5}\b/)[0];
  const locationLine = cleanLine(
    lines[pinIndex]
      .replace(pin, '')
      .replace(/^(?:pin(?:\s*code)?|postal\s*code)\s*[:#-]?\s*/i, '')
      .replace(/\s*(?:pin(?:\s*code)?|postal\s*code)\s*[:#-]?\s*$/i, '')
  )
    .replace(/^[,;|/-]+|[,;|/-]+$/g, '')
    .trim();

  const normalizedLocation = locationLine.toLowerCase();
  const state = INDIAN_STATES_AND_TERRITORIES.find((candidate) =>
    normalizedLocation.endsWith(candidate)
  );

  if (state) {
    const city = cleanLine(locationLine.slice(0, -state.length))
      .replace(/^[,;|/-]+|[,;|/-]+$/g, '')
      .trim();
    return {
      pin,
      city: city || '',
      state: locationLine.slice(-state.length).trim(),
      pinIndex,
    };
  }

  const parts = locationLine
    .split(/[,|]/)
    .map(cleanLine)
    .filter(Boolean);

  if (parts.length > 1) {
    return {
      pin,
      city: parts[parts.length - 2],
      state: parts[parts.length - 1],
      pinIndex,
    };
  }

  return { pin, city: locationLine, state: '', pinIndex };
}

export function extractScannedAddress(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const result = {
    name: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    contactNo: '',
  };

  if (!lines.length) return result;

  const location = findLocation(lines);
  result.pin = location.pin;
  result.city = location.city;
  result.state = location.state;
  result.contactNo = findPhone(lines);

  let nameIndex = lines.findIndex((line) => {
    const match = line.match(
      /^(?:recipient\s+name|receiver\s+name|ship\s+to|deliver\s+to|consignee|recipient|receiver|name|to)\s*[:#-]\s*(.+)$/i
    );
    if (match) {
      result.name = cleanLine(match[1]);
      return true;
    }
    return false;
  });

  if (!result.name) {
    nameIndex = lines.findIndex((line) => {
      if (HEADER_LINE.test(line) || PHONE_LINE.test(line)) return false;
      if (/\b[1-9]\d{5}\b/.test(line)) return false;
      if (/^(?:address|mobile|phone|contact|email)\s*[:#-]/i.test(line)) {
        return false;
      }
      if (/\b(?:road|street|st\.|lane|nagar|colony|layout|sector|plot|flat|floor)\b/i.test(line)) {
        return false;
      }
      if (/\d/.test(line) && !/^(?:mr|mrs|ms|miss|dr)\.?\s/i.test(line)) {
        return false;
      }
      return true;
    });

    if (nameIndex !== -1) {
      result.name = lines[nameIndex].replace(
        /^(?:name|recipient|receiver|consignee|company)\s*[:#-]\s*/i,
        ''
      );
    }
  }

  const addressLines = [];
  const normalizedCityState = [result.city, result.state]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  lines.forEach((line, index) => {
    if (index === nameIndex || HEADER_LINE.test(line) || PHONE_LINE.test(line)) {
      return;
    }

    if (
      result.contactNo &&
      line.replace(/\D/g, '').includes(result.contactNo.replace(/\D/g, ''))
    ) {
      return;
    }

    if (/^(?:phone|mobile|contact|tel|telephone)\s*[:#-]/i.test(line)) {
      return;
    }

    let addressLine = line.replace(
      /^(?:address|street address|delivery address)\s*[:#-]\s*/i,
      ''
    );

    if (/\b[1-9]\d{5}\b/.test(addressLine)) {
      addressLine = addressLine
        .replace(/\b[1-9]\d{5}\b/, '')
        .replace(/^(?:pin(?:\s*code)?|postal\s*code)\s*[:#-]?\s*/i, '')
        .replace(/\s*(?:pin(?:\s*code)?|postal\s*code)\s*[:#-]?\s*$/i, '')
        .trim();
    }

    addressLine = cleanLine(addressLine);
    if (
      index === location.pinIndex &&
      normalizedCityState &&
      addressLine.toLowerCase().replace(/[^a-z0-9]+/g, '') ===
        normalizedCityState
    ) {
      return;
    }

    if (addressLine) addressLines.push(addressLine);
  });

  if (!result.name && addressLines.length) {
    result.name = addressLines.shift();
  }

  result.address = addressLines.join('\n');
  return result;
}

const normalizeForMatch = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function findSavedClientMatches(clients, recipient, recognizedText) {
  const searchableText = normalizeForMatch(
    `${recognizedText || ''} ${recipient?.name || ''}`
  );
  const searchableDigits = String(recognizedText || '').replace(/\D/g, '');

  return (Array.isArray(clients) ? clients : [])
    .map((client) => {
      const name = normalizeForMatch(client.name);
      const nameTokens = name.split(' ').filter((token) => token.length >= 4);
      const matchedTokens = nameTokens.filter((token) =>
        searchableText.includes(token)
      ).length;
      const fullNameMatch = name.length >= 4 && searchableText.includes(name);
      const phone = String(client.contactNo || '').replace(/\D/g, '');
      const phoneMatch = phone.length >= 10 && searchableDigits.includes(phone);

      if (!fullNameMatch && !phoneMatch && matchedTokens === 0) return null;

      return {
        client,
        score: (fullNameMatch ? 100 : 0) + (phoneMatch ? 90 : 0) + matchedTokens,
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.score - first.score)
    .slice(0, 5)
    .map(({ client }) => client);
}
