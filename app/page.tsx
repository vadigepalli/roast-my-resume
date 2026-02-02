'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, Flame, CheckCircle, Target, TrendingUp, X, Loader2, Copy, Check, Share2, Sparkles, Wand2, Printer, Download } from 'lucide-react';

declare global { interface Window { pdfjsLib: any; } }

interface RoastResult {
  overallScore: number; verdict: string; summary: string;
  roasts: Array<{ severity: 'critical' | 'major' | 'minor' | 'suggestion'; title: string; issue: string; fix: string; }>;
  strengths: string[]; missingKeywords: string[];
  atsScore: number; atsIssues: string[];
  rewrittenBullets: Array<{ original: string; improved: string; }>;
}

interface RebuiltResume {
  name: string;
  title: string;
  contact: { email?: string; phone?: string; linkedin?: string; location?: string; };
  summary: string;
  experience: Array<{ company: string; title: string; dates: string; bullets: string[]; }>;
  education: Array<{ school: string; degree: string; year: string; }>;
  skills: string[];
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
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuiltResume, setRebuiltResume] = useState<RebuiltResume | null>(null);
  const [showRebuilt, setShowRebuilt] = useState(false);
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
    setIsLoading(true); setError(null); setResult(null); setRebuiltResume(null);
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

  const handleRebuild = async () => {
    if (!result) return;
    setIsRebuilding(true); setError(null);
    try {
      const res = await fetch('/api/rebuild', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, roastResult: result }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rebuild');
      setRebuiltResume(data);
      setShowRebuilt(true);
    } catch (e: any) { setError(e.message || 'Failed to rebuild resume.'); }
    finally { setIsRebuilding(false); }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !rebuiltResume) return;

    const html = `<!DOCTYPE html>
<html><head><title>${rebuiltResume.name} - Resume</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', serif; font-size: 11pt; line-height: 1.4; color: #333; max-width: 8.5in; margin: 0 auto; padding: 0.5in; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
  .name { font-size: 24pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 2px; }
  .title { font-size: 12pt; color: #555; margin-bottom: 8px; }
  .contact { font-size: 10pt; color: #666; }
  .contact span { margin: 0 8px; }
  .section { margin: 20px 0; }
  .section-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #999; padding-bottom: 3px; margin-bottom: 12px; color: #333; }
  .summary { font-style: italic; color: #444; margin-bottom: 15px; }
  .job { margin-bottom: 15px; }
  .job-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
  .job-title { font-weight: bold; }
  .job-company { color: #555; }
  .job-dates { color: #666; font-size: 10pt; }
  .bullets { padding-left: 20px; }
  .bullets li { margin-bottom: 4px; }
  .edu-item { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .skills { display: flex; flex-wrap: wrap; gap: 8px; }
  .skill { background: #f0f0f0; padding: 3px 10px; border-radius: 3px; font-size: 10pt; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="header">
  <div class="name">${rebuiltResume.name}</div>
  <div class="title">${rebuiltResume.title}</div>
  <div class="contact">
    ${rebuiltResume.contact.email ? `<span>${rebuiltResume.contact.email}</span>` : ''}
    ${rebuiltResume.contact.phone ? `<span>${rebuiltResume.contact.phone}</span>` : ''}
    ${rebuiltResume.contact.location ? `<span>${rebuiltResume.contact.location}</span>` : ''}
    ${rebuiltResume.contact.linkedin ? `<span>${rebuiltResume.contact.linkedin}</span>` : ''}
  </div>
</div>
<div class="section"><div class="section-title">Professional Summary</div><p class="summary">${rebuiltResume.summary}</p></div>
<div class="section"><div class="section-title">Experience</div>
${rebuiltResume.experience.map(job => `<div class="job"><div class="job-header"><div><span class="job-title">${job.title}</span> <span class="job-company">| ${job.company}</span></div><div class="job-dates">${job.dates}</div></div><ul class="bullets">${job.bullets.map(b => `<li>${b}</li>`).join('')}</ul></div>`).join('')}
</div>
<div class="section"><div class="section-title">Education</div>
${rebuiltResume.education.map(edu => `<div class="edu-item"><div><strong>${edu.degree}</strong>, ${edu.school}</div><div>${edu.year}</div></div>`).join('')}
</div>
<div class="section"><div class="section-title">Skills</div><div class="skills">${rebuiltResume.skills.map(s => `<span class="skill">${s}</span>`).join('')}</div></div>
<script>window.onload = () => window.print();</script>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleTryDemo = () => { setResumeText(SAMPLE_RESUME); setError(null); };

  const copyBullet = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const shareResult = async () => {
    if (!result) return;
    const text = `🔥 My Resume Roast Score: ${result.overallScore}/100\n\n"${result.verdict}"\n\nGet yours at ${window.location.href}`;
    try { await navigator.clipboard.writeText(text); setShared(true); } catch {}
    setTimeout(() => setShared(false), 2000);
  };

  const sevColor = (s: string) => s === 'critical' ? 'border-red-500/50 bg-red-500/10' : s === 'major' ? 'border-orange-500/50 bg-orange-500/10' : s === 'minor' ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-green-500/50 bg-green-500/10';

  // Rebuilt Resume Modal
  if (showRebuilt && rebuiltResume) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex justify-between items-center mb-8 print:hidden">
            <button onClick={() => setShowRebuilt(false)} className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
              <X className="w-4 h-4" /> Back to Results
            </button>
            <button onClick={handlePrint} className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg flex items-center gap-2 hover:scale-105 transition-transform">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>

          <div className="bg-gray-50 border rounded-xl p-8 shadow-sm">
            <div className="text-center border-b-2 border-gray-300 pb-6 mb-6">
              <h1 className="text-3xl font-bold tracking-wide uppercase">{rebuiltResume.name}</h1>
              <p className="text-gray-600 mt-1">{rebuiltResume.title}</p>
              <p className="text-sm text-gray-500 mt-2">
                {[rebuiltResume.contact.email, rebuiltResume.contact.phone, rebuiltResume.contact.location, rebuiltResume.contact.linkedin].filter(Boolean).join(' • ')}
              </p>
            </div>

            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 pb-1 mb-3">Professional Summary</h2>
              <p className="text-gray-700 italic">{rebuiltResume.summary}</p>
            </div>

            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 pb-1 mb-3">Experience</h2>
              {rebuiltResume.experience.map((job, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-start">
                    <div><span className="font-semibold">{job.title}</span> <span className="text-gray-600">| {job.company}</span></div>
                    <span className="text-gray-500 text-sm">{job.dates}</span>
                  </div>
                  <ul className="list-disc list-inside mt-2 text-gray-700 space-y-1">
                    {job.bullets.map((bullet, j) => <li key={j}>{bullet}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 pb-1 mb-3">Education</h2>
              {rebuiltResume.education.map((edu, i) => (
                <div key={i} className="flex justify-between mb-2">
                  <div><span className="font-semibold">{edu.degree}</span>, {edu.school}</div>
                  <span className="text-gray-500">{edu.year}</span>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 pb-1 mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {rebuiltResume.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-200 rounded text-sm">{skill}</span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6 print:hidden">⚠️ AI-generated resume. Please review for accuracy before using.</p>
        </div>
      </main>
    );
  }

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
                <span className="text-xs text-gray-500">{resumeText.length.toLocaleString()} / 15,000</span>
                <button onClick={handleTryDemo} className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1"><Sparkles className="w-3 h-3" />Try demo</button>
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
            <div className="flex justify-between items-center flex-wrap gap-4">
              <button onClick={() => { setResult(null); setRebuiltResume(null); }} className="text-gray-400 hover:text-white flex items-center gap-2"><X className="w-4 h-4" /> Start Over</button>
              <div className="flex gap-3">
                <button onClick={shareResult} className="text-orange-500 hover:text-orange-400 flex items-center gap-2 px-4 py-2 border border-orange-500/30 rounded-lg text-sm">
                  {shared ? <><Check className="w-4 h-4" />Copied!</> : <><Share2 className="w-4 h-4" />Share</>}
                </button>
                <button onClick={handleRebuild} disabled={isRebuilding} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:scale-105 transition-transform disabled:opacity-50">
                  {isRebuilding ? <><Loader2 className="w-4 h-4 animate-spin" />Rebuilding...</> : <><Wand2 className="w-4 h-4" />Rebuild Resume</>}
                </button>
              </div>
            </div>
            {error && <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-center">{error}</div>}
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
