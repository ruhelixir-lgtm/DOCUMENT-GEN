'use strict';
/**
 * Indian number-to-words converter
 * Handles values up to 99,99,99,999 (99 crore)
 * Returns uppercase: "RUPEES TWENTY LAKHS ONLY"
 */

const ONES = ['','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE',
  'TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'];
const TENS = ['','','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  return (TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')).trim();
}

function threeDigits(n) {
  if (n === 0) return '';
  if (n < 100) return twoDigits(n);
  return ONES[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' ' + twoDigits(n % 100) : '');
}

function toWords(amount) {
  const n = Math.round(Number(amount) || 0);
  if (n === 0) return 'RUPEES ZERO ONLY';

  const crore  = Math.floor(n / 10000000);
  const lakh   = Math.floor((n % 10000000) / 100000);
  const thou   = Math.floor((n % 100000)   / 1000);
  const rest   = n % 1000;

  const parts = [];
  if (crore) parts.push(threeDigits(crore) + ' CRORE');
  if (lakh)  parts.push(twoDigits(lakh)    + ' LAKHS');
  if (thou)  parts.push(twoDigits(thou)    + ' THOUSAND');
  if (rest)  parts.push(threeDigits(rest));

  return 'RUPEES ' + parts.join(' ') + ' ONLY';
}

function fmtRs(n) {
  return `RS. ${Number(n).toLocaleString('en-IN')}/-`;
}

module.exports = { toWords, fmtRs };
