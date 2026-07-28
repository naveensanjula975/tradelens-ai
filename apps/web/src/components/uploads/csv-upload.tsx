'use client';

import React, { useState } from 'react';
import {
  CSVImportType,
  CSVImportValidationError,
  CSVUploadError,
  uploadCSV,
} from '@/lib/api-client';
import { Upload, FileCheck, AlertCircle } from 'lucide-react';

interface CSVUploadModalProps {
  onSuccess: () => void;
}

export function CSVUploadModal({ onSuccess }: CSVUploadModalProps) {
  const [fileType, setFileType] = useState<CSVImportType>('positions');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<CSVImportValidationError[]>([]);
  const [loading, setLoading] = useState(false);

  const resetFeedback = () => {
    setStatus(null);
    setErrors([]);
  };

  const handleTypeChange = (type: CSVImportType) => {
    setFileType(type);
    setSelectedFile(null);
    resetFeedback();
  };

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    resetFeedback();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    resetFeedback();
    try {
      const res = await uploadCSV(fileType, selectedFile);
      setStatus(`${res.message}: ${res.imported_count} ${res.file_type} record${res.imported_count === 1 ? '' : 's'}`);
      setSelectedFile(null);
      onSuccess();
    } catch (error: unknown) {
      if (error instanceof CSVUploadError) {
        setStatus(error.message);
        setErrors(error.errors);
      } else if (error instanceof Error) {
        setStatus(error.message);
      } else {
        setStatus('Upload failed due to an unexpected error.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-5 h-5 text-blue-400" />
        <h4 className="font-bold text-sm text-white">Import Fragmented Trade Data (CSV)</h4>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['positions', 'inventory', 'shipments'] as const).map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              fileType === type
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center hover:border-gray-500 transition-colors mb-4">
        <input
          key={fileType}
          type="file"
          accept=".csv"
          onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
          className="hidden"
          id="csv-file-input"
        />
        <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-gray-500" />
          <span className="text-xs text-gray-300 font-medium">
            {selectedFile ? selectedFile.name : `Select ${fileType}.csv to upload`}
          </span>
          <span className="text-[10px] text-gray-500">Supports standard TradeLens CSV schema</span>
        </label>
      </div>

      {status && (
        <div
          className={`p-3 rounded-lg text-xs mb-4 flex items-center gap-2 ${
            errors.length > 0 || !status.startsWith('Import completed')
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          {errors.length > 0 || !status.startsWith('Import completed')
            ? <AlertCircle className="w-4 h-4 shrink-0" />
            : <FileCheck className="w-4 h-4 shrink-0" />}
          <span>{status}</span>
        </div>
      )}

      {errors.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-red-500/20 bg-red-500/5 p-3 mb-4">
          <ul className="space-y-2 text-xs text-red-300">
            {errors.map((error, index) => (
              <li key={`${error.row}-${error.column}-${error.code}-${index}`}>
                <span className="font-semibold">Row {error.row}, {error.column}:</span>{' '}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        disabled={!selectedFile || loading}
        onClick={handleUpload}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold text-xs py-2.5 rounded-xl transition-all"
      >
        {loading ? 'Processing Import...' : 'Import Data Record'}
      </button>
    </div>
  );
}
