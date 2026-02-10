
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from './services/geminiService';
import { AppStatus, GeometryData } from './types';
import DrawingCanvas from './components/DrawingCanvas';

const App: React.FC = () => {
  const [problemText, setProblemText] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [geometryCode, setGeometryCode] = useState<string>('');
  const [geometryData, setGeometryData] = useState<GeometryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-pro');

  const models = [
    { id: 'gemini-2.5-flash', name: 'Gemini-2.5-flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini-2.5-pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini-1.5-flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini-1.5-pro' },
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API Key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);

    const savedModel = localStorage.getItem('gemini_model');
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  // Save API Key to localStorage when changed
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('gemini_model', selectedModel);
  }, [selectedModel]);

  // Handle ESC key globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPointId(null);
        setShowApiKeyInput(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCode = async () => {
    if (!problemText && !imageData) {
      setError('Vui lòng nhập đề bài hoặc tải ảnh lên.');
      return;
    }
    try {
      setStatus(AppStatus.ANALYZING);
      setError(null);
      const data = await geminiService.generateGeometryCode(problemText, imageData || undefined, apiKey, selectedModel);
      setGeometryCode(JSON.stringify(data, null, 2));
      setStatus(AppStatus.EDITING_CODE);
      setGeometryData(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi không xác định.");
      setStatus(AppStatus.IDLE);
    }
  };

  const handleStartDrawing = () => {
    try {
      setError(null);
      const parsedData = JSON.parse(geometryCode);
      setGeometryData(parsedData);
      setStatus(AppStatus.COMPLETED);
    } catch (err) {
      setError("Lỗi định dạng Code (JSON). Vui lòng kiểm tra lại các dấu ngoặc hoặc dấu phẩy.");
    }
  };

  const handleUpdatePointOffset = (pointId: string, dx: number, dy: number) => {
    if (!geometryData) return;
    const newData = { ...geometryData };
    const p = newData.points.find(pt => pt.id === pointId);
    if (p) {
      p.labelOffsetX = (p.labelOffsetX || 0) + dx;
      p.labelOffsetY = (p.labelOffsetY || 0) + dy;
      setGeometryData(newData);
      setGeometryCode(JSON.stringify(newData, null, 2));
    }
  };

  const handleCanvasClick = async (x: number, y: number) => {
    // Shading functionality removed
  };

  const downloadImage = () => {
    const svg = document.querySelector('svg');
    if (!svg) return;

    const vw = 400, vh = 400, scale = 4;
    const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('width', (vw * scale).toString());
    clonedSvg.setAttribute('height', (vh * scale).toString());

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = vw * scale;
    canvas.height = vh * scale;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = 'Ve_hinh_AI_VN.png';
        link.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setProblemText('');
    setImageData(null);
    setGeometryCode('');
    setGeometryData(null);
    setError(null);
    setSelectedPointId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
            <i className="fa-solid fa-shapes text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Vẽ hình AI</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wider">GEOMETRY ENGINE</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* API Key Settings Button */}
          <div className="relative">
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={`text-sm font-semibold transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm border ${apiKey ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200 animate-pulse'}`}
            >
              <i className={`fa-solid ${apiKey ? 'fa-key' : 'fa-triangle-exclamation'}`}></i>
              {apiKey ? 'API Key OK' : 'Nhập API Key'}
            </button>

            {showApiKeyInput && (
              <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-[100] animate-in slide-in-from-top-2 fade-in duration-200">
                <label className="block text-xs font-bold text-slate-700 mb-2">Google Gemini API Key</label>
                <div className="relative">
                  <input
                    type="password"
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Dán mã API của bạn..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <div className="absolute right-3 top-2.5 text-slate-400">
                    <i className="fa-solid fa-lock"></i>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  * Key được lưu an toàn trên trình duyệt của bạn.
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-xs text-indigo-600 hover:underline font-medium"
                >
                  Lấy API Key miễn phí tại đây <i className="fa-solid fa-arrow-up-right-from-square ml-1"></i>
                </a>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-2">Chọn phiên bản Model AI</label>
                  <div className="space-y-2">
                    {models.map((model) => (
                      <label key={model.id} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${selectedModel === model.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}>
                        <input
                          type="radio"
                          name="gemini_model"
                          value={model.id}
                          checked={selectedModel === model.id}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="mt-0.5"
                        />
                        <span className="text-xs text-slate-700 font-medium leading-tight">{model.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {showApiKeyInput && (
              <div className="fixed inset-0 z-[90]" onClick={() => setShowApiKeyInput(false)}></div>
            )}
          </div>

          {status !== AppStatus.IDLE && (
            <button onClick={reset} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg shadow-sm">
              <i className="fa-solid fa-rotate-right"></i> Làm mới
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-6">
          {status === AppStatus.IDLE || status === AppStatus.ANALYZING ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 animate-in fade-in slide-in-from-left-4 duration-500">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <i className="fa-solid fa-file-pen text-indigo-500"></i>
                Bước 1: Nhập đề bài
              </h2>
              <textarea
                className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed transition-all"
                placeholder="Ví dụ: Cho tam giác ABC vuông tại A, đường cao AH..."
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                disabled={status === AppStatus.ANALYZING}
              />
              <div className="mt-4">
                <div onClick={() => status === AppStatus.IDLE && fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${imageData ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-300 hover:border-indigo-400'}`}>
                  {imageData ? (
                    <div className="relative w-full h-32">
                      <img src={imageData} className="w-full h-full object-contain rounded" alt="Preview" />
                      <button onClick={(e) => { e.stopPropagation(); setImageData(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                  ) : (
                    <><i className="fa-solid fa-camera text-2xl text-slate-400 mb-2"></i><span className="text-xs text-slate-500 text-center font-medium">Hoặc tải ảnh chụp đề bài</span></>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
              </div>
              {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-2 animate-in slide-in-from-bottom-2"><i className="fa-solid fa-circle-exclamation"></i>{error}</div>}
              <button onClick={handleCreateCode} disabled={status === AppStatus.ANALYZING || (!problemText && !imageData)} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                {status === AppStatus.ANALYZING ? <><i className="fa-solid fa-spinner animate-spin"></i> Đang tạo Code...</> : <>Tạo Code Hình Học <i className="fa-solid fa-code ml-1"></i></>}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 animate-in fade-in slide-in-from-left-4 duration-500 flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <i className="fa-solid fa-code text-indigo-500"></i>
                  Bước 2: Hiệu chỉnh Code
                </h2>
                <button onClick={() => setStatus(AppStatus.IDLE)} className="text-xs text-indigo-600 font-bold hover:underline">Sửa đề bài</button>
              </div>
              <p className="text-xs text-slate-500 mb-3 font-medium">Hiệu chỉnh tọa độ JSON hoặc kéo thả nhãn trên hình vẽ.</p>

              <div className="flex-1 relative font-mono text-sm">
                <textarea
                  className="w-full h-full p-4 bg-slate-900 text-indigo-300 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none overflow-auto"
                  value={geometryCode}
                  onChange={(e) => setGeometryCode(e.target.value)}
                  spellCheck={false}
                />
              </div>

              {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-2"><i className="fa-solid fa-circle-exclamation"></i>{error}</div>}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleStartDrawing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                  Cập nhật hình vẽ <i className="fa-solid fa-wand-magic-sparkles"></i>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[500px] overflow-hidden relative">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                <span className="w-3 h-3 rounded-full bg-green-400"></span>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Không gian hình học</span>
              <div className="flex items-center gap-2">
                {status === AppStatus.COMPLETED && (
                  <button onClick={downloadImage} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-md flex items-center gap-1.5 transition-all">
                    <i className="fa-solid fa-download"></i> Tải PNG
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-white relative">
              {status === AppStatus.IDLE && (
                <div className="text-center space-y-4 opacity-30">
                  <i className="fa-solid fa-compass-drafting text-8xl text-slate-200"></i>
                  <p className="text-slate-400 text-sm font-medium">Nhập đề bài để bắt đầu phác thảo</p>
                </div>
              )}

              {status === AppStatus.ANALYZING && (
                <div className="text-center space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-indigo-600 font-bold text-lg">Đang trích xuất dữ liệu...</p>
                    <p className="text-slate-400 text-sm">Vui lòng chờ trong giây lát</p>
                  </div>
                </div>
              )}

              {geometryData && (status === AppStatus.COMPLETED || status === AppStatus.EDITING_CODE) && (
                <div className="w-full h-full flex items-center justify-center overflow-hidden animate-in zoom-in-90 duration-500 relative">
                  <DrawingCanvas
                    data={geometryData}
                    onUpdatePointOffset={handleUpdatePointOffset}
                    onCanvasClick={handleCanvasClick}
                    onPointSelect={setSelectedPointId}
                    selectedPointId={selectedPointId}
                    isIdentifying={false}
                    interactive={status === AppStatus.COMPLETED || status === AppStatus.EDITING_CODE}
                  />
                </div>
              )}
            </div>
          </div>

          {(status === AppStatus.COMPLETED || status === AppStatus.EDITING_CODE) && geometryData && (
            <div className="mt-4 grid grid-cols-1 animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-tag text-4xl"></i>
                </div>
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm z-10">
                  <i className="fa-solid fa-arrows-up-down-left-right text-sm"></i>
                </div>
                <span className="text-xs text-slate-700 font-semibold leading-relaxed z-10">
                  <strong>Cân chỉnh nhãn:</strong> Click vào nhãn để di chuyển. (ESC để hủy chọn).
                </span>
              </div>
            </div>
          )}
        </div>
      </main >

      <footer className="py-6 px-4 text-center text-slate-400 text-xs border-t border-slate-200 bg-white">
        <p className="mb-1 font-semibold">ĐỖ CÔNG DƯƠNG - THCS TT GIA LỘC - 0985796031</p>
        <p>&copy; {new Date().getFullYear()} Vẽ hình bằng AI</p>
      </footer>
    </div >
  );
};

export default App;
