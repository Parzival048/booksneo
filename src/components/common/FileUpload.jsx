/**
 * AI Tally Sync - File Upload Component
 * Drag and drop file uploader with PDF support
 */

import { useState, useRef } from 'react';
import { Upload, File, X, Lock, FileText } from 'lucide-react';
import { validateFileType, formatFileSize } from '../../utils/helpers';
import { APP_CONFIG } from '../../utils/constants';

const FileUpload = ({ onFileSelect, accept = '.csv,.xlsx,.xls,.pdf', multiple = false }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState(null);
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [pdfPassword, setPdfPassword] = useState('');
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const validateFile = (file) => {
        // Check file type (including PDF)
        const supportedTypes = [...APP_CONFIG.supportedFileTypes, '.pdf', 'application/pdf'];
        if (!validateFileType(file, supportedTypes)) {
            return `Invalid file type. Supported: CSV, Excel, PDF`;
        }

        // Check file size
        if (file.size > APP_CONFIG.maxFileSize) {
            return `File too large. Maximum size: ${formatFileSize(APP_CONFIG.maxFileSize)}`;
        }

        return null;
    };

    const isPDF = (file) => {
        return file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');
    };

    const handleFile = (file) => {
        setError(null);
        setShowPasswordInput(false);
        setPdfPassword('');

        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        setSelectedFile(file);

        // If PDF, show password input option
        if (isPDF(file)) {
            setShowPasswordInput(true);
        }

        onFileSelect?.(file, null); // password passed as second param
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleInputChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        setSelectedFile(null);
        setError(null);
        setShowPasswordInput(false);
        setPdfPassword('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onFileSelect?.(null);
    };

    const handlePasswordSubmit = () => {
        if (selectedFile && pdfPassword) {
            onFileSelect?.(selectedFile, pdfPassword);
        }
    };

    return (
        <div>
            <div
                className={`file-upload ${isDragging ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                />

                {selectedFile ? (
                    <div className="flex items-center gap-4">
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-lg)',
                            background: isPDF(selectedFile) ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isPDF(selectedFile) ? 'var(--error-400)' : 'var(--primary-400)'
                        }}>
                            {isPDF(selectedFile) ? <FileText size={24} /> : <File size={24} />}
                        </div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <p style={{ fontWeight: '500', marginBottom: 'var(--space-1)' }}>
                                {selectedFile.name}
                            </p>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 0 }}>
                                {formatFileSize(selectedFile.size)} {isPDF(selectedFile) && '• PDF Document'}
                            </p>
                        </div>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={handleRemove}
                        >
                            <X size={20} />
                        </button>
                    </div>
                ) : (
                    <>
                        <Upload className="file-upload-icon" size={48} />
                        <p className="file-upload-text">
                            Drag & drop your file here, or <span style={{ color: 'var(--primary-400)' }}>browse</span>
                        </p>
                        <p className="file-upload-hint">
                            Supports: CSV, XLSX, XLS, PDF (Max {formatFileSize(APP_CONFIG.maxFileSize)})
                        </p>
                    </>
                )}
            </div>

            {/* Password input for protected PDFs */}
            {showPasswordInput && isPDF(selectedFile) && (
                <div style={{
                    marginTop: 'var(--space-3)',
                    padding: 'var(--space-3)',
                    background: 'var(--bg-glass)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)'
                }}>
                    <div className="flex items-center gap-2 mb-2">
                        <Lock size={14} style={{ color: 'var(--warning-500)' }} />
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                            Password Protected PDF?
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Enter PDF password (optional)"
                            value={pdfPassword}
                            onChange={(e) => setPdfPassword(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ flex: 1 }}
                        />
                        {pdfPassword && (
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePasswordSubmit();
                                }}
                            >
                                Unlock
                            </button>
                        )}
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)', marginBottom: 0 }}>
                        Leave empty if the PDF is not password protected
                    </p>
                </div>
            )}

            {error && (
                <p style={{
                    color: 'var(--error-500)',
                    fontSize: 'var(--text-sm)',
                    marginTop: 'var(--space-2)'
                }}>
                    {error}
                </p>
            )}
        </div>
    );
};

export default FileUpload;
