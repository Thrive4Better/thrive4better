import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  FileText,
  Download,
  Eye,
  PenLine,
  LayoutGrid,
  List,
  FolderOpen,
  Shield,
  Handshake,
  ClipboardList,
  X,
  ChevronDown,
  ChevronRight,
  Save,
  Send,
  Clock,
  Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  companyDocuments,
  documentCategories,
  type CompanyDocument,
  type DocumentCategory,
  type DocumentField,
} from '@/data/companyDocuments';
import { cn, formatDate, generateId } from '@/lib/utils';

// ── localStorage helpers ──

const STORAGE_PREFIX = 't4b_';

interface SavedForm {
  id: string;
  documentId: string;
  documentTitle: string;
  data: Record<string, string | boolean>;
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;
  linkedTo?: string; // employee/client id
}

function getSavedForms(): SavedForm[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}completed_forms`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveForms(forms: SavedForm[]) {
  localStorage.setItem(`${STORAGE_PREFIX}completed_forms`, JSON.stringify(forms));
}

// ── Category icons ──

const categoryIcons: Record<DocumentCategory, typeof FileText> = {
  'Policies & Procedures': Shield,
  'Agreements & Contracts': Handshake,
  'Templates': ClipboardList,
};

const categoryColors: Record<DocumentCategory, string> = {
  'Policies & Procedures': 'bg-amber-100 text-amber-700',
  'Agreements & Contracts': 'bg-blue-100 text-blue-700',
  'Templates': 'bg-green-100 text-green-700',
};

// ── Main Component ──

export default function DocumentLibrary() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | ''>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal/SlideOver states
  const [viewingDoc, setViewingDoc] = useState<CompanyDocument | null>(null);
  const [fillingDoc, setFillingDoc] = useState<CompanyDocument | null>(null);
  const [viewSection, setViewSection] = useState<number>(0);

  const filteredDocs = useMemo(() => {
    let docs = companyDocuments;
    if (selectedCategory) {
      docs = docs.filter((d) => d.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      );
    }
    return docs;
  }, [search, selectedCategory]);

  const handleDownload = useCallback((doc: CompanyDocument) => {
    // Generate a simple text file for download (no docx dependency needed)
    let content = `${doc.title}\n`;
    content += `${'='.repeat(doc.title.length)}\n\n`;
    content += `Version: ${doc.version}\n`;
    content += `Last Updated: ${formatDate(doc.lastUpdated)}\n`;
    content += `Category: ${doc.category}\n\n`;
    content += `${'─'.repeat(60)}\n\n`;

    doc.sections.forEach((section) => {
      content += `${section.title}\n`;
      content += `${'-'.repeat(section.title.length)}\n\n`;
      content += `${section.content}\n\n`;
      content += `${'─'.repeat(60)}\n\n`;
    });

    content += `\nThrive 4 Better Pty Ltd\nABN: 15 694 748 297\nDirector: Melissa Manno\nEmail: info@thrive4better.com\nPhone: 0422 745 229\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_')}_v${doc.version}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${doc.title}`);
  }, []);

  // Group docs by category for display
  const docsByCategory = useMemo(() => {
    const groups: { category: DocumentCategory; description: string; docs: CompanyDocument[] }[] = [];
    for (const cat of documentCategories) {
      const docs = filteredDocs.filter((d) => d.category === cat.label);
      if (docs.length > 0) {
        groups.push({ category: cat.label, description: cat.description, docs });
      }
    }
    return groups;
  }, [filteredDocs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Document Library</h1>
          <p className="text-sm text-mid-gray mt-1">
            {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid' ? 'bg-sage-pale text-forest' : 'text-mid-gray hover:bg-sage-pale/50'
            )}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'list' ? 'bg-sage-pale text-forest' : 'text-mid-gray hover:bg-sage-pale/50'
            )}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mid-gray" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="input-field pl-9 text-sm"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory | '')}
            className="input-field text-sm w-auto"
          >
            <option value="">All Categories</option>
            {documentCategories.map((cat) => (
              <option key={cat.label} value={cat.label}>
                {cat.label}
              </option>
            ))}
          </select>
          {(search || selectedCategory) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
              }}
              className="text-sm text-burgundy hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Documents by Category */}
      {docsByCategory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-sage-pale flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-sage" />
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-1">No documents found</h3>
          <p className="text-sm text-mid-gray text-center max-w-sm">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        docsByCategory.map((group) => {
          const CatIcon = categoryIcons[group.category];
          return (
            <div key={group.category}>
              <div className="flex items-center gap-2 mb-3">
                <CatIcon size={18} className="text-forest" />
                <h2 className="text-lg font-semibold text-charcoal">{group.category}</h2>
                <span className="text-xs text-mid-gray">- {group.description}</span>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.docs.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onView={() => {
                        setViewingDoc(doc);
                        setViewSection(0);
                      }}
                      onDownload={() => handleDownload(doc)}
                      onFill={doc.isFillable ? () => setFillingDoc(doc) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="table-header">Document</th>
                          <th className="table-header">Category</th>
                          <th className="table-header">Version</th>
                          <th className="table-header">Last Updated</th>
                          <th className="table-header">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.docs.map((doc) => (
                          <tr
                            key={doc.id}
                            className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors"
                          >
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-forest flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-charcoal">{doc.title}</p>
                                  <p className="text-xs text-mid-gray line-clamp-1">{doc.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className={cn('badge text-xs', categoryColors[doc.category])}>
                                {doc.category}
                              </span>
                            </td>
                            <td className="table-cell text-sm">v{doc.version}</td>
                            <td className="table-cell text-sm">{formatDate(doc.lastUpdated)}</td>
                            <td className="table-cell">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setViewingDoc(doc);
                                    setViewSection(0);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray hover:text-forest"
                                  title="View"
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  onClick={() => handleDownload(doc)}
                                  className="p-1.5 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray hover:text-forest"
                                  title="Download"
                                >
                                  <Download size={15} />
                                </button>
                                {doc.isFillable && (
                                  <button
                                    onClick={() => setFillingDoc(doc)}
                                    className="p-1.5 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray hover:text-forest"
                                    title="Fill & Sign"
                                  >
                                    <PenLine size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* View Document Modal */}
      {viewingDoc && (
        <DocumentViewModal
          doc={viewingDoc}
          currentSection={viewSection}
          onSectionChange={setViewSection}
          onClose={() => setViewingDoc(null)}
          onDownload={() => handleDownload(viewingDoc)}
        />
      )}

      {/* Fill & Sign SlideOver */}
      {fillingDoc && (
        <FillableFormSlideOver
          doc={fillingDoc}
          onClose={() => setFillingDoc(null)}
        />
      )}
    </div>
  );
}

// ── Document Card ──

interface DocumentCardProps {
  doc: CompanyDocument;
  onView: () => void;
  onDownload: () => void;
  onFill?: () => void;
}

function DocumentCard({ doc, onView, onDownload, onFill }: DocumentCardProps) {
  const CatIcon = categoryIcons[doc.category];
  return (
    <div className="card p-4 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', categoryColors[doc.category])}>
          <CatIcon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-charcoal leading-tight line-clamp-2">{doc.title}</h3>
          <p className="text-xs text-mid-gray mt-0.5">{doc.description.slice(0, 80)}...</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-mid-gray mb-4 mt-auto">
        <span className="flex items-center gap-1">
          <Tag size={12} />
          v{doc.version}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatDate(doc.lastUpdated)}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-sage-pale">
        <button onClick={onView} className="btn-secondary text-xs py-1.5 px-3 flex-1">
          <Eye size={14} />
          View
        </button>
        <button onClick={onDownload} className="btn-ghost text-xs py-1.5 px-3">
          <Download size={14} />
        </button>
        {onFill && (
          <button onClick={onFill} className="btn-primary text-xs py-1.5 px-3">
            <PenLine size={14} />
            Fill
          </button>
        )}
      </div>
    </div>
  );
}

// ── Document View Modal ──

interface DocumentViewModalProps {
  doc: CompanyDocument;
  currentSection: number;
  onSectionChange: (idx: number) => void;
  onClose: () => void;
  onDownload: () => void;
}

function DocumentViewModal({ doc, currentSection, onSectionChange, onClose, onDownload }: DocumentViewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[calc(100vh-4rem)] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sage-pale flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={20} className="text-forest flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-charcoal truncate">{doc.title}</h3>
              <div className="flex items-center gap-3 text-xs text-mid-gray">
                <span>Version {doc.version}</span>
                <span>Updated {formatDate(doc.lastUpdated)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onDownload} className="btn-secondary text-xs py-1.5">
              <Download size={14} />
              Download
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sage-pale transition-colors">
              <X size={20} className="text-mid-gray" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Section nav */}
          <div className="w-64 border-r border-sage-pale overflow-y-auto py-3 px-2 flex-shrink-0 hidden md:block">
            {doc.sections.map((section, idx) => (
              <button
                key={idx}
                onClick={() => onSectionChange(idx)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors flex items-center gap-2',
                  currentSection === idx
                    ? 'bg-sage-pale text-forest font-medium'
                    : 'text-mid-gray hover:bg-sage-pale/50 hover:text-charcoal'
                )}
              >
                {currentSection === idx ? (
                  <ChevronDown size={14} className="flex-shrink-0" />
                ) : (
                  <ChevronRight size={14} className="flex-shrink-0" />
                )}
                <span className="line-clamp-2">{section.title}</span>
              </button>
            ))}
          </div>

          {/* Section content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Mobile section selector */}
            <div className="md:hidden mb-4">
              <select
                value={currentSection}
                onChange={(e) => onSectionChange(Number(e.target.value))}
                className="input-field text-sm"
              >
                {doc.sections.map((section, idx) => (
                  <option key={idx} value={idx}>
                    {section.title}
                  </option>
                ))}
              </select>
            </div>

            <h4 className="text-lg font-semibold text-charcoal mb-4">
              {doc.sections[currentSection].title}
            </h4>
            <div className="whitespace-pre-wrap text-sm text-charcoal leading-relaxed font-mono bg-sage-pale/30 rounded-xl p-4 border border-sage-pale">
              {doc.sections[currentSection].content}
            </div>

            {/* Section navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-sage-pale">
              <button
                onClick={() => onSectionChange(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                className="btn-ghost text-sm disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-xs text-mid-gray">
                Section {currentSection + 1} of {doc.sections.length}
              </span>
              <button
                onClick={() => onSectionChange(Math.min(doc.sections.length - 1, currentSection + 1))}
                disabled={currentSection === doc.sections.length - 1}
                className="btn-ghost text-sm disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fillable Form SlideOver ──

interface FillableFormSlideOverProps {
  doc: CompanyDocument;
  onClose: () => void;
}

function FillableFormSlideOver({ doc, onClose }: FillableFormSlideOverProps) {
  const [formData, setFormData] = useState<Record<string, string | boolean>>(() => {
    const initial: Record<string, string | boolean> = {};
    doc.fields.forEach((field) => {
      if (field.type === 'checkbox') {
        initial[field.key] = false;
      } else {
        initial[field.key] = field.defaultValue || '';
      }
    });
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (key: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    doc.fields.forEach((field) => {
      if (field.required && field.type !== 'checkbox') {
        const val = formData[field.key];
        if (!val || (typeof val === 'string' && !val.trim())) {
          newErrors[field.key] = `${field.label} is required`;
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = () => {
    const forms = getSavedForms();
    const saved: SavedForm = {
      id: generateId(),
      documentId: doc.id,
      documentTitle: doc.title,
      data: formData,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    forms.push(saved);
    saveForms(forms);
    toast.success('Draft saved successfully');
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error('Please fill in all required fields');
      return;
    }
    const forms = getSavedForms();
    const saved: SavedForm = {
      id: generateId(),
      documentId: doc.id,
      documentTitle: doc.title,
      data: formData,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    forms.push(saved);
    saveForms(forms);
    toast.success(`${doc.title} submitted successfully`);
    onClose();
  };

  const renderField = (field: DocumentField) => {
    const value = formData[field.key];
    const error = errors[field.key];

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.key} className="mb-4">
            <label className="block text-sm font-medium text-charcoal mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <textarea
              value={value as string}
              onChange={(e) => handleChange(field.key, e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder={field.placeholder}
            />
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="mb-4">
            <label className="block text-sm font-medium text-charcoal mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <select
              value={value as string}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="input-field"
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.key} className="mb-4">
            <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
              <input
                type="checkbox"
                checked={value as boolean}
                onChange={(e) => handleChange(field.key, e.target.checked)}
                className="rounded border-sage text-forest focus:ring-forest"
              />
              {field.label}
            </label>
          </div>
        );

      default:
        return (
          <div key={field.key} className="mb-4">
            <label className="block text-sm font-medium text-charcoal mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input
              type={field.type}
              value={value as string}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="input-field"
              placeholder={field.placeholder}
            />
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white shadow-xl flex flex-col h-full w-full sm:w-[600px]"
        style={{ animation: 'slideIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sage-pale flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-charcoal">Fill & Sign</h3>
            <p className="text-sm text-mid-gray">{doc.title}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-sage-pale transition-colors">
            <X size={20} className="text-mid-gray" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="bg-sage-pale/30 rounded-xl p-4 mb-6 border border-sage-pale">
            <p className="text-sm text-charcoal font-medium mb-1">Thrive 4 Better Pty Ltd</p>
            <p className="text-xs text-mid-gray">ABN: 15 694 748 297 | Director: Melissa Manno</p>
            <p className="text-xs text-mid-gray">info@thrive4better.com | 0422 745 229</p>
          </div>

          {doc.fields.length === 0 ? (
            <p className="text-sm text-mid-gray text-center py-8">
              This document does not have fillable fields. Use the "View" button to read the full document.
            </p>
          ) : (
            doc.fields.map(renderField)
          )}
        </div>

        {/* Footer */}
        {doc.fields.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-sage-pale flex-shrink-0">
            <button onClick={onClose} className="btn-ghost text-sm">
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button onClick={handleSaveDraft} className="btn-secondary text-sm">
                <Save size={16} />
                Save Draft
              </button>
              <button onClick={handleSubmit} className="btn-primary text-sm">
                <Send size={16} />
                Submit
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
