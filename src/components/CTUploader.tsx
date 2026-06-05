'use client'

import { useCallback, useState } from 'react'
import { Upload, FileImage, X, AlertCircle } from 'lucide-react'

interface Props {
  onFilesChange: (files: File[]) => void
  files: File[]
}

export default function CTUploader({ onFilesChange, files }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const ACCEPTED = ['.dcm', '.nii', '.nii.gz', '.gz']

  const validate = (incoming: File[]): File[] => {
    const valid = incoming.filter(f =>
      ACCEPTED.some(ext => f.name.toLowerCase().endsWith(ext)) || f.type === 'application/dicom'
    )
    if (valid.length < incoming.length)
      setError('Some files were skipped (only DICOM .dcm, NIfTI .nii/.nii.gz accepted)')
    else
      setError('')
    return valid
  }

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming)
    const valid = validate(arr)
    onFilesChange([...files, ...valid])
  }, [files, onFilesChange])

  const removeFile = (idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        onClick={() => document.getElementById('ct-file-input')?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
      >
        <Upload className="mx-auto mb-3 text-gray-400" size={36} />
        <p className="font-medium text-gray-700">拖放 CT 影像至此，或點擊選擇</p>
        <p className="text-sm text-gray-400 mt-1">支援 DICOM (.dcm)、NIfTI (.nii, .nii.gz)，可多選</p>
        <input
          id="ct-file-input"
          type="file"
          multiple
          accept=".dcm,.nii,.gz,application/dicom"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <p className="text-sm text-gray-500">{files.length} 個檔案已選取</p>
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileImage size={16} className="text-blue-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">{f.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  ({(f.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeFile(i) }} className="text-gray-400 hover:text-red-500 ml-2">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
