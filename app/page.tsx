'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, Flame, AlertTriangle, CheckCircle, Target, Zap, TrendingUp, X, Loader2 } from 'lucide-react';

declare global {
    interface Window {
          pdfjsLib: any;
    }
}

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
    const [pdfReady, setPdfReady] = useState(false);
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
  }, [pdfReady]);

  const handleFile = async (file: File) => {
        setError(null);
        if (file.type === 'application/pdf') {
                if (!pdfReady || !window.pdfjsLib) {
                          setError('PDF parser is loading. Please try again in a moment.');
                          return;
                }
                setIsParsing(true);
                try {
                          const arrayBuffer = await file.arrayBuffer();
                          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                          let fullText = '';
                          for (let i = 1; i <= pdf.numPages; i++) {
                                      const page = await pdf.getPage(i);
                                      const textContent = await page.getTextContent();
                                      const pageText = textContent.items.map((item: any) => item.str).join(' ');
                                      fullText += pageText + '\n';
                          }
                          if (fullText.trim()) {
                                      setResumeText(fullText.trim());
                          } else {
                                      setError('Could not extract text. The PDF might be image-based. Try pasting text instead.');
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
                          body: JSON.stringify({ resumeText, targetRole: targetRole || 'general professional role' }),
                });
                if (!response.ok) throw new Error('Failed to analyze resume');
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
              <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
                      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                                                          <Flame className="w-6 h-6 text-white" />
                                            </div>div>
                                            <div>
                                                          <h1 className="text-xl font-bold text-white">Roast My Resume</h1>h1>
                                                          <p className="text-xs text-gray-400">Brutally honest AI feedback</p>p>
                                            </div>div>
                                </div>div>
                      </div>div>
              </header>header>
              <div className="max-w-6xl mx-auto px-4 py-12">
                {!result ? (
                    <div className="space-y-8">
                                <div className="text-center space-y-4">
                                              <h2 className="text-4xl md:text-5xl font-bold">
                                                              <span className="fire-text">Get Roasted</span>span>
                                                              <span className="text-white"> 🔥</span>span>
                                              </h2>h2>
                                              <p className="text-gray-400 text-lg max-w-2xl mx-auto">Upload your resume and get brutally honest AI feedback.</p>p>
                                </div>div>
                                <div className="max-w-xl mx-auto">
                                              <label className="block text-sm font-medium text-gray-300 mb-2">Target Role (optional)</label>label>
                                              <input type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g., Senior Product Manager..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 outline-none" />
                                </div>div>
                                <div className={`max-w-2xl mx-auto border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragActive ? 'border-orange-500 bg-orange-500/10' : 'border-white/20 hover:border-white/40'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                                              <input type="file" accept=".pdf,.txt" onChange={handleFileInput} className="hidden" id="file-upload" />
                                              <label htmlFor="file-upload" className="cursor-pointer">
                                                {isParsing ? (<><Loader2 className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-spin" /><p className="text-lg text-white mb-2">Parsing PDF...</p>p></>>) : (<><Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-lg text-white mb-2">Drop your resume here or <span className="text-orange-500">browse</span>span></p>p><p className="text-sm text-gray-500">PDF or TXT files</p>p></>>)}
                                              </label>label>
                                </div>div>
                                <div className="max-w-2xl mx-auto">
                                              <div className="flex items-center gap-4 mb-4"><div className="flex-1 h-px bg-white/10"></div>div><span className="text-gray-500 text-sm">or paste your resume</span>span><div className="flex-1 h-px bg-white/10"></div>div></div>div>
                                              <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste your resume text here..." rows={10} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 outline-none resize-none font-mono text-sm" />
                                </div>div>
                      {error && <div className="max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-center">{error}</div>div>}
                                <div className="text-center">
                                              <button onClick={handleRoast} disabled={isLoading || !resumeText.trim()} className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-lg rounded-xl disabled:opacity-50 flex items-center gap-3 mx-auto">
                                                {isLoading ? (<><Loader2 className="w-6 h-6 animate-spin" />Roasting...</>>) : (<><Flame className="w-6 h-6" />Roast My Resume</>>)}
                                              </button>button>
                                </div>div>
                    </div>div>
                  ) : (
                    <div className="space-y-8">
                                <button onClick={() => setResult(null)} className="text-gray-400 hover:text-white flex items-center gap-2"><X className="w-4 h-4" /> Start Over</button>button>
                                <div className="text-center space-y-6">
                                              <div className="inline-flex items-center justify-center">
                                                              <div className="w-32 h-32 rounded-full p-2 score-ring" style={{ '--score': result.overallScore } as React.CSSProperties}>
                                                                                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center">
                                                                                                    <div><div className="text-4xl font-bold text-white">{result.overallScore}</div>div><div className="text-xs text-gray-400">/ 100</div>div></div>div>
                                                                                </div>div>
                                                              </div>div>
                                              </div>div>
                                              <div><h2 className="text-2xl font-bold text-white mb-2">{result.verdict}</h2>h2><p className="text-gray-400 max-w-xl mx-auto">{result.summary}</p>p></div>div>
                                </div>div>
                                <div className="grid md:grid-cols-2 gap-6">
                                              <div className="space-y-4">
                                                              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> The Roast</h3>h3>
                                                {result.roasts.map((roast, i) => (<div key={i} className={`p-4 rounded-xl border ${getSeverityColor(roast.severity)}`}><div className="fl'euxs ei tcelmise-nstt'a;r
                                                t
                                                 igmappo-r3t" >{{ guesteSSetvaetrei,t yuIsceoCna(lrlobaasctk.,s euvseerEiftfye)c}t<,d iuvs ecRleafs s}N afmreo=m" f'lreexa-c1t"'>;<
                      hi4m pcolrats s{N aUmpel=o"afdo,n tF-isleemTiebxotl,d  Ftleaxmte-,w hAilteer tmTbr-i1a"n>g{lreo,a sCth.etciktClier}c<l/eh,4 >T<apr gcelta,s sZNaapm,e =T"rteenxdti-nggrUapy,- 3X0,0  Ltoeaxdte-rs2m  }m bf-r2o"m> {'rlouacsitd.ei-srseuaec}t<'/;p
                        >
                        <ddeicvl acrlea sgslNoabmael= "{b
                          g - bilnatcekr/f3a0c er oWuinnddeodw- l{g
                              p - 3 "p>d<fpj scLliabs:s Naanmye;=
                        " t e}x
                        t}-
                        g
                        rienetne-r4f0a0c et eRxota-sstmR"e>s<uslttr o{n
                                                                      g > Foivxe:r<a/lsltSrcoonrge>:  {nruomabsetr.;f
                                                                        i x }v<e/rpd>i<c/td:i vs>t<r/idnigv;>
                        < / dsiuvm>m<a/rdyi:v >s)t)r}i
                        n g ; 
                             r o a s t s :   A<r/rdaiyv<>{
                               
                                        s e v e r i t y :  <'dcirvi tcilcaasls'N a|m e'=m"asjpoarc'e -|y -'6m"i>n
                                        o r '   |   ' s u g g e s t i o n<'d;i
                                        v   c l atsistNlaem:e =s"trroiansgt;-
                                        c a r d  ips-s6u er:o usntdreidn-gx;l
                                        " > < h 3f icxl:a ssstNraimneg=;"
                                        t e x t -olrgi gfionnatl-Tbeoxltd? :t esxttr-iwnhgi;t
                                        e   f}l>e;x
                                          i tsetmrse-ncgetnhtse:r  sgtarpi-n2g [m]b;-
                                        4 " >m<iCshseicnkgCKierycwloer dcsl:a ssstNraimneg=["]w;-
                                        5   hq-u5a ntteixfti-cgarteieonn-O5p0p0o"r t/u>n iWthiaets':s  sWtorriknign[g]<;/
                                        h 3 >a<tuslS ccolraes:s Nnaummeb=e"rs;p
                                        a c ea-tys-I2s"s>u{erse:s uslttr.isntgr[e]n;g
                                        t h sr.emwarpi(t(tse,n Biu)l l=e>t s(:< lAir rkaeyy<={{
                                                                        i }   c loarsisgNianmael=:" tsetxrti-nggr;a
                                        y - 3 0 0i mfplreoxv eidt:e msst-rsitnagr;t
                                          g a}p>-;2
                                        "}>
                                        <
                                                                        sepxapno rctl adsesfNaaumlet= "ftuenxctt-igorne eHno-m5e0(0)  m{t
                                                                          - 1 "c>o✓n<s/ts p[arne>s{usm}e<T/elxit>,) )s}e<t/Ruels>u<m/edTievx>t
                                        ]   =   u s e S t a t e ( ' ' ) ;<
                                                                          d i vc ocnlsats s[Ntaamreg=e"trRooalset,- csaertdT apr-g6e trRooulned]e d=- xuls"e>S<tha3t ec(l'a's)s;N
                                        a m ec=o"ntsetx t[-ilsgL ofaodnitn-gb,o lsde ttIesxLto-awdhiintge]  f=l euxs eiStteamtse-(cfeanltseer) ;g
                                        a p -c2o nmsbt- 4["r>e<sFuillte,T esxett RcelsauslstN]a m=e =u"swe-S5t aht-e5< Rtoeaxstt-Rbelsuuel-t5 0|0 "n u/l>l >A(TnSu lClo)m;p
                                        a t icboinlsitt y[<e/rhr3o>r<,d isve tcElrarsosrN]a m=e =u"sfelSetxa</></></></></></main>
