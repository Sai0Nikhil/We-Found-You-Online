import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, 
  Upload, 
  FileSearch, 
  MapPin, 
  Clock, 
  Users, 
  Fingerprint, 
  Lightbulb, 
  Eye, 
  AlertTriangle, 
  ClipboardCheck,
  Loader2,
  ChevronRight,
  ChevronDown,
  Download,
  Trash2,
  BrainCircuit,
  Binary
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---

type Confidence = 'Low' | 'Medium' | 'High';

interface EvidenceSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  inference?: string;
  confidence?: Confidence;
  reasoning?: string;
  placeholder: string;
}

// --- Constants ---

const FRAMEWORK_SECTIONS: Omit<EvidenceSection, 'content'>[] = [
  {
    id: 'raw_observations',
    title: 'SECTION 1 — RAW OBSERVATIONS',
    icon: <Eye className="w-4 h-4" />,
    placeholder: 'List every visible or detectable detail (text, signs, logos, weather, shadows...). Be exhaustive.'
  },
  {
    id: 'text_analysis',
    title: 'SECTION 2 — TEXT & LANGUAGE ANALYSIS',
    icon: <Binary className="w-4 h-4" />,
    placeholder: 'Extract visible text, partial text, language clues, dialects, abbreviations.'
  },
  {
    id: 'geolocation',
    title: 'SECTION 3 — GEOLOCATION ANALYSIS',
    icon: <MapPin className="w-4 h-4" />,
    placeholder: 'Estimate possible location using architecture, vegetation, roads, vehicle formats.'
  },
  {
    id: 'temporal',
    title: 'SECTION 4 — TEMPORAL ANALYSIS',
    icon: <Clock className="w-4 h-4" />,
    placeholder: 'Estimate time of day, season, year range using shadows, sunlight, clothing.'
  },
  {
    id: 'behavioral',
    title: 'SECTION 5 — HUMAN / BEHAVIORAL ANALYSIS',
    icon: <Users className="w-4 h-4" />,
    placeholder: 'Infer possible profession, age, socioeconomic indicators, habits.'
  },
  {
    id: 'digital_forensics',
    title: 'SECTION 6 — DIGITAL FORENSICS',
    icon: <Fingerprint className="w-4 h-4" />,
    placeholder: 'Look for metadata hints, editing traces, compression anomalies.'
  },
  {
    id: 'investigative_leads',
    title: 'SECTION 7 — INVESTIGATIVE LEADS',
    icon: <Lightbulb className="w-4 h-4" />,
    placeholder: 'Rank strongest next steps (reverse image search, map search, business lookup).'
  },
  {
    id: 'hidden_details',
    title: 'SECTION 8 — HIDDEN OR EASILY MISSED DETAILS',
    icon: <Shield className="w-4 h-4" />,
    placeholder: 'Focus on reflections, mirrors, tiny background objects, faint text.'
  },
  {
    id: 'misdirection',
    title: 'SECTION 9 — POSSIBLE MISDIRECTION',
    icon: <AlertTriangle className="w-4 h-4" />,
    placeholder: 'Identify clues that may intentionally distract investigators.'
  },
  {
    id: 'final_summary',
    title: 'SECTION 10 — FINAL INVESTIGATION SUMMARY',
    icon: <ClipboardCheck className="w-4 h-4" />,
    placeholder: 'Provide the most likely explanation, strongest inference, and confidence assessment.'
  }
];

// --- Components ---

export default function App() {
  const [evidence, setEvidence] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, EvidenceSection>>(
    FRAMEWORK_SECTIONS.reduce((acc, section) => ({
      ...acc,
      [section.id]: { ...section, content: '', confidence: 'Low', inference: '' }
    }), {})
  );
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('raw_observations');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEvidence(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const updateSection = (id: string, updates: Partial<EvidenceSection>) => {
    setSections(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  };

  const runAIAnalysis = async (sectionId: string) => {
    if (!evidence) return;
    setAnalyzing(sectionId);
    
    try {
      const formData = new FormData();
      formData.append('image', evidence);
      formData.append('section', sectionId);
      
      const sectionInfo = FRAMEWORK_SECTIONS.find(s => s.id === sectionId);
      const prompt = `Perform an OSINT investigation for ${sectionInfo?.title}. 
      Follow these rules:
      1. Do NOT invent facts.
      2. Carefully analyze evidence and infer only what is reasonably supported.
      3. Section description: ${sectionInfo?.placeholder}
      
      Output format:
      [OBSERVATIONS]: ...
      [INFERENCES]: ...
      [CONFIDENCE]: Low/Medium/High
      [REASONING]: ...`;

      formData.append('prompt', prompt);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.analysis) {
        // Simple parsing of AI response
        const contentMatch = data.analysis.match(/\[OBSERVATIONS\]:([\s\S]*?)\[INFERENCES\]/);
        const inferenceMatch = data.analysis.match(/\[INFERENCES\]:([\s\S]*?)\[CONFIDENCE\]/);
        const confidenceMatch = data.analysis.match(/\[CONFIDENCE\]:\s*(Low|Medium|High)/i);
        const reasoningMatch = data.analysis.match(/\[REASONING\]:([\s\S]*)/);

        updateSection(sectionId, {
          content: contentMatch ? contentMatch[1].trim() : data.analysis,
          inference: inferenceMatch ? inferenceMatch[1].trim() : '',
          confidence: (confidenceMatch ? confidenceMatch[1].trim() : 'Medium') as Confidence,
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : ''
        });
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setAnalyzing(null);
    }
  };

  const exportReport = () => {
    const report = (Object.values(sections) as EvidenceSection[]).map(s => {
      return `${s.title}\n\nObservations: ${s.content}\nInferences: ${s.inference}\nConfidence: ${s.confidence}\nReasoning: ${s.reasoning}\n\n------------------\n`;
    }).join('\n');

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OSINT_Investigation_Report.txt';
    a.click();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0a0a0c] flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Shield className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">OSINT INTEL ASSISTANT</h1>
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">Advanced Forensic Framework v1.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Evidence Preview */}
        <aside className="w-1/3 border-r border-slate-800 bg-[#0f0f11] flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Evidence Workspace</h2>
            {evidence && (
              <button 
                onClick={() => { setEvidence(null); setPreviewUrl(null); }}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {!evidence ? (
            <label className="flex-1 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
              <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="text-slate-400 group-hover:text-blue-400 w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-300">Upload Visual Evidence</p>
                <p className="text-xs text-slate-500 mt-1">Images, Screenshots, Maps</p>
              </div>
            </label>
          ) : (
            <div className="space-y-4">
              <div className="forensic-card group relative">
                <img src={previewUrl!} alt="Evidence" className="w-full h-auto object-contain bg-black max-h-[60vh]" />
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-mono text-white border border-white/10 uppercase tracking-wide">
                  Evidence Sample
                </div>
              </div>
              
              <div className="p-4 bg-[#1a1a1e] rounded-lg border border-slate-800">
                <div className="flex items-center gap-2 mb-3 text-blue-400">
                  <BrainCircuit className="w-4 h-4" />
                  <span className="text-xs font-bold font-mono uppercase">AI Forensics Ready</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The investigation model is synchronized with the uploaded visual data. Use the section buttons to trigger targeted analysis.
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Right Content - Analysis Framework */}
        <section className="flex-1 bg-[#0a0a0c] overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">Investigation Framework</h2>
              <p className="text-slate-400 text-sm mt-1">Systematic analysis using forensic intelligence standards.</p>
            </div>

            {FRAMEWORK_SECTIONS.map((sectionInfo) => {
              const section = sections[sectionInfo.id];
              const isExpanded = expandedSection === sectionInfo.id;
              const isAnalyzing = analyzing === sectionInfo.id;

              return (
                <div 
                  key={sectionInfo.id}
                  id={sectionInfo.id}
                  className={cn(
                    "forensic-card transition-all duration-300",
                    isExpanded ? "ring-1 ring-blue-500/30 bg-[#141417]" : "hover:border-slate-700"
                  )}
                >
                  <button 
                    onClick={() => setExpandedSection(isExpanded ? null : sectionInfo.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded flex items-center justify-center transition-colors",
                        isExpanded ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 group-hover:bg-slate-700"
                      )}>
                        {sectionInfo.icon}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold font-mono tracking-wider text-slate-200">{sectionInfo.title}</h3>
                        {!isExpanded && section.content && (
                          <p className="text-[10px] text-slate-500 truncate w-64 mt-0.5 italic">
                            Analysis recorded...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {section.content && (
                        <div className={cn(
                          "badge",
                          section.confidence === 'Low' && 'badge-low',
                          section.confidence === 'Medium' && 'badge-medium',
                          section.confidence === 'High' && 'badge-high'
                        )}>
                          {section.confidence} CONFIDENCE
                        </div>
                      )}
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-2 space-y-5 border-t border-slate-800/50">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Observation Info */}
                            <div className="space-y-2 col-span-2">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Detailed Observations</label>
                                <button 
                                  disabled={!evidence || isAnalyzing}
                                  onClick={() => runAIAnalysis(sectionInfo.id)}
                                  className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                  {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3 group-hover:scale-110 transition-transform" />}
                                  <span>{isAnalyzing ? 'Analyzing...' : 'Ask AI Asst'}</span>
                                </button>
                              </div>
                              <textarea 
                                value={section.content}
                                onChange={(e) => updateSection(sectionInfo.id, { content: e.target.value })}
                                placeholder={sectionInfo.placeholder}
                                className="w-full h-32 forensic-input resize-none"
                              />
                            </div>

                            {/* Inference & Confidence */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Inference</label>
                              <textarea 
                                value={section.inference}
                                onChange={(e) => updateSection(sectionInfo.id, { inference: e.target.value })}
                                placeholder="What does this observation imply?"
                                className="w-full h-24 forensic-input resize-none"
                              />
                            </div>

                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Confidence Level</label>
                                <div className="flex gap-2">
                                  {(['Low', 'Medium', 'High'] as Confidence[]).map((level) => (
                                    <button
                                      key={level}
                                      onClick={() => updateSection(sectionInfo.id, { confidence: level })}
                                      className={cn(
                                        "flex-1 py-2 rounded text-[10px] font-bold uppercase border transition-all",
                                        section.confidence === level 
                                          ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40" 
                                          : "bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300"
                                      )}
                                    >
                                      {level}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Reasoning</label>
                                <input 
                                  value={section.reasoning}
                                  onChange={(e) => updateSection(sectionInfo.id, { reasoning: e.target.value })}
                                  placeholder="Why this level?"
                                  className="w-full forensic-input h-9"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-10 border-t border-slate-800 bg-[#0f0f11] flex items-center justify-between px-6 font-mono text-[10px] text-slate-500 uppercase tracking-widest">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50" /> System Active</span>
          <span className="flex items-center gap-1.5"><FileSearch className="w-3 h-3" /> Framework: Investigation Standard 2026</span>
        </div>
        <div>
          Confidence Aggregate: {(Object.values(sections) as EvidenceSection[]).filter(s => s.content).length} / 10 Sections
        </div>
      </footer>
    </div>
  );
}
