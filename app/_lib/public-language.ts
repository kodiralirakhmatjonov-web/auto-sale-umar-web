export type PublicLanguage = "ru" | "uz" | "uz-cyrl";

const PROTECTED_TERMS = [
  "Auto Sale Umar",
  "AUTO SALE UMAR",
  "AutoSale Umar",
  "AUTOSALE UMAR",
  "IT Team",
  "IT TEAM",
  "TV Mode",
  "Control System",
  "Selected with precision.",
  "SELECTED",
  "COMPARE",
  "iPad",
  "Abdulaziz.developer",
  "Ramadan Gift",
  "RAMADAN GIFT",
  "Instagram",
  "Telegram",
  "WhatsApp",
  "YouTube",
  "Yandex",
  "Mercedes-Benz",
  "E-Class",
  "Range Rover",
  "Rolls-Royce",
  "Cadillac",
  "Lexus",
  "Toyota",
  "Genesis",
  "BMW",
  "Lamborghini",
  "Porsche",
  "USD",
  "UZS",
  "EUR",
] as const;

const CYRILLIC_CACHE = new Map<string, string>();
const COPY_CACHE = new WeakMap<object, unknown>();

export function isPublicLanguage(value: unknown): value is PublicLanguage {
  return value === "ru" || value === "uz" || value === "uz-cyrl";
}

export function publicLocale(language: PublicLanguage): string {
  if (language === "ru") return "ru-RU";
  if (language === "uz-cyrl") return "uz-Cyrl-UZ";
  return "uz-UZ";
}

export function publicHtmlLang(language: PublicLanguage): string {
  if (language === "ru") return "ru";
  if (language === "uz-cyrl") return "uz-Cyrl";
  return "uz-Latn";
}

export function publicContentLanguage(language: PublicLanguage): "ru" | "uz" {
  return language === "ru" ? "ru" : "uz";
}

export function uiText(language: PublicLanguage, russian: string, uzbekLatin: string): string {
  if (language === "ru") return russian;
  if (language === "uz-cyrl") return toUzbekCyrillic(uzbekLatin);
  return uzbekLatin;
}

export function copyForLanguage<T extends { ru: unknown; uz: unknown }>(
  copy: T,
  language: PublicLanguage,
): T["ru"] | T["uz"] {
  if (language === "ru") return copy.ru;
  if (language === "uz") return copy.uz;
  return cyrillicizeValue(copy.uz) as T["uz"];
}

export function toUzbekCyrillic(value: string): string {
  const cached = CYRILLIC_CACHE.get(value);
  if (cached != null) return cached;

  const protectedValues: string[] = [];
  const protect = (source: string): string => {
    protectedValues.push(source);
    return `\uE000${protectedValues.length - 1}\uE001`;
  };

  let input = value
    .replace(/https?:\/\/[^\s)]+/gi, protect)
    .replace(/\b[a-z0-9._%+-]+\.(?:app|com|net|org|uz)\b/gi, protect)
    .replace(/@[a-z0-9_]+/gi, protect);

  for (const term of PROTECTED_TERMS) {
    input = input.split(term).join(protect(term));
  }

  let output = "";
  for (let index = 0; index < input.length; index += 1) {
    const current = input[index];

    if (current === "\uE000") {
      const end = input.indexOf("\uE001", index + 1);
      if (end !== -1) {
        output += input.slice(index, end + 1);
        index = end;
        continue;
      }
    }

    const pair = input.slice(index, index + 2);
    const pairLower = pair.toLocaleLowerCase("en-US");

    // In Uzbek Latin, yo‘ is y + o‘ (йў), not the Russian-style yo (ё).
    // Handle the y separately and let the next loop consume o‘ as ў.
    if ((current === "y" || current === "Y") && isOQuote(input.slice(index + 1, index + 3).toLocaleLowerCase("en-US"))) {
      output += current === "Y" ? "Й" : "й";
      continue;
    }

    if (isOQuote(pairLower)) {
      output += applyCase(pair, "ў");
      index += 1;
      continue;
    }
    if (isGQuote(pairLower)) {
      output += applyCase(pair, "ғ");
      index += 1;
      continue;
    }

    const digraph = DIGRAPHS[pairLower as keyof typeof DIGRAPHS];
    if (digraph) {
      output += applyCase(pair, digraph);
      index += 1;
      continue;
    }

    if (current === "e" || current === "E") {
      const previous = index > 0 ? input[index - 1] : "";
      const mapped = shouldUseOpenE(previous) ? "э" : "е";
      output += current === "E" ? mapped.toLocaleUpperCase("uz-Cyrl-UZ") : mapped;
      continue;
    }

    if (isApostrophe(current)) {
      output += "ъ";
      continue;
    }

    const lower = current.toLocaleLowerCase("en-US");
    const mapped = SINGLE[lower as keyof typeof SINGLE];
    if (mapped) {
      output += current === current.toLocaleUpperCase("en-US") && current !== lower
        ? mapped.toLocaleUpperCase("uz-Cyrl-UZ")
        : mapped;
      continue;
    }

    output += current;
  }

  let restored = output.replace(/\uE000(\d+)\uE001/g, (_match, number: string) => protectedValues[Number(number)] ?? "");
  for (const term of PROTECTED_TERMS) restored = restored.split(`${term}ъ`).join(`${term}’`);
  restored = applyUzbekCyrillicWordFixes(restored);
  CYRILLIC_CACHE.set(value, restored);
  return restored;
}

const DIGRAPHS = {
  sh: "ш",
  ch: "ч",
  ts: "ц",
  ya: "я",
  yo: "ё",
  yu: "ю",
  ye: "е",
} as const;

const SINGLE = {
  a: "а",
  b: "б",
  c: "ц",
  d: "д",
  f: "ф",
  g: "г",
  h: "ҳ",
  i: "и",
  j: "ж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "қ",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "в",
  x: "х",
  y: "й",
  z: "з",
} as const;

function isApostrophe(value: string): boolean {
  return value === "'" || value === "’" || value === "‘" || value === "ʻ" || value === "ʼ" || value === "`";
}

function isOQuote(value: string): boolean {
  return value.length === 2 && value[0] === "o" && isApostrophe(value[1]);
}

function isGQuote(value: string): boolean {
  return value.length === 2 && value[0] === "g" && isApostrophe(value[1]);
}

function shouldUseOpenE(previous: string): boolean {
  if (!previous) return true;
  if (!/[A-Za-z]/.test(previous)) return true;
  const lower = previous.toLocaleLowerCase("en-US");
  return lower === "a" || lower === "e" || lower === "i" || lower === "o" || lower === "u";
}

function applyCase(source: string, mapped: string): string {
  if (source === source.toLocaleUpperCase("en-US")) return mapped.toLocaleUpperCase("uz-Cyrl-UZ");
  if (source[0] === source[0].toLocaleUpperCase("en-US")) {
    return mapped[0].toLocaleUpperCase("uz-Cyrl-UZ") + mapped.slice(1);
  }
  return mapped;
}


function applyUzbekCyrillicWordFixes(value: string): string {
  return value
    .split("Интерер").join("Интерьер")
    .split("интерер").join("интерьер")
    .split("Ссенарий").join("Сценарий")
    .split("ссенарий").join("сценарий")
    .split("Коллексия").join("Коллекция")
    .split("коллексия").join("коллекция")
    .split("Буджет").join("Бюджет")
    .split("буджет").join("бюджет")
    .split("Филтр").join("Фильтр")
    .split("филтр").join("фильтр")
    .split("Опсия").join("Опция")
    .split("опсия").join("опция");
}

function cyrillicizeValue(value: unknown): unknown {
  if (typeof value === "string") return toUzbekCyrillic(value);
  if (typeof value === "function") {
    return (...args: unknown[]) => cyrillicizeValue((value as (...fnArgs: unknown[]) => unknown)(...args));
  }
  if (Array.isArray(value)) return value.map((item) => cyrillicizeValue(item));
  if (value && typeof value === "object") {
    const cached = COPY_CACHE.get(value as object);
    if (cached) return cached;
    const output: Record<string, unknown> = {};
    COPY_CACHE.set(value as object, output);
    for (const [key, nested] of Object.entries(value)) output[key] = cyrillicizeValue(nested);
    return output;
  }
  return value;
}
