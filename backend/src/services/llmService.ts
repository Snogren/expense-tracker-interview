import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import logger from '../logger.js';
import type { Email } from './mockEmailService.js';

const receiptAnalysisSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isReceipt: { type: SchemaType.BOOLEAN },
    data: {
      type: SchemaType.OBJECT,
      nullable: true,
      properties: {
        merchant: { type: SchemaType.STRING },
        amount: { type: SchemaType.NUMBER },
        date: { type: SchemaType.STRING },
        category: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
      },
      required: ['merchant', 'amount', 'date', 'category', 'description'],
    },
  },
  required: ['isReceipt', 'data'],
};

const emailFilterSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    receiptEmailIds: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ['receiptEmailIds'],
};

const batchExtractSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    expenses: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          emailId: { type: SchemaType.STRING },
          merchant: { type: SchemaType.STRING },
          amount: { type: SchemaType.NUMBER },
          date: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
        },
        required: ['emailId', 'merchant', 'amount', 'date', 'category', 'description'],
      },
    },
  },
  required: ['expenses'],
};

function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

function getReceiptAnalysisModel() {
  return getGenAI().getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: receiptAnalysisSchema,
    },
  });
}

function getEmailFilterModel() {
  return getGenAI().getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: emailFilterSchema,
    },
  });
}

function getBatchExtractModel() {
  return getGenAI().getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: batchExtractSchema,
    },
  });
}

export interface ExtractedReceiptData {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  description: string;
}

export interface ReceiptAnalysisResult {
  isReceipt: boolean;
  data: ExtractedReceiptData | null;
}

const VALID_CATEGORIES = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Bills', 'Other'];

const RECEIPT_PROMPT_BASE = `Analyze this content and determine if it contains a purchase receipt or order confirmation.
If yes, extract:
- merchant/vendor name
- total amount (number only, no currency symbol)
- purchase date (YYYY-MM-DD format)
- suggested category (must be exactly one of: ${VALID_CATEGORIES.join(', ')})
- brief description of what was purchased

If it's not a receipt or you cannot extract the required information, set isReceipt to false and data to null.`;

export async function analyzeEmailForReceipt(emailContent: string): Promise<ReceiptAnalysisResult> {
  const model = getReceiptAnalysisModel();

  const prompt = `${RECEIPT_PROMPT_BASE}

Email content:
---
${emailContent}
---`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as ReceiptAnalysisResult;

    logger.info({ isReceipt: parsed.isReceipt, merchant: parsed.data?.merchant }, 'Email analyzed');

    return parsed;
  } catch (error) {
    logger.error({ err: error }, 'Failed to analyze email with LLM');
    throw new Error('Failed to analyze email content');
  }
}

export async function analyzePdfForReceipt(pdfBuffer: Buffer): Promise<ReceiptAnalysisResult> {
  const model = getReceiptAnalysisModel();

  const prompt = `${RECEIPT_PROMPT_BASE}

The content is a PDF receipt/invoice. Extract the purchase details from it.`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBuffer.toString('base64'),
        },
      },
    ]);
    const text = result.response.text();
    const parsed = JSON.parse(text) as ReceiptAnalysisResult;

    logger.info({ isReceipt: parsed.isReceipt, merchant: parsed.data?.merchant }, 'PDF analyzed');

    return parsed;
  } catch (error) {
    logger.error({ err: error }, 'Failed to analyze PDF with LLM');
    throw new Error('Failed to analyze PDF content');
  }
}

export interface EmailFilterResult {
  receiptEmailIds: string[];
}

export async function filterReceiptEmails(emails: Email[]): Promise<string[]> {
  const model = getEmailFilterModel();

  const emailSummaries = emails.map((e) => ({
    id: e.id,
    from: e.from,
    subject: e.subject,
    preview: e.body.substring(0, 200),
  }));

  const prompt = `Analyze these emails and identify which ones contain purchase receipts, order confirmations, or payment confirmations.

Return ONLY the IDs of emails that contain actual transaction/purchase information (receipts, order confirmations, subscription payments, etc.).
Do NOT include promotional emails, newsletters, or marketing emails even if they mention prices.

Emails:
${JSON.stringify(emailSummaries, null, 2)}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as EmailFilterResult;

    logger.info({ count: parsed.receiptEmailIds.length }, 'Filtered receipt emails');

    return parsed.receiptEmailIds;
  } catch (error) {
    logger.error({ err: error }, 'Failed to filter emails with LLM');
    throw new Error('Failed to filter emails');
  }
}

export interface ExtractedEmailExpense {
  emailId: string;
  merchant: string;
  amount: number;
  date: string;
  category: string;
  description: string;
}

export interface BatchExtractResult {
  expenses: ExtractedEmailExpense[];
}

export async function extractExpensesFromEmails(emails: Email[]): Promise<ExtractedEmailExpense[]> {
  const model = getBatchExtractModel();

  const emailData = emails.map((e) => ({
    id: e.id,
    from: e.from,
    subject: e.subject,
    date: e.date,
    body: e.body,
  }));

  const prompt = `Extract expense/purchase information from these receipt emails.

For each email, extract:
- emailId: the email's id
- merchant: company/vendor name
- amount: total amount paid (number only, no currency symbol)
- date: purchase date in YYYY-MM-DD format
- category: one of: ${VALID_CATEGORIES.join(', ')}
- description: brief description of what was purchased

Emails:
${JSON.stringify(emailData, null, 2)}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as BatchExtractResult;

    logger.info({ count: parsed.expenses.length }, 'Extracted expenses from emails');

    return parsed.expenses;
  } catch (error) {
    logger.error({ err: error }, 'Failed to extract expenses from emails with LLM');
    throw new Error('Failed to extract expenses from emails');
  }
}
