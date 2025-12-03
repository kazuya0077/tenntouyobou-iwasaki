import { PhysicalMeasurements, QuestionnaireAnswers, ChartDataPoint, CalculatedScores } from '../types';

/**
 * 身体機能計測結果(Ⅰ)のスコア計算 (1-5点)
 * 厚生労働省「転倒等リスク評価セルフチェック票」基準に基づく
 * 入力が空文字の場合は0として扱う
 */
const calculatePhysicalScore = (measurements: PhysicalMeasurements): { p1: number, p2: number, p3: number, p4: number, p5: number } => {
  // 値を安全に取り出すヘルパー
  const val = (v: number | string) => Number(v) || 0;

  const height = val(measurements.height);
  const stepTwo = val(measurements.stepTwo); // 良い方の値
  const stepSeated = val(measurements.stepSeated);
  const functionalReach = val(measurements.functionalReach); // 良い方の値
  const closed = val(measurements.singleLegStanceClosed); // 良い方の値
  const open = val(measurements.singleLegStanceOpen); // 良い方の値

  // ① 2ステップテスト
  // 評価値 = 距離(cm) ÷ 身長(cm)
  // 1: ～1.24
  // 2: 1.25 ～ 1.38
  // 3: 1.39 ～ 1.46
  // 4: 1.47 ～ 1.65
  // 5: 1.66 以上
  let p1 = 1;
  if (height > 0) {
    const stepValue = stepTwo / height;
    if (stepValue < 1.25) p1 = 1;
    else if (stepValue < 1.39) p1 = 2;
    else if (stepValue < 1.47) p1 = 3;
    else if (stepValue < 1.66) p1 = 4;
    else p1 = 5;
  }

  // ② 座位ステッピング (回)
  // 1: ～24
  // 2: 25～28
  // 3: 29～43
  // 4: 44～47
  // 5: 48以上
  let p2 = 1;
  if (stepSeated <= 24) p2 = 1;
  else if (stepSeated <= 28) p2 = 2;
  else if (stepSeated <= 43) p2 = 3;
  else if (stepSeated <= 47) p2 = 4;
  else p2 = 5;

  // ③ ファンクショナルリーチ (cm)
  // 1: ～19
  // 2: 20～29
  // 3: 30～35
  // 4: 36～39
  // 5: 40以上
  let p3 = 1;
  if (functionalReach <= 19) p3 = 1;
  else if (functionalReach <= 29) p3 = 2;
  else if (functionalReach <= 35) p3 = 3;
  else if (functionalReach <= 39) p3 = 4;
  else p3 = 5;

  // ④ 閉眼片足立ち (秒)
  // 1: ～7.0
  // 2: 7.1～17.0
  // 3: 17.1～55.0
  // 4: 55.1～90.0
  // 5: 90.1以上
  let p4 = 1;
  if (closed <= 7.0) p4 = 1;
  else if (closed <= 17.0) p4 = 2;
  else if (closed <= 55.0) p4 = 3;
  else if (closed <= 90.0) p4 = 4;
  else p4 = 5;

  // ⑤ 開眼片足立ち (秒)
  // 1: ～15.0
  // 2: 15.1～30.0
  // 3: 30.1～84.0
  // 4: 84.1～120.0
  // 5: 120.1以上
  let p5 = 1;
  if (open <= 15.0) p5 = 1;
  else if (open <= 30.0) p5 = 2;
  else if (open <= 84.0) p5 = 3;
  else if (open <= 120.0) p5 = 4;
  else p5 = 5;

  return { p1, p2, p3, p4, p5 };
};

/**
 * 質問票(Ⅱ)のスコア計算
 * 合計点数: 2~3->1, 4~5->2, 6~7->3, 8~9->4, 10->5
 */
const convertSumToScore = (sum: number): number => {
  if (sum <= 3) return 1;
  if (sum <= 5) return 2;
  if (sum <= 7) return 3;
  if (sum <= 9) return 4;
  return 5;
};

const calculateMentalScore = (answers: QuestionnaireAnswers): { m1: number, m2: number, m3: number, m4: number, m5: number } => {
  // ① 歩行能力・筋力 (Q1 + Q2)
  const m1 = convertSumToScore(answers.q1 + answers.q2);

  // ② 敏捷性 (Q3 + Q4) 
  const m2 = convertSumToScore(answers.q3 + answers.q4);

  // ③ 動的バランス (Q5 + Q6)
  const m3 = convertSumToScore(answers.q5 + answers.q6);

  // ④ 静的バランス 閉眼 (Q7)
  const m4 = answers.q7;

  // ⑤ 静的バランス 開眼 (Q8 + Q9)
  const m5 = convertSumToScore(answers.q8 + answers.q9);

  return { m1, m2, m3, m4, m5 };
};

/**
 * チャート用データ生成
 */
export const calculateChartData = (
  measurements: PhysicalMeasurements,
  answers: QuestionnaireAnswers
): { radarData: ChartDataPoint[], scores: CalculatedScores } => {
  
  const pScores = calculatePhysicalScore(measurements);
  const mScores = calculateMentalScore(answers);

  const radarData: ChartDataPoint[] = [
    { subject: '①歩行能力', physicalScore: pScores.p1, mentalScore: mScores.m1, fullMark: 5 },
    { subject: '②敏捷性', physicalScore: pScores.p2, mentalScore: mScores.m2, fullMark: 5 },
    { subject: '③動的バランス', physicalScore: pScores.p3, mentalScore: mScores.m3, fullMark: 5 },
    { subject: '④静的(閉眼)', physicalScore: pScores.p4, mentalScore: mScores.m4, fullMark: 5 },
    { subject: '⑤静的(開眼)', physicalScore: pScores.p5, mentalScore: mScores.m5, fullMark: 5 },
  ];

  return {
    radarData,
    scores: { ...pScores, ...mScores }
  };
};

/**
 * 総合評価コメント生成
 */
export const generateAdvice = (radarData: ChartDataPoint[]): string => {
  let comment = "";
  
  // 平均スコア
  const avgPhysical = radarData.reduce((acc, cur) => acc + cur.physicalScore, 0) / 5;
  
  // 乖離チェック
  let physicalIsHigher = 0;
  let mentalIsHigher = 0;
  let equal = 0;

  radarData.forEach(d => {
    if (d.physicalScore > d.mentalScore) physicalIsHigher++;
    else if (d.mentalScore > d.physicalScore) mentalIsHigher++;
    else equal++;
  });

  const isLowPhysical = avgPhysical <= 2.5;

  // パターン判定
  if (physicalIsHigher >= 3) {
    comment += "【パターン: 身体機能 ＞ 自己認識】\n";
    comment += "あなたの身体機能は、自己認識よりも高い状態にあります。ご自身の体力を慎重に見積もっています。\n";
    if (isLowPhysical) {
       comment += "ただし、全体的な数値が低いため転倒リスクには注意が必要です。引き続き体力向上に努めてください。\n";
    } else {
       comment += "慢心せず、現在の良好な体力を維持しましょう。\n";
    }
  } else if (mentalIsHigher >= 3) {
    comment += "【パターン: 身体機能 ＜ 自己認識】\n";
    comment += "あなたの身体機能は、自己認識よりも低い状態です。「自分はまだ大丈夫」と思っていても、体が追いつかない可能性があります。\n";
    comment += "急な動作は転倒のもとです。足元をよく見て、ゆっくり行動することを心がけましょう。\n";
  } else {
    if (avgPhysical >= 3.5) {
      comment += "【パターン: バランス良好】\n";
      comment += "身体機能と自己認識のズレが少なく、数値も良好です。\n";
      comment += "ご自身の状態を正しく理解できています。この調子で運動習慣を続けましょう。\n";
    } else {
      comment += "【パターン: 要注意】\n";
      comment += "身体機能と自己認識のズレは少ないですが、全体的に数値が低下しています。\n";
      comment += "転倒リスクが高まっていることを自覚されています。無理をせず、手すりを使うなど安全対策を行いましょう。\n";
    }
  }

  // 個別項目のチェック
  const lowItems = radarData.filter(d => d.physicalScore <= 2);
  if (lowItems.length > 0) {
    comment += "\n【特に注意が必要な項目 (2以下)】\n" + lowItems.map(d => "・" + d.subject).join("\n");
  }

  return comment;
};