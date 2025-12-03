export enum Gender {
  MALE = '男性',
  FEMALE = '女性'
}

export interface UserProfile {
  id: string;
  name: string;
  age: number | ''; // 入力中は空文字許容
  gender: Gender;
}

// Ⅰ 身体機能計測結果 (PDF Page 1)
// 入力しやすさのため、未入力状態('')を許容する
export interface PhysicalMeasurements {
  height: number | ''; // 身長(cm)
  stepTwo: number | ''; // ① 2ステップテスト (cm)
  stepSeated: number | ''; // ② 座位ステッピングテスト (回)
  functionalReach: number | ''; // ③ ファンクショナルリーチ (cm)
  singleLegStanceClosed: number | ''; // ④ 閉眼片足立ち (秒)
  singleLegStanceOpen: number | ''; // ⑤ 開眼片足立ち (秒)
}

// Ⅱ 質問票 (PDF Page 2)
// 回答は 1〜5 の数値 (PDFの①〜⑤に対応)
export interface QuestionnaireAnswers {
  q1: number; // 人ごみの中、正面から来る人にぶつからず...
  q2: number; // 同年代に比べて体力に自信はありますか
  q3: number; // 突発的な事態に対する体の反応は素早い方...
  q4: number; // 歩行中、小さい段差に足を引っかけたとき...
  q5: number; // 片足で立ったまま靴下を履くことができる...
  q6: number; // 一直線に引いたラインの上を、継ぎ足歩行で...
  q7: number; // 眼を閉じて片足でどのくらい立つ自信...
  q8: number; // 電車に乗って、つり革につかまらず...
  q9: number; // 眼を開けて片足でどのくらい立つ自信...
}

// レーダーチャート用のデータポイント
export interface ChartDataPoint {
  subject: string;
  physicalScore: number; // 身体機能スコア（黒枠）
  mentalScore: number;   // 意識スコア（赤枠）
  fullMark: number;
}

export interface CalculatedScores {
  p1: number; // ①歩行能力・筋力 (計測)
  p2: number; // ②敏捷性 (計測)
  p3: number; // ③動的バランス (計測)
  p4: number; // ④静的バランス閉眼 (計測)
  p5: number; // ⑤静的バランス開眼 (計測)
  m1: number; // ①歩行能力・筋力 (意識)
  m2: number; // ②敏捷性 (意識)
  m3: number; // ③動的バランス (意識)
  m4: number; // ④静的バランス閉眼 (意識)
  m5: number; // ⑤静的バランス開眼 (意識)
}