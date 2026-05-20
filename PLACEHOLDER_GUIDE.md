# LendDocs — DOCX / XLSX Template Placeholder Guide

## How Templates Work

1. Open any existing DOCX (or XLSX) in Microsoft Word / Excel.
2. Replace dynamic values with the placeholders from this guide.
3. Upload the file via **Templates → Upload Template**.
4. When a document is generated, every `{{PLACEHOLDER}}` is replaced
   with the real value — fonts, styles, headers, footers, margins and
   layout are completely untouched.

---

## Delimiter Syntax

| Pattern | Use |
|---------|-----|
| `{{VAR}}` | Simple scalar replacement |
| `{#directors}…{/directors}` | Loop — repeats for each director |
| `{#cheques}…{/cheques}` | Loop — repeats for each cheque row |

---

## Lender Variables

| Placeholder | Example value |
|-------------|---------------|
| `{{LENDER_NAME}}` | PARSHWA SALES & SERVICES |
| `{{LENDER_PAN}}` | ABHFP2034K |
| `{{LENDER_ADDRESS}}` | 5704 B Wing Lodha Venezia, Mumbai 400 033 |

---

## Company (Borrower) Variables

| Placeholder | Example value |
|-------------|---------------|
| `{{COMPANY_NAME}}` | NIVRITI AGRO FOODS PRIVATE LIMITED |
| `{{COMPANY_PAN}}` | AAHCN9455C |
| `{{COMPANY_CIN}}` | U15400MH2018PTC308123 |
| `{{COMPANY_ADDRESS}}` | Plot 12, MIDC, Pune 411028 |
| `{{COMPANY_PHONE}}` | +91 20 2765 0001 |
| `{{COMPANY_EMAIL}}` | info@nivriti.com |

---

## Loan / Facility Variables

| Placeholder | Example value |
|-------------|---------------|
| `{{LOAN_AMOUNT}}` | 2000000 |
| `{{LOAN_AMOUNT_FMT}}` | RS. 20,00,000/- |
| `{{LOAN_AMOUNT_WORDS}}` | RUPEES TWENTY LAKHS ONLY |
| `{{INTEREST_AMOUNT}}` | 225000 |
| `{{INTEREST_AMOUNT_FMT}}` | RS. 2,25,000/- |
| `{{INTEREST_AMOUNT_WORDS}}` | RUPEES TWO LAKHS TWENTY FIVE THOUSAND ONLY |
| `{{NET_DISBURSED}}` | 1775000 |
| `{{NET_DISBURSED_FMT}}` | RS. 17,75,000/- |
| `{{NET_DISBURSED_WORDS}}` | RUPEES SEVENTEEN LAKHS SEVENTY FIVE THOUSAND ONLY |
| `{{RATE_PERCENT}}` | 2.25 |
| `{{TENURE_MONTHS}}` | 5 |

---

## Date Variables

| Placeholder | Example value |
|-------------|---------------|
| `{{REQUEST_DATE}}` | 01/03/2026 |
| `{{DISBURSEMENT_DATE}}` | 05/03/2026 |
| `{{BOARD_RES_DATE}}` | MONDAY, MARCH 3, 2026 |

---

## Payment Reference Variables

| Placeholder | Example value |
|-------------|---------------|
| `{{RTGS_NO}}` | UTIB226547891234 |
| `{{RTGS_BANK}}` | Axis Bank |
| `{{PLACE}}` | Mumbai |

---

## Director Variables — Individual (first 3 directors)

| Placeholder | Notes |
|-------------|-------|
| `{{DIRECTOR_1_NAME}}` | First director full name |
| `{{DIRECTOR_1_PAN}}` | First director PAN |
| `{{DIRECTOR_1_AADHAAR}}` | First director Aadhaar |
| `{{DIRECTOR_1_MOBILE}}` | First director mobile |
| `{{DIRECTOR_1_ADDRESS}}` | First director address |
| `{{DIRECTOR_2_NAME}}` | Second director (if any) |
| `{{DIRECTOR_2_PAN}}` | |
| `{{DIRECTOR_2_AADHAAR}}` | |
| `{{DIRECTOR_3_NAME}}` | Third director (if any) |

---

## Director Variables — Loop (for Board Resolution, Authority Letter, etc.)

Use when you want one line/block per director automatically:

```
{#directors}
{{DIRECTOR_NAME}}    {{DIRECTOR_PAN}}
{/directors}
```

| Inner placeholder | Meaning |
|-------------------|---------|
| `{{DIRECTOR_NAME}}` | Director full name |
| `{{DIRECTOR_PAN}}` | Director PAN |
| `{{DIRECTOR_AADHAAR}}` | Director Aadhaar |
| `{{DIRECTOR_MOBILE}}` | Director mobile |
| `{{DIRECTOR_ADDRESS}}` | Director address |

---

## Director Aggregate Variables

| Placeholder | Example value |
|-------------|---------------|
| `{{ALL_DIRECTOR_NAMES}}` | RAHUL SHARMA, PRIYA PATEL |
| `{{DIRECTOR_SIG_LINE}}` | (RAHUL SHARMA)     (PRIYA PATEL) |
| `{{DIRECTOR_AND_OR}}` | RAHUL SHARMA and/or PRIYA PATEL |

---

## Personal Undertaking Variables

The personal undertaking template is rendered **once per director**.
Inside the template, use:

| Placeholder | Meaning |
|-------------|---------|
| `{{DIRECTOR_NAME}}` | This specific director's name |
| `{{DIRECTOR_PAN}}` | This director's PAN |
| `{{DIRECTOR_AADHAAR}}` | This director's Aadhaar |
| `{{DIRECTOR_MOBILE}}` | This director's mobile |
| `{{DIRECTOR_ADDRESS}}` | This director's home address |
| `{{BORROWER_NAME}}` | Same as DIRECTOR_NAME (convenience alias) |

All company and loan variables are also available in this template.

---

## Cheque Variables — Loop

```
{#cheques}
{{SR_NO}}   {{CHEQUE_NO}}   {{CHEQUE_DATE}}   {{CHEQUE_AMOUNT}}
{/cheques}
```

| Inner placeholder | Meaning |
|-------------------|---------|
| `{{SR_NO}}` | Serial number (1, 2, 3 …) |
| `{{CHEQUE_NO}}` | Cheque number (blank if not entered) |
| `{{CHEQUE_DATE}}` | Cheque date in DD.MM.YYYY format |
| `{{CHEQUE_AMOUNT}}` | Amount in Indian number format |

Flat cheque variables (for fixed-row tables):

| Placeholder | Notes |
|-------------|-------|
| `{{CHQ1_NO}}` … `{{CHQ12_NO}}` | Cheque number for row n |
| `{{CHQ1_DATE}}` … `{{CHQ12_DATE}}` | Cheque date for row n |
| `{{CHQ1_AMOUNT}}` … `{{CHQ12_AMOUNT}}` | Cheque amount for row n |

Plain-text summary (single-cell insert):

| Placeholder | Meaning |
|-------------|---------|
| `{{CHEQUE_TABLE}}` | All cheques as plain text lines |

---

## XLSX Template Notes

- Use the same `{{PLACEHOLDER}}` syntax in cell values.
- Merged cells, borders, fill colours, column widths and row heights
  are **fully preserved** — only the text inside cells is replaced.
- For per-director sections in BoE / Promissory Note, use flat variables:
  `{{DIR1_NAME}}`, `{{DIR2_NAME}}`, `{{DIR1_AADHAAR}}` etc.

---

## Folder Structure

```
templates/
  borrowers/
    nivriti/
      request_letter.docx
      authority_letter.docx
      receipt.docx
      board_resolution.docx
      personal_undertaking.docx
      company_undertaking.docx
      bill_of_exchange.xlsx
      promissory_note.xlsx
    <another_borrower>/
      ...
generated/       ← auto-created ZIP files (auto-deleted after download)
uploads/
  logos/
  letterheads/
  signatures/
  stamps/
```

---

## Document Type Keys (used in API)

| Key | Document |
|-----|----------|
| `request_letter` | Request Letter |
| `authority_letter` | Authority Letter |
| `receipt` | Receipt |
| `board_resolution` | Board Resolution |
| `personal_undertaking` | Personal Undertaking (per director) |
| `company_undertaking` | Company Undertaking & Confirmation |
| `bill_of_exchange` | Bill of Exchange (XLSX) |
| `promissory_note` | Promissory Note / DP Note (XLSX) |

---

## Generation API

```
POST /api/generate
Content-Type: application/json

{
  "partyId": "uuid-of-party",        // optional — enables template mode
  "selectedDocs": ["request_letter", "receipt"],  // null = all
  "lender": {
    "name": "PARSHWA SALES & SERVICES",
    "pan":  "ABHFP2034K",
    "address": "5704 B Wing Lodha Venezia\nMumbai 400 033"
  },
  "company": {
    "name":    "NIVRITI AGRO FOODS PRIVATE LIMITED",
    "pan":     "AAHCN9455C",
    "cin":     "U15400MH2018PTC308123",
    "address": "Plot 12, MIDC, Pune 411028"
  },
  "directors": [
    { "name": "RAHUL SHARMA", "pan": "ABCDE1234F",
      "aadhaar": "1234 5678 9012", "mobile": "9876543210",
      "address": "42 Park Street, Mumbai 400001" }
  ],
  "loan": {
    "boeAmount":       2000000,
    "ratePercent":     2.25,
    "tenureMonths":    5,
    "requestDate":     "2026-03-01",
    "disbursementDate":"2026-03-05",
    "boardResDate":    "MONDAY, MARCH 3, 2026",
    "rtgsNo":          "UTIB226547891234",
    "rtgsBank":        "Axis Bank",
    "place":           "Mumbai"
  },
  "cheques": [
    { "no": "", "date": "05.04.2026", "amount": 400000 },
    { "no": "", "date": "05.05.2026", "amount": 400000 }
  ]
}
```

Response: `application/zip` stream containing all generated documents.


## Document Type Keys (used in API)

| Key | Document |
|-----|----------|
| `request_letter` | Request Letter |
| `authority_letter` | Authority Letter |
| `receipt` | Receipt |
| `board_resolution` | Board Resolution |
| `personal_undertaking` | Personal Undertaking (per director) |
| `company_undertaking` | Company Undertaking & Confirmation |
| `bill_of_exchange` | Bill of Exchange (XLSX) |
| `promissory_note` | Promissory Note / DP Note (XLSX) |

---

## Generation API

```
POST /api/generate
Content-Type: application/json

{
  "partyId": "uuid-of-party",
  "selectedDocs": ["request_letter", "receipt"],
  "lender":   { "name": "PARSHWA SALES & SERVICES", "pan": "ABHFP2034K", "address": "..." },
  "company":  { "name": "NIVRITI AGRO FOODS PVT LTD", "pan": "AAHCN9455C", "address": "..." },
  "directors": [{ "name": "RAHUL SHARMA", "pan": "ABCDE1234F", "aadhaar": "...", "mobile": "...", "address": "..." }],
  "loan": { "boeAmount": 2000000, "ratePercent": 2.25, "tenureMonths": 5,
            "requestDate": "2026-03-01", "disbursementDate": "2026-03-05",
            "boardResDate": "MONDAY, MARCH 3, 2026",
            "rtgsNo": "UTIB226547891234", "rtgsBank": "Axis Bank", "place": "Mumbai" },
  "cheques": [{ "no": "", "date": "05.04.2026", "amount": 400000 }]
}
```

Response: `application/zip` stream with all generated documents.
