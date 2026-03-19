"use client";

import React, { useState, useRef, useEffect } from "react";
import mammoth from "mammoth";
import { Upload, X, Tag as TagIcon, Check, MousePointer2 } from "lucide-react";

export interface TagMapping {
  id: string;
  originalText: string;
  tag: string;
}

const DEFAULT_TAGS = ["name", "email", "phone", "education", "skills", "projects", "experience"];

export default function TemplateEditor({ onSave }: { onSave: (file: File, mappings: TagMapping[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [mappings, setMappings] = useState<TagMapping[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Selection state
  const [selection, setSelection] = useState<{ text: string; top: number; left: number } | null>(null);
  const [customTag, setCustomTag] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtmlContent(result.value);
      setMappings([]);
    } catch (error) {
      console.error("Error parsing DOCX:", error);
      alert("Failed to read DOCX file. Please try another file.");
    } finally {
      setLoading(false);
    }
  };

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      // Don't hide immediately if they are clicking the floating menu
      return;
    }

    const text = sel.toString().trim();
    if (!text) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current?.getBoundingClientRect();

    if (editorRect) {
      setSelection({
        text,
        top: rect.top - editorRect.top - 40, // position above selection
        left: rect.left - editorRect.left + (rect.width / 2),
      });
    }
  };

  const assignTag = (tagName: string) => {
    if (!selection) return;

    // Check if originalText is already mapped to prevent duplicates easily
    if (mappings.some(m => m.originalText === selection.text)) {
      alert(`"${selection.text}" is already mapped!`);
      setSelection(null);
      return;
    }

    const newMapping: TagMapping = {
      id: Math.random().toString(36).substr(2, 9),
      originalText: selection.text,
      tag: tagName.toLowerCase().replace(/\s+/g, '_')
    };

    setMappings([...mappings, newMapping]);
    
    // We visually highlight the text in the HTML (Basic implementation: replace string)
    // Note: Replacing raw HTML strings can be brittle if text crosses tags, but mammoth outputs fairly clean P tags.
    const highlightHtml = `<mark class="bg-indigo-500/30 text-indigo-300 font-bold px-1 rounded rounded-sm cursor-help" title="{{${newMapping.tag}}}">${selection.text}</mark>`;
    setHtmlContent(prev => prev.replace(selection.text, highlightHtml));

    setSelection(null);
    setCustomTag("");
    window.getSelection()?.removeAllRanges();
  };

  const removeMapping = (id: string) => {
    const mapping = mappings.find(m => m.id === id);
    if (!mapping) return;
    
    // Remove the visually highlighted mark from HTML
    const highlightRegex = new RegExp(`<mark[^>]*>${mapping.originalText}</mark>`, 'g');
    setHtmlContent(prev => prev.replace(highlightRegex, mapping.originalText));
    
    setMappings(mappings.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[800px] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* LEFT: Editor Area */}
      <div className="flex-1 flex flex-col relative bg-slate-800/50">
        <div className="p-4 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MousePointer2 className="w-5 h-5 text-indigo-400" />
            Interactive Template Editor
          </h2>
          {!file && (
            <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload DOCX
              <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} />
            </label>
          )}
        </div>

        <div className="flex-1 overflow-auto p-8 relative" ref={editorRef} onMouseUp={handleMouseUp}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400">Rendering document...</div>
          ) : !file ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-300 font-medium mb-2">Start by uploading a Template</p>
              <p className="text-slate-500 text-sm">Upload a standard .docx file. You'll be able to highlight text to assign tags directly in the browser.</p>
            </div>
          ) : (
            <div 
              className="prose prose-invert max-w-none bg-white/5 p-8 rounded-xl min-h-full shadow-inner selection:bg-indigo-500/40"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}

          {/* Floating Selection Menu */}
          {selection && (
            <div 
              className="absolute z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3 w-64 transform -translate-x-1/2"
              style={{ top: selection.top, left: selection.left }}
            >
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700">
                <span className="text-xs text-slate-400 font-medium truncate">"{selection.text}"</span>
                <button onClick={() => setSelection(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-1 mb-2 pr-1 custom-scrollbar">
                {DEFAULT_TAGS.map(tag => (
                  <button 
                    key={tag}
                    onClick={() => assignTag(tag)}
                    className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-indigo-600 rounded-md transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              
              <div className="pt-2 border-t border-slate-700 flex gap-2">
                <input 
                  type="text" 
                  value={customTag}
                  onChange={e => setCustomTag(e.target.value)}
                  placeholder="custom_tag"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  onKeyDown={e => e.key === 'Enter' && customTag && assignTag(customTag)}
                />
                <button 
                  onClick={() => customTag && assignTag(customTag)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Sidebar */}
      <div className="w-full md:w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-white font-medium flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-emerald-400" />
            Assigned Tags
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Highlight text in the document and assign it a tag. The backend will replace the text with exactly that tag automatically!
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {mappings.length === 0 ? (
            <div className="text-center text-slate-500 text-sm mt-8">No tags assigned yet.</div>
          ) : (
            mappings.map(m => (
              <div key={m.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                    {`{{${m.tag}}}`}
                  </span>
                  <button onClick={() => removeMapping(m.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-300 truncate font-medium">"{m.originalText}"</p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-800/80">
          <button 
            disabled={!file}
            onClick={() => file && onSave(file, mappings)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
          >
            Confirm & Save Template
          </button>
        </div>
      </div>
    </div>
  );
}
