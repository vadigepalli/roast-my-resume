'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Flame, AlertTriangle, CheckCircle, Target, Zap, TrendingUp, X, Loader2, Copy, Share2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

interface RoastResult {
  overallScore: number;
  verdict: string;
  summary: string;
  roasts: Array<{
    severity: 'critical' | 'major' | 'minor' | 'suggestion';
    title: string;
    issue: string;
    fix: string;
    originalText?: string;
  }>;
  strengths: string[];
  missingKeywords: string[];
  quantificationOpportunities: string[];
  atsScore: number;
  atsIssues: string[];
  rewrittenBullets: Array<{
    original: string;
    improved: string;
  }>;
}

export default function Home() {
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Initialize PDF.js worker
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await handleFile(files[0]);
    }
  }, []);

  const handleFile = async (file: File) => {
    setError(null);

    if (file.type === 'application/pdf') {
      setIsParsing(true);
      try {
        // Client-side PDF parsing with pdfjs-dist
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }

        if (fullText.trim()) {
          setResumeText(fullText.trim());
        } else {
          setError('Could not extract text from PDF. The PDF might be image-based. Try pasting text instead.');
        }
      } catch (err) {
        console.error('PDF parsing error:', err);
        setError('Error parsing PDF. Try pasting text instead.');
      } finally {
        setIsParsing(false);
      }
    } else if (file.type === 'text/plain') {
      const text = await file.text();
      setResumeText(text);
    } else {
      setError('Please upload a PDF or TXT file');
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await handleFile(files[0]);
    }
  };

  const handleRoast = async () => {
    if (!resumeText.trim()) {
      setError('Please paste or upload your resume first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          targetRole: targetRole || 'general professional role'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze resume');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Flame className="w-5 h-5 text-red-500" />;
      case 'major': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'minor': return <Target className="w-5 h-5 text-yellow-500" />;
      default: return <Zap className="w-5 h-5 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500/50 bg-red-500/10';
      case 'major': return 'border-orange-500/50 bg-orange-500/10';
      case 'minor': return 'border-yellow-500/50 bg-yellow-500/10';
      default: return 'border-green-500/50 bg-green-500/10';
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Roast My Resume</h1>
              <p className="text-xs text-gray-400">Brutally honest AI feedback</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {!result ? (
          /* Upload Section */
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold">
                <span className="fire-text">Get Roasted</span>
                <span className="text-white"> 🔥</span>
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Upload your resume and get brutally honest AI feedback. Find weak bullets,
                missing keywords, and opportunities to stand out.
              </p>
            </div>

            {/* Target Role Input */}
            <div className="max-w-xl mx-auto">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Role (optional)
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Senior Product Manager, Data Scientist..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* Upload Area */}
            <div
              className={`max-w-2xl mx-auto border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                dragActive
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-white/20 hover:border-white/40'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {isParsing ? (
                  <>
                    <Loader2 className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-spin" />
                    <p className="text-lg text-white mb-2">Parsing PDF...</p>
                    <p className="text-sm text-gray-500">Extracting text from your resume</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg text-white mb-2">
                      Drop your resume here or <span className="text-orange-500">browse</span>
                    </p>
                    <p className="text-sm text-gray-500">PDF or TXT files</p>
                  </>
                )}
              </label>
            </div>

            {/* Or Paste */}
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-gray-500 text-sm">or paste your resume</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume text here..."
                rows={10}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none font-mono text-sm"
              />
            </div>

            {error && (
              <div className="max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Roast Button */}
            <div className="text-center">
              <button
                onClick={handleRoast}
                disabled={isLoading || !resumeText.trim()}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-lg rounded-xl hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto transition-all transform hover:scale-105"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Roasting...
                  </>
                ) : (
                  <>
                    <Flame className="w-6 h-6" />
                    Roast My Resume
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Results Section */
          <div className="space-y-8">
            {/* Back Button */}
            <button
              onClick={() => setResult(null)}
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Start Over
            </button>

            {/* Score Header */}
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center">
                <div
                  className="w-32 h-32 rounded-full p-2 score-ring"
                  style={{ '--score': result.overallScore } as React.CSSProperties}
                >
                  <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center">
                    <div>
                      <div className="text-4xl font-bold text-white">{result.overallScore}</div>
                      <div className="text-xs text-gray-400">/ 100</div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{result.verdict}</h2>
                <p className="text-gray-400 max-w-xl mx-auto">{result.summary}</p>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Roasts */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" /> The Roast
                </h3>
                {result.roasts.map((roast, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border ${getSeverityColor(roast.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(roast.severity)}
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">{roast.title}</h4>
                        <p className="text-gray-300 text-sm mb-2">{roast.issue}</p>
                        <div className="bg-black/30 rounded-lg p-3">
                          <p className="text-green-400 text-sm">
                            <strong>Fix:</strong> {roast.fix}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Strengths */}
                <div className="roast-card p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-500" /> What's Working
                  </h3>
                  <ul className="space-y-2">
                    {result.strengths.map((strength, i) => (
                      <li key={i} className="text-gray-300 flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ATS Score */}
                <div className="roast-card p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-blue-500" /> ATS Compatibility
                  </h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-3xl font-bold text-white">{result.atsScore}%</div>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full"
                        style={{ width: `${result.atsScore}%` }}
                      />
                    </div>
                  </div>
                  {result.atsIssues.length > 0 && (
                    <ul className="space-y-1">
                      {result.atsIssues.map((issue, i) => (
                        <li key={i} className="text-yellow-400 text-sm flex items-start gap-2">
                          <span>⚠️</span> {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Missing Keywords */}
                {result.missingKeywords.length > 0 && (
                  <div className="roast-card p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5 text-purple-500" /> Missing Keywords
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.missingKeywords.map((keyword, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rewritten Bullets */}
            {result.rewrittenBullets.length > 0 && (
              <div className="roast-card p-6 rounded-xl">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-green-500" /> Upgraded Bullets
                </h3>
                <div className="space-y-4">
                  {result.rewrittenBullets.map((bullet, i) => (
                    <div key={i} className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="text-xs text-red-400 mb-2">BEFORE</div>
                        <p className="text-gray-300 text-sm">{bullet.original}</p>
                      </div>
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="text-xs text-green-400 mb-2">AFTER</div>
                        <p className="text-gray-300 text-sm">{bullet.improved}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantification Opportunities */}
            {result.quantificationOpportunities.length > 0 && (
              <div className="roast-card p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-500" /> Add Numbers Here
                </h3>
                <ul className="space-y-2">
                  {result.quantificationOpportunities.map((opp, i) => (
                    <li key={i} className="text-gray-300 flex items-start gap-2">
                      <span className="text-yellow-500">→</span>
                      {opp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-gray-500 text-sm">
        Built with Claude AI • Your resume data is not stored
      </footer>
    </main>
  );
}
