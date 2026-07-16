import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(projectRoot, 'src');
const languages = ['en', 'vi'];

const walkFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });

const loadLanguage = (language) => {
  const localeDirectory = path.join(sourceRoot, 'locales', language);
  return Object.fromEntries(
    fs.readdirSync(localeDirectory)
      .filter((file) => file.endsWith('.json'))
      .map((file) => [
        path.basename(file, '.json'),
        JSON.parse(fs.readFileSync(path.join(localeDirectory, file), 'utf8')),
      ]),
  );
};

const flattenKeys = (object, prefix = '', output = []) => {
  for (const [key, value] of Object.entries(object)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, fullKey, output);
    } else {
      output.push(fullKey);
    }
  }
  return output;
};

const resources = Object.fromEntries(languages.map((language) => [language, loadLanguage(language)]));
const resourceKeySets = Object.fromEntries(
  languages.map((language) => [language, new Set(flattenKeys(resources[language]))]),
);
const sourceFiles = walkFiles(sourceRoot)
  .filter((file) => /\.(js|jsx)$/.test(file) && !file.includes(`${path.sep}locales${path.sep}`));
const staticTranslationKeys = new Set();
const translationCall = /(?:\b|\.)t\(\s*['"]([^'"]+)['"]/g;

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = translationCall.exec(source))) staticTranslationKeys.add(match[1]);
}

const errors = [];
for (const language of languages) {
  const missing = [...staticTranslationKeys]
    .filter((key) => !resourceKeySets[language].has(key))
    .sort();
  if (missing.length) errors.push(`${language} is missing called keys:\n  ${missing.join('\n  ')}`);
}

const [baseLanguage, ...comparedLanguages] = languages;
for (const language of comparedLanguages) {
  const missingFromLanguage = [...resourceKeySets[baseLanguage]]
    .filter((key) => !resourceKeySets[language].has(key))
    .sort();
  const extraInLanguage = [...resourceKeySets[language]]
    .filter((key) => !resourceKeySets[baseLanguage].has(key))
    .sort();
  if (missingFromLanguage.length) {
    errors.push(`${language} is missing ${baseLanguage} keys:\n  ${missingFromLanguage.join('\n  ')}`);
  }
  if (extraInLanguage.length) {
    errors.push(`${language} has keys absent from ${baseLanguage}:\n  ${extraInLanguage.join('\n  ')}`);
  }
}

if (errors.length) {
  console.error(`[i18n] Validation failed:\n${errors.join('\n\n')}`);
  process.exitCode = 1;
} else {
  console.log(`[i18n] ${staticTranslationKeys.size} called keys validated for: ${languages.join(', ')}`);
}