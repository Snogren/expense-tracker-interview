import { useState, useRef } from 'react';
import { Mail, FileText, Sparkles, Check, AlertCircle, ArrowRight, Upload } from 'lucide-react';
import { useAnalyzeReceipt, useAnalyzePdfReceipt } from '../hooks/useReceiptAnalysis';
import { useCreateExpense } from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import type { ExtractedReceiptData } from '../types';

type Step = 'input' | 'preview' | 'success';
type InputMode = 'text' | 'pdf';

export function EmailReceipt() {
  const [step, setStep] = useState<Step>('input');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [emailContent, setEmailContent] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [editedData, setEditedData] = useState<{
    categoryId: number;
    amount: number;
    description: string;
    date: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeReceipt = useAnalyzeReceipt();
  const analyzePdfReceipt = useAnalyzePdfReceipt();
  const createExpense = useCreateExpense();
  const { data: categories } = useCategories();

  const isAnalyzing = analyzeReceipt.isPending || analyzePdfReceipt.isPending;
  const analysisError = analyzeReceipt.isError || analyzePdfReceipt.isError;
  const analysisResult = analyzeReceipt.data || analyzePdfReceipt.data;
  const noReceiptDetected = analysisResult && !analysisResult.isReceipt;

  const handleAnalyze = () => {
    const onSuccess = (result: { isReceipt: boolean; data: ExtractedReceiptData | null }) => {
      if (result.isReceipt && result.data) {
        setExtractedData(result.data);
        setEditedData({
          categoryId: result.data.categoryId,
          amount: result.data.amount,
          description: result.data.description,
          date: result.data.date,
        });
        setStep('preview');
      }
    };

    if (inputMode === 'text') {
      analyzeReceipt.mutate(emailContent, { onSuccess });
    } else if (pdfFile) {
      analyzePdfReceipt.mutate(pdfFile, { onSuccess });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  };

  const handleImport = () => {
    if (!editedData) return;

    createExpense.mutate(editedData, {
      onSuccess: () => {
        setStep('success');
      },
    });
  };

  const handleReset = () => {
    setStep('input');
    setEmailContent('');
    setPdfFile(null);
    setExtractedData(null);
    setEditedData(null);
    analyzeReceipt.reset();
    analyzePdfReceipt.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canAnalyze = inputMode === 'text' ? emailContent.trim() : pdfFile;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import from Receipt</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste email text or upload a PDF receipt and we'll automatically extract the expense details using AI.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center space-x-4">
        {['Input', 'Preview', 'Done'].map((label, index) => {
          const stepIndex = ['input', 'preview', 'success'].indexOf(step);
          const isActive = index === stepIndex;
          const isCompleted = index < stepIndex;

          return (
            <div key={label} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`ml-2 text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {label}
              </span>
              {index < 2 && <ArrowRight className="w-4 h-4 mx-4 text-gray-300" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Input */}
      {step === 'input' && (
        <div className="bg-white shadow rounded-lg p-6">
          {/* Input mode tabs */}
          <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 mb-6">
            <button
              onClick={() => setInputMode('text')}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                inputMode === 'text'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Text
            </button>
            <button
              onClick={() => setInputMode('pdf')}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                inputMode === 'pdf'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF Receipt
            </button>
          </div>

          <div className="space-y-4">
            {/* Text input */}
            {inputMode === 'text' && (
              <div>
                <label htmlFor="emailContent" className="block text-sm font-medium text-gray-700 mb-2">
                  Paste Email Content
                </label>
                <textarea
                  id="emailContent"
                  rows={12}
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Paste the full email content here, including headers if available..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-3"
                />
              </div>
            )}

            {/* PDF upload */}
            {inputMode === 'pdf' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload PDF Receipt
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    pdfFile
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {pdfFile ? (
                    <div className="space-y-2">
                      <FileText className="w-12 h-12 mx-auto text-indigo-500" />
                      <p className="text-sm font-medium text-gray-900">{pdfFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(pdfFile.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPdfFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PDF files only (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error states */}
            {analysisError && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      Failed to analyze {inputMode === 'text' ? 'email' : 'PDF'}. Please try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {noReceiptDetected && (
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      No receipt detected. Please try a different {inputMode === 'text' ? 'email' : 'PDF'}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || isAnalyzing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && extractedData && editedData && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Review Extracted Data</h2>
          <p className="text-sm text-gray-500 mb-6">
            We extracted the following details. You can edit them before importing.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Merchant</label>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md px-3 py-2">
                  {extractedData.merchant}
                </p>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="amount"
                    step="0.01"
                    value={editedData.amount}
                    onChange={(e) => setEditedData({ ...editedData, amount: parseFloat(e.target.value) || 0 })}
                    className="block w-full pl-7 pr-3 py-2 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={editedData.date}
                  onChange={(e) => setEditedData({ ...editedData, date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="category"
                  value={editedData.categoryId}
                  onChange={(e) => setEditedData({ ...editedData, categoryId: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                >
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                id="description"
                value={editedData.description}
                onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Start Over
            </button>
            <button
              onClick={handleImport}
              disabled={createExpense.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {createExpense.isPending ? 'Importing...' : 'Import Expense'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 'success' && (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Expense Imported!</h2>
          <p className="mt-2 text-sm text-gray-500">
            The expense has been added to your account successfully.
          </p>
          <div className="mt-6">
            <button
              onClick={handleReset}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Import Another Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
