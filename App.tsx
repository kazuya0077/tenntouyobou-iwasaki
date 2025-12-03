
import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Activity, ClipboardList, Download, Save, User, CheckCircle2, AlertCircle } from 'lucide-react';

import { Gender, PhysicalMeasurements, QuestionnaireAnswers, UserProfile } from './types';
import { calculateChartData, generateAdvice } from './utils/scoring';
import RadarChartComponent from './components/RadarChart';
import { saveToSheet } from './services/api';

// ユーザーから指定されたGAS URL
const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbzHbg5zmZtJy01SqbOrsnIH6Bdk5tx_glAUH7nmIBsKZcoHgbjo0ACCvRwUnOImVdFPsg/exec";

// 生の入力データを保持するインターフェース（2回測定対応）
interface RawInputMeasurements {
  height: string;
  stepTwo_1: string;
  stepTwo_2: string;
  stepSeated: string;
  functionalReach_1: string;
  functionalReach_2: string;
  singleLegStanceClosed_1: string;
  singleLegStanceClosed_2: string;
  singleLegStanceOpen_1: string;
  singleLegStanceOpen_2: string;
}

// 2回計測用の入力コンポーネント（モダンUI）
const DualInput = ({ 
  label, unit, 
  val1, val2, 
  k1, k2, 
  bestVal,
  onChange
}: { 
  label: string, unit: string, 
  val1: string, val2: string, 
  k1: keyof RawInputMeasurements, k2: keyof RawInputMeasurements,
  bestVal: number | '',
  onChange: (key: keyof RawInputMeasurements, val: string) => void
}) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-bold text-slate-800">{label}</h3>
      <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">2回測定 → 最大値採用</span>
    </div>
    
    <div className="grid grid-cols-2 gap-6 mb-4">
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-1">1回目</label>
        <div className="relative">
          <input 
            type="text" 
            inputMode="decimal"
            value={val1} 
            onChange={(e) => onChange(k1, e.target.value)} 
            className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-semibold text-center transition-all"
            placeholder="0"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{unit}</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-1">2回目</label>
        <div className="relative">
          <input 
            type="text"
            inputMode="decimal"
            value={val2} 
            onChange={(e) => onChange(k2, e.target.value)} 
            className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-semibold text-center transition-all"
            placeholder="0"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{unit}</span>
        </div>
      </div>
    </div>
    
    <div className="flex items-center justify-between bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
      <span className="text-sm font-semibold text-indigo-800">採用記録</span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-indigo-700">
          {bestVal !== '' ? bestVal : '-'}
        </span>
        <span className="text-sm text-indigo-600">{unit}</span>
      </div>
    </div>
  </div>
);

// 質問項目コンポーネント
// 重要: 再レンダリング時のDOM再生成とフォーカス消失を防ぐため、Appの外で定義する
interface RadioQuestionProps {
  qKey: keyof QuestionnaireAnswers;
  text: string;
  options: string[];
  currentVal: number;
  onChange: (key: keyof QuestionnaireAnswers, val: number) => void;
}

const RadioQuestion: React.FC<RadioQuestionProps> = ({ qKey, text, options, currentVal, onChange }) => (
  <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
    <p className="font-bold text-slate-800 mb-4 text-lg">
      {text}
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
      {options.map((opt, idx) => {
        const val = idx + 1;
        const isSelected = currentVal === val;
        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onChange(qKey, val);
            }}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
              isSelected 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border mb-2 flex items-center justify-center ${
              isSelected ? 'border-white' : 'border-slate-300'
            }`}>
              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <span className="text-sm font-bold text-center leading-tight">
              {opt}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

const App: React.FC = () => {
  // --- State Definitions ---
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    age: '', 
    gender: Gender.MALE,
  });

  const [rawMeasurements, setRawMeasurements] = useState<RawInputMeasurements>({
    height: '',
    stepTwo_1: '', stepTwo_2: '',
    stepSeated: '',
    functionalReach_1: '', functionalReach_2: '',
    singleLegStanceClosed_1: '', singleLegStanceClosed_2: '',
    singleLegStanceOpen_1: '', singleLegStanceOpen_2: '',
  });

  const [answers, setAnswers] = useState<QuestionnaireAnswers>({
    q1: 3, q2: 3, q3: 3, q4: 3, q5: 3, q6: 3, q7: 3, q8: 3, q9: 3
  });

  const [gasUrl, setGasUrl] = useState<string>(DEFAULT_GAS_URL);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | ''; msg: string }>({ type: '', msg: '' });

  // --- Handlers ---
  const handleRawChange = (key: keyof RawInputMeasurements, val: string) => {
    const normalized = val.replace(/[０-９．]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    if (normalized === '' || /^\d*\.?\d*$/.test(normalized)) {
      setRawMeasurements(prev => ({ ...prev, [key]: normalized }));
    }
  };

  const handleProfileAgeChange = (val: string) => {
    const normalized = val.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    if (normalized === '' || /^\d*$/.test(normalized)) {
       const num = normalized === '' ? '' : parseInt(normalized);
       setProfile(prev => ({ ...prev, age: num }));
    }
  };

  const handleAnswerChange = (key: keyof QuestionnaireAnswers, val: number) => {
    setAnswers(prev => ({ ...prev, [key]: val }));
  };

  // --- Computed Measurements ---
  const measurements: PhysicalMeasurements = useMemo(() => {
    const parse = (v: string): number => {
      const p = parseFloat(v);
      return isNaN(p) ? 0 : p;
    };
    const hasVal = (v: string) => v !== '' && !isNaN(parseFloat(v));

    const height = hasVal(rawMeasurements.height) ? parse(rawMeasurements.height) : '';
    const seat = hasVal(rawMeasurements.stepSeated) ? parse(rawMeasurements.stepSeated) : '';

    const calcBest = (v1: string, v2: string): number | '' => {
      if (!hasVal(v1) && !hasVal(v2)) return '';
      return Math.max(parse(v1), parse(v2));
    };

    return {
      height: height,
      stepTwo: calcBest(rawMeasurements.stepTwo_1, rawMeasurements.stepTwo_2),
      stepSeated: seat,
      functionalReach: calcBest(rawMeasurements.functionalReach_1, rawMeasurements.functionalReach_2),
      singleLegStanceClosed: calcBest(rawMeasurements.singleLegStanceClosed_1, rawMeasurements.singleLegStanceClosed_2),
      singleLegStanceOpen: calcBest(rawMeasurements.singleLegStanceOpen_1, rawMeasurements.singleLegStanceOpen_2),
    };
  }, [rawMeasurements]);

  const { radarData, scores } = calculateChartData(measurements, answers);
  const comment = generateAdvice(radarData);

  // --- PDF Export Logic (Strict A4 Layout) ---
  const handleExportPDF = async () => {
    const printElement = document.getElementById('print-template');
    if (!printElement) {
      alert("印刷用テンプレートが見つかりません");
      return;
    }

    try {
      const canvas = await html2canvas(printElement, { 
        scale: 2, // 高解像度
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`評価結果_${profile.name || '未記入'}.pdf`);

    } catch (err) {
      alert('PDF生成に失敗しました');
      console.error(err);
    }
  };

  const handleSaveToSheet = async () => {
    if (!gasUrl) {
      setSaveStatus({ type: 'error', msg: '保存先URLが設定されていません。' });
      return;
    }
    setIsSaving(true);
    setSaveStatus({ type: '', msg: '' });
    
    const result = await saveToSheet(
      {...profile, age: Number(profile.age) || 0}, 
      measurements, 
      answers, 
      scores, 
      comment, 
      gasUrl
    );
    
    setIsSaving(false);
    setSaveStatus({
      type: result.success ? 'success' : 'error',
      msg: result.message
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      
      {/* Navbar */}
      <div className="bg-indigo-900 text-white py-4 px-6 shadow-md mb-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-indigo-300" />
            転倒リスク評価システム
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 space-y-8">
        
        {/* GAS Status */}
        <div className="bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between text-sm">
           <div className="flex items-center gap-2 text-emerald-600 font-medium">
             <CheckCircle2 size={16} />
             <span>データベース接続: 準備完了</span>
           </div>
           <button 
             type="button"
             onClick={(e) => {
               e.preventDefault();
               const newUrl = prompt("GAS WebアプリのURLを入力してください", gasUrl);
               if (newUrl) setGasUrl(newUrl);
             }}
             className="text-slate-400 underline hover:text-slate-600"
           >
             設定
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: INPUTS */}
          <div className="space-y-6">
            
            {/* 基本情報 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><User size={18} /></span>
                基本情報
              </h2>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">お名前</label>
                    <input 
                      type="text" 
                      value={profile.name} 
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })} 
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      placeholder="例: 山田 太郎"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">年齢</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={profile.age} 
                        onChange={(e) => handleProfileAgeChange(e.target.value)} 
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                        placeholder="-"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">性別</label>
                      <select 
                        value={profile.gender} 
                        onChange={(e) => setProfile({ ...profile, gender: e.target.value as Gender })} 
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value={Gender.MALE}>男性</option>
                        <option value={Gender.FEMALE}>女性</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 身体機能計測 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Activity size={18} /></span>
                身体機能計測
              </h2>
              
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
                 <AlertCircle size={16} className="mt-0.5 shrink-0" />
                 <p>原則として各項目を2回測定し、自動的に良い方の値が評価に使われます。</p>
              </div>

              <div className="space-y-4">
                {/* 1. 2ステップ */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">① 2ステップテスト</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-500 mb-1">身長 (cm)</label>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={rawMeasurements.height} 
                      onChange={(e) => handleRawChange('height', e.target.value)} 
                      placeholder="例: 160"
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right font-semibold" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-500 mb-1">1回目 (cm)</label>
                       <input 
                         type="text" 
                         inputMode="decimal"
                         value={rawMeasurements.stepTwo_1} 
                         onChange={(e) => handleRawChange('stepTwo_1', e.target.value)} 
                         className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 text-center"
                         placeholder="0"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-500 mb-1">2回目 (cm)</label>
                       <input 
                         type="text" 
                         inputMode="decimal"
                         value={rawMeasurements.stepTwo_2} 
                         onChange={(e) => handleRawChange('stepTwo_2', e.target.value)} 
                         className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 text-center"
                         placeholder="0"
                       />
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                    <span className="text-sm text-slate-600 font-medium">評価値 (距離÷身長)</span>
                    <span className="text-xl font-bold text-slate-800">
                      {Number(measurements.height) > 0 && Number(measurements.stepTwo) > 0
                        ? (Number(measurements.stepTwo) / Number(measurements.height)).toFixed(2) 
                        : '-'}
                    </span>
                  </div>
                </div>

                {/* 2. 座位ステッピング */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">② 座位ステッピング</h3>
                  <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded inline-block">
                    ※練習後、20秒間を1回だけ測定
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">回数 (回)</label>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={rawMeasurements.stepSeated} 
                      onChange={(e) => handleRawChange('stepSeated', e.target.value)} 
                      placeholder="0"
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right font-semibold" 
                    />
                  </div>
                </div>

                <DualInput 
                  label="③ ファンクショナルリーチ"
                  unit="cm"
                  val1={rawMeasurements.functionalReach_1}
                  val2={rawMeasurements.functionalReach_2}
                  k1="functionalReach_1"
                  k2="functionalReach_2"
                  bestVal={measurements.functionalReach}
                  onChange={handleRawChange}
                />
                <DualInput 
                  label="④ 閉眼片脚立位"
                  unit="秒"
                  val1={rawMeasurements.singleLegStanceClosed_1}
                  val2={rawMeasurements.singleLegStanceClosed_2}
                  k1="singleLegStanceClosed_1"
                  k2="singleLegStanceClosed_2"
                  bestVal={measurements.singleLegStanceClosed}
                  onChange={handleRawChange}
                />
                <DualInput 
                  label="⑤ 開眼片脚立位"
                  unit="秒"
                  val1={rawMeasurements.singleLegStanceOpen_1}
                  val2={rawMeasurements.singleLegStanceOpen_2}
                  k1="singleLegStanceOpen_1"
                  k2="singleLegStanceOpen_2"
                  bestVal={measurements.singleLegStanceOpen}
                  onChange={handleRawChange}
                />
              </div>
            </section>

            {/* 質問票 */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600"><ClipboardList size={18} /></span>
                質問票・自己認識
              </h2>
              <RadioQuestion 
                qKey="q1" 
                text="1. 人ごみの中、正面から来る人にぶつからず、よけて歩けますか" 
                options={['自信がない', 'あまり自信がない', '人並み程度', '少し自信がある', '自信がある']} 
                currentVal={answers.q1}
                onChange={handleAnswerChange}
              />
              <RadioQuestion 
                qKey="q2" 
                text="2. 同年代に比べて体力に自信はありますか" 
                options={['自信がない', 'あまり自信がない', '人並み程度', 'やや自信がある', '自信がある']} 
                currentVal={answers.q2}
                onChange={handleAnswerChange}
              />
              <RadioQuestion 
                qKey="q3" 
                text="3. 突発的な事態に対する体の反応は素早い方と思いますか" 
                options={['素早くない', 'あまり素早くない', '普通', 'やや素早い', '素早い']} 
                currentVal={answers.q3}
                onChange={handleAnswerChange}
              />
              <RadioQuestion 
                qKey="q4" 
                text="4. 歩行中、小さい段差に足を引っ掛けたとき、すぐに次の足が出ると思いますか" 
                options={['自信がない', 'あまり自信がない', '少し自信がある', 'かなり自信がある', 'とても自信がある']} 
                currentVal={answers.q4}
                onChange={handleAnswerChange}
              />
              <RadioQuestion 
                qKey="q5" 
                text="5. 片足で立ったまま靴下を履くことができると思いますか" 
                options={['できない', '難しい', 'たまにできる', 'できると思う', 'できる']} 
                currentVal={answers.q5}
                onChange={handleAnswerChange}
              />
              <RadioQuestion 
                qKey="q6" 
                text="6. 一直線に引いたラインの上を、継ぎ足歩行で簡単に歩くことができると思いますか" 
                options={['できない', 'ずれてしまう', 'ゆっくりなら', '普通にできる', '簡単にできる']} 
                currentVal={answers.q6}
                onChange={handleAnswerChange}
              />
              <RadioQuestion 
                qKey="q7" 
                text="7. 眼を閉じて片足でどのくらい立つ自信がありますか" 
                options={['10秒以内', '20秒程度', '40秒程度', '1分程度', 'それ以上']} 
                currentVal={answers.q7}
                onChange={handleAnswerChange}
              />
              <RadioQuestion 
                qKey="q8" 
                text="8. 電車に乗って、つり革につかまらずどのくらい立っていられると思いますか" 
                options={['10秒以内', '30秒程度', '1分程度', '2分程度', '3分以上']} 
                currentVal={answers.q8}
                onChange={handleAnswerChange}
              />
              <RadioQuestion 
                qKey="q9" 
                text="9. 眼を開けて片足でどのくらい立つ自信がありますか" 
                options={['15秒以内', '30秒程度', '1分程度', '1分30秒', '2分以上']} 
                currentVal={answers.q9}
                onChange={handleAnswerChange}
              />
            </section>
          </div>

          {/* RIGHT COLUMN: REPORT & ACTIONS */}
          <div className="space-y-6">
            
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xl sticky top-6">
              <div className="border-b pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">評価レポート</h2>
                  <p className="text-sm text-slate-500">測定日: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-800">{profile.name || '未記入'} 様</p>
                  <p className="text-sm text-slate-500">{profile.age ? profile.age + '歳' : ''} {profile.gender}</p>
                </div>
              </div>

              {/* Chart */}
              <div className="flex justify-center mb-6">
                <div className="w-full max-w-[400px]">
                  <RadarChartComponent data={radarData} />
                </div>
              </div>
              <div className="flex justify-center gap-6 mb-8 text-sm font-bold">
                 <span className="flex items-center gap-2"><span className="w-3 h-3 bg-black rounded-sm"></span>身体機能</span>
                 <span className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-sm"></span>自己認識</span>
              </div>

              {/* Advice */}
              <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100 mb-8">
                <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={20} /> 評価・アドバイス
                </h3>
                <p className="text-indigo-950 text-sm leading-relaxed whitespace-pre-wrap">
                  {comment}
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                 <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSaveToSheet();
                  }}
                  disabled={isSaving}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-bold text-white shadow transition-all ${
                    isSaving ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700 active:translate-y-0.5'
                  }`}
                >
                  <Save size={20} />
                  {isSaving ? '保存中...' : 'クラウドへ保存'}
                </button>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleExportPDF();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-4 rounded-lg font-bold shadow transition-all active:translate-y-0.5"
                >
                  <Download size={20} />
                  PDFをダウンロード
                </button>
              </div>

               {/* Status */}
               {saveStatus.msg && (
                <div className={`mt-4 p-3 rounded-lg text-sm text-center ${
                  saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {saveStatus.msg}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* =================================================================================
          印刷専用テンプレート (隠し要素 - A4固定レイアウト)
          画面UIとは完全に独立した、帳票として美しいデザイン。
         ================================================================================= */}
      <div 
        id="print-template" 
        className="fixed top-0 left-[-10000px] bg-white text-slate-900"
        style={{ width: '794px', height: '1123px', padding: '40px', boxSizing: 'border-box' }}
      >
        {/* Header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">転倒リスク評価結果レポート</h1>
            <p className="text-sm text-slate-600">測定日: {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
             <p className="text-2xl font-bold text-slate-900">{profile.name || '未記入'} 様</p>
             <p className="text-base text-slate-700">{profile.age ? profile.age + '歳' : ''} {profile.gender}</p>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="flex flex-row gap-8 mb-8 items-start h-[400px]">
          {/* Chart */}
          <div className="w-1/2 flex flex-col items-center justify-center border border-slate-200 rounded-lg p-4 h-full">
             <h3 className="text-base font-bold mb-2 w-full text-center border-b pb-2">Ⅲ レーダーチャート</h3>
             <div style={{ width: '100%', height: '300px' }}>
                <RadarChartComponent data={radarData} />
             </div>
             <div className="flex gap-4 mt-2 justify-center">
                <span className="text-xs font-bold text-black flex items-center gap-1">
                   <span className="w-3 h-1 bg-black inline-block"></span>身体機能
                </span>
                <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                   <span className="w-3 h-1 border-t border-red-600 border-dashed inline-block"></span>自己認識
                </span>
             </div>
          </div>

          {/* Table */}
          <div className="w-1/2 flex flex-col justify-start h-full">
             <h3 className="text-base font-bold mb-2 border-b pb-2">スコア詳細</h3>
             <table className="w-full border-collapse border border-slate-400 text-center text-sm">
                <thead>
                   <tr className="bg-slate-100">
                      <th className="border border-slate-400 p-2">項目</th>
                      <th className="border border-slate-400 p-2 w-10">①<br/>歩行</th>
                      <th className="border border-slate-400 p-2 w-10">②<br/>敏捷</th>
                      <th className="border border-slate-400 p-2 w-10">③<br/>動的</th>
                      <th className="border border-slate-400 p-2 w-10">④<br/>静閉</th>
                      <th className="border border-slate-400 p-2 w-10">⑤<br/>静開</th>
                   </tr>
                </thead>
                <tbody>
                   <tr>
                      <td className="border border-slate-400 p-3 font-bold bg-white">身体機能</td>
                      <td className="border border-slate-400 p-3 font-bold text-lg">{scores.p1}</td>
                      <td className="border border-slate-400 p-3 font-bold text-lg">{scores.p2}</td>
                      <td className="border border-slate-400 p-3 font-bold text-lg">{scores.p3}</td>
                      <td className="border border-slate-400 p-3 font-bold text-lg">{scores.p4}</td>
                      <td className="border border-slate-400 p-3 font-bold text-lg">{scores.p5}</td>
                   </tr>
                   <tr>
                      <td className="border border-slate-400 p-3 font-bold bg-red-50 text-red-800">自己認識</td>
                      <td className="border border-slate-400 p-3 font-bold text-lg text-red-600">{scores.m1}</td>
                      <td className="border border-slate-400 p-3 font-bold text-lg text-red-600">{scores.m2}</td>
                      <td className="border border-slate-400 p-3 font-bold text-lg text-red-600">{scores.m3}</td>
                      <td className="border border-slate-400 p-3 font-bold text-lg text-red-600">{scores.m4}</td>
                      <td className="border border-slate-400 p-3 font-bold text-lg text-red-600">{scores.m5}</td>
                   </tr>
                </tbody>
             </table>
             <div className="mt-4 text-[10px] text-slate-500">
                <p>※各スコアは5段階評価です。</p>
                <p>※身体機能(黒)と自己認識(赤)の差が大きい項目に注意してください。</p>
             </div>
          </div>
        </div>

        {/* Advice (Filling remaining space naturally) */}
        <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
           <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2 border-b border-indigo-200 pb-2">
             評価・アドバイス
           </h3>
           <p className="text-slate-900 text-sm leading-relaxed whitespace-pre-wrap font-medium">
             {comment}
           </p>
           <div className="mt-6 pt-2 border-t border-indigo-200 text-xs text-slate-500 text-right">
             本結果は簡易的な評価であり、医学的診断に代わるものではありません。
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
