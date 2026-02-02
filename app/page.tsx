'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, Flame, CheckCircle, Target, TrendingUp, X, Loader2, Copy, Check, Share2, Sparkles } from 'lucide-react';

declare global { interface Window { pdfjsLib: any; } }

interface RoastResult {
  overallScore: number; verdict: string; summary: string;
  roasts: Array<{ severity: 'critical' | 'major' | 'minor' | 'suggestion'; title: string; issue: string; fix: string; }>;
  strengths: string[]; missingKeywords: string[];
  atsScore: number; atsIssues: string[];
  rewrittenBullets: Array<{ original: string; improved: string; }>;
}

const SAMPLE_RESUME = `John Smith
Software Engineer | john@email.com | (555) 123-4567

EXPERIENCE
Software Developer at Tech Company (2020-Present)
- Worked on various projects
- Helped the team with tasks
- Did coding stuff
- Attended meetings

Junior Developer at Startup (2018-2020)
- Fixed bugs
- Wrote some code
- Learned new things

EDUCATION
BS Computer Science, State University, 2018

SKILLS
JavaScript, Python, React, Node.js, SQL, Git`;

export default function Home() {
  const [resumeText, setResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [shared, setShared] = useState(false);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        setPdfReady(true);
      }
    };
    document.head.appendChild(script);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) await handleFile(e.dataTransfer.files[0]);
  }, [pdfReady]);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.type === 'application/pdf') {
      if (!pdfReady || !window.pdfjsLib) { setError('PDF parser loading. Please try again.'); return; }
      setIsParsing(true);
      try {
        const ab = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const tc = await page.getTextContent();
          text += tc.items.map((item: any) => item.str).join(' ') + '\n';
        }
        if (text.trim()) setResumeText(text.trim());
        else setError('Could not extract text from PDF. Try pasting your resume instead.');
      } catch { setError('Error parsing PDF. Try pasting your resume instead.'); }
      finally { setIsParsing(false); }
    } else if (file.type === 'text/plain') { setResumeText(await file.text()); }
    else { setError('Please upload a PDF or TXT file'); }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) await handleFile(e.target.files[0]);
  };

  const handleRoast = async () => {
    const trimmed = resumeText.trim();
    if (!trimmed) { setError('Please add your resume first'); return; }
    if (trimmed.length < 100) { setError('Resume seems too short. Please add more content.'); return; }
    if (trimmed.length > 15000) { setError('Resume is too long. Please shorten to under 15,000 characters.'); return; }

    setIsLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/roast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze');
      setResult(data);
    } catch (e: any) { setError(e.message || 'Something went wrong. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const handleTryDemo = () => {
    setResumeText(SAMPLE_RESUME);
    setError(null);
  };

  const copyBullet = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const shareResult = async () => {
    if (!result) return;
    const text = `🔥 My Resume Roast Score: ${result.overallScore}/100\n\n"${result.verdict}"\n\nGet your resume roasted at ${window.location.href}`;
    if (navigator.share) {
      try { await navigator.share({ text }); }
      catch { await navigator.clipboard.writeText(text); setShared(true); }
    } else {
      await navigator.clipboard.writeText(text);
      setShared(true);
    }
    setTimeout(() => setShared(false), 2000);
  };

  const sevColor = (s: string) => s === 'critical' ? 'border-red-500/50 bg-red-500/10' : s === 'major' ? 'border-orange-500/50 bg-orange-500/10' : s === 'minor' ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-green-500/50 bg-green-500/10';

  return (
    <main className="min-h-screen">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center"><Flame className="w-6 h-6 text-white" /></div>
          <div><h1 className="text-xl font-bold text-white">Roast My Resume</h1><p className="text-xs text-gray-400">Brutally honest AI feedback</p></div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {!result ? (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold"><span className="fire-text">Get Roasted</span><span className="text-white"> 🔥</span></h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">Upload your resume and get brutally honest AI feedback. Find weak bullets, missing keywords, and opportunities to stand out.</p>
            </div>
            <div className={`max-w-2xl mx-auto border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragActive ? 'border-orange-500 bg-orange-500/10' : 'border-white/20 hover:border-white/40'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
              <input type="file" accept=".pdf,.txt" onChange={handleFileInput} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                {isParsing ? <><Loader2 className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-spin" /><p className="text-lg text-white">Parsing PDF...</p></> : <><Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-lg text-white mb-2">Drop resume here or <span className="text-orange-500">browse</span></p><p className="text-sm text-gray-500">PDF or TXT</p></>}
              </label>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-4 mb-4"><div className="flex-1 h-px bg-white/10" /><span className="text-gray-500 text-sm">or paste resume</span><div className="flex-1 h-px bg-white/10" /></div>
              <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste your resume text here..." rows={10} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 outline-none resize-none font-mono text-sm" />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">{resumeText.length.toLocaleString()} / 15,000 characters</span>
                <button onClick={handleTryDemo} className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1"><Sparkles className="w-3 h-3" />Try with sample resume</button>
              </div>
            </div>
            {error && <div className="max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-center">{error}</div>}
            <div className="text-center">
              <button onClick={handleRoast} disabled={isLoading || !resumeText.trim()} className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-lg rounded-xl disabled:opacity-50 flex items-center gap-3 mx-auto hover:scale-105 transition-transform">
                {isLoading ? <><Loader2 className="w-6 h-6 animate-spin" />Analyzing...</> : <><Flame className="w-6 h-6" />Roast My Resume</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <button onClick={() => setResult(null)} className="text-gray-400 hover:text-white flex items-center gap-2"><X className="w-4 h-4" /> Start Over</button>
              <button onClick={shareResult} className="text-orange-500 hover:text-orange-400 flex items-center gap-2 px-4 py-2 border border-orange-500/30 rounded-lg">
                {shared ? <><Check className="w-4 h-4" />Copied!</> : <><Share2 className="w-4 h-4" />Share Score</>}
              </button>
            </div>
            <div className="text-center space-y-6">
              <div className="w-32 h-32 rounded-full p-2 score-ring mx-auto" style={{ '--score': result.overallScore } as React.CSSProperties}>
                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center"><div><div className="text-4xl font-bold text-white">{result.overallScore}</div><div className="text-xs text-gray-400">/ 100</div></div></div>
              </div>
              <div><h2 className="text-2xl font-bold text-white mb-2">{result.verdict}</h2><p className="text-gray-400 max-w-xl mx-auto">{result.summary}</p></div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> The Roast</h3>
                {result.roasts.map((r, i) => <div key={i} className={`p-4 rounded-xl border ${sevColor(r.severity)}`}><h4 className="font-semibold text-white mb-1">{r.title}</h4><p className="text-gray-300 text-sm mb-2">{r.issue}</p><div className="bg-black/30 rounded-lg p-3"><p className="text-green-400 text-sm"><strong>Fix:</strong> {r.fix}</p></div></div>)}
              </div>
              <div className="space-y-6">
                <div className="roast-card p-6 rounded-xl"><h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><CheckCircle className="w-5 h-5 text-green-500" /> What Works</h3><ul className="space-y-2">{result.strengths.map((s, i) => <li key={i} className="text-gray-300 flex items-start gap-2"><span className="text-green-500">✓</span>{s}</li>)}</ul></div>
                <div className="roast-card p-6 rounded-xl"><h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-blue-500" /> ATS Score</h3><div className="flex items-center gap-4 mb-4"><div className="text-3xl font-bold text-white">{result.atsScore}%</div><div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full" style={{ width: `${result.atsScore}%` }} /></div></div>{result.atsIssues.length > 0 && <ul className="space-y-1">{result.atsIssues.map((x, i) => <li key={i} className="text-yellow-400 text-sm">⚠️ {x}</li>)}</ul>}</div>
                {result.missingKeywords.length > 0 && <div className="roast-card p-6 rounded-xl"><h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Target className="w-5 h-5 text-purple-500" /> Missing Keywords</h3><div className="flex flex-wrap gap-2">{result.missingKeywords.map((k, i) => <span key={i} className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm">{k}</span>)}</div></div>}
              </div>
            </div>
            {result.rewrittenBullets.length > 0 && <div className="roast-card p-6 rounded-xl"><h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6"><TrendingUp className="w-5 h-5 text-green-500" /> Upgraded Bullets</h3><div className="space-y-4">{result.rewrittenBullets.map((b, i) => <div key={i} className="grid md:grid-cols-2 gap-4"><div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"><div className="text-xs text-red-400 mb-2">BEFORE</div><p className="text-gray-300 text-sm">{b.original}</p></div><div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg relative group"><div className="text-xs text-green-400 mb-2">AFTER</div><p className="text-gray-300 text-sm">{b.improved}</p><button onClick={() => copyBullet(b.improved, i)} className="absolute top-2 right-2 p-1.5 rounded bg-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity">{copiedIndex === i ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-green-400" />}</button></div></div>)}</div></div>}
          </div>
        )}
      </div>
      <footer className="border-t border-white/10 py-8 text-center text-gray-500 text-sm">Built with Claude AI • Your resume is never stored</footer>
    </main>
  );
}
