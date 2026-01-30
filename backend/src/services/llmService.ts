import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import logger from '../logger.js';

const responseSchema: ResponseSchema = {
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

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
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
  const model = getModel();

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
  const model = getModel();

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
