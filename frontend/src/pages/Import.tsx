import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, History, FileSpreadsheet } from 'lucide-react';
import { ImportWizard } from '../components/ImportWizard';
import { useImportHistory } from '../hooks/useImport';

export function Import() {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const { data: history, isLoading: historyLoading } = useImportHistory();

  const handleComplete = () => {
    setShowWizard(false);
    navigate('/expenses');
  };

  const handleCancel = () => {
    setShowWizard(false);
  };

  if (showWizard) {
    return (
      <div className="py-6">
        <ImportWizard onComplete={handleComplete} onCancel={handleCancel} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Import Expenses</h1>
      </div>

      {/* Import Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <FileSpreadsheet className="mx-auto h-16 w-16 text-indigo-400" />
          <h2 className="mt-4 text-xl font-medium text-gray-900">
            Bulk Import from CSV
          </h2>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Import multiple expenses at once from a CSV file. Our wizard will guide you
            through mapping columns, previewing data, and validating entries before import.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Upload className="w-5 h-5 mr-2" />
              Start Import
            </button>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-gray-200 pt-8">
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-indigo-100">
              <span className="text-indigo-600 font-semibold">1</span>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Upload CSV</h3>
            <p className="mt-1 text-xs text-gray-500">
              Auto-detects delimiter and suggests column mapping
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-indigo-100">
              <span className="text-indigo-600 font-semibold">2</span>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Preview & Validate</h3>
            <p className="mt-1 text-xs text-gray-500">
              Review data, fix errors, or skip invalid rows
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-full bg-indigo-100">
              <span className="text-indigo-600 font-semibold">3</span>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Import</h3>
            <p className="mt-1 text-xs text-gray-500">
              Confirm and import all valid expenses at once
            </p>
          </div>
        </div>
      </div>

      {/* Import History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <History className="w-5 h-5 mr-2 text-gray-400" />
            Import History
          </h2>
        </div>
        <div className="p-6">
          {historyLoading ? (
            <div className="text-center py-4 text-gray-500">Loading...</div>
          ) : history && history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      File
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Imported
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Skipped
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.fileName}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-green-600 font-medium">{item.importedRows}</span>
                        <span className="text-gray-400"> / {item.totalRows}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.skippedRows}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm">No import history yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
