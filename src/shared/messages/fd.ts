/**
 * FD: field format messages (BPD §25.2). Text must match the BPD exactly.
 * {Field} is replaced by the field's on-screen label.
 */
export const FD_MESSAGES = {
  'FD-01': 'Enter an email address.',
  'FD-02': 'Enter a valid email address, like name@company.com.',
  'FD-03': 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.',
  'FD-04': 'Enter a name.',
  'FD-05': "Name must be 2–60 characters using letters, spaces, dots (.), apostrophes (') or hyphens (-).",
  'FD-06': '{Field} must be {min}–{max} characters.',
  'FD-07': '{Field} is required.',
  'FD-08': '{Field} can be at most {max} characters. You have {count}.',
  'FD-09': 'Enter a full web address starting with https://, like https://example.com/offer.',
  'FD-10': "This address uses http://, which isn't secure. Use https:// if the page supports it.",
  'FD-11': 'Enter an amount in rupees greater than 0, with up to 2 decimals (for example 1499 or 1499.50).',
  'FD-12': 'Enter a valid date in DD/MM/YYYY format.',
  'FD-13': 'Choose today or a later date.',
  'FD-14': 'Choose a date within {max} days from today.',
  'FD-15': 'Enter the {n}-digit code from the email.',
  'FD-16': 'Password must be 6–64 characters, with no space at the start or end.',
  'FD-17': "{fileName} can't be uploaded. Allowed types: {typeList}.",
  'FD-18': '{fileName} is {size}. The largest file allowed on your plan is {max}.',
  'FD-19': "{fileName} is empty (0 bytes) and can't be uploaded.",
  'FD-20': '{fileName} has a name longer than 200 characters. Rename it and try again.',
  'FD-21': 'Logo must be a PNG, JPG or WebP image of at most {max} and at least 64 × 64 pixels.',
  'FD-22': 'Enter a colour as # followed by 6 letters or digits, like #1A73E8.',
  'FD-23': 'Choose a {field} from the list.',
  'FD-24': 'Tags can use lower-case letters, numbers and hyphens, 1–30 characters.',
  'FD-25': 'You can add up to {max} {items}.',
  'FD-26':
    'Enter a valid 15-character GSTIN, like 29ABCDE1234F1Z5. The first 2 digits must match your billing state.',
  'FD-27': 'Enter a valid 6-digit PIN code.',
  'FD-28': 'A {item} named “{value}” already exists here. Choose a different name.',
  'FD-29': 'Enter a whole number from {min} to {max}.',
  'FD-30': "{Field} can't contain these characters: {chars}",
  'FD-31':
    'Use only lower-case letters, numbers, hyphens (-), underscores (_) and dots (.), up to 100 characters.',
  'FD-32': 'Type at least {n} characters to search.',
} as const;
