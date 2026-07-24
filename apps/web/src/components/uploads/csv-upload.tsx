'use client';

import React, { useState } from 'react';
import { uploadCSV } from '@/lib/api-client';
import { Upload, FileCheck, AlertCircle } from 'lucide-react';

interface CSVUploadModalProps {
  onSuccess: () => void;
}

export function CSVUploadModal({ onSuccess }: CSVUploadModalProps) {
  const [fileType, setFileType] = useState<'positions' | 'inventory' | 'shipments'>('positions');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await uploadCSV(fileType, selectedFile);
      setStatus(res.message || 'Import succeeded');
      setSelectedFile(null);
      onSuccess();
    } catch (err: any) {
      setStatus(`Import failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-5 h-5 text-blue-400" />
        <h4 className="font-bold text-sm text-white">Import Fragmented Trade Data (CSV)</h4>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['positions', 'inventory', 'shipments'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFileType(type)}
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
          type="file"
          accept=".csv"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
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
            status.includes('failed') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          {status.includes('failed') ? <AlertCircle className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />}
          <span>{status}</span>
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
