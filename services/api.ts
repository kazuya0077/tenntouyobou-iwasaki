import { PhysicalMeasurements, QuestionnaireAnswers, UserProfile, CalculatedScores } from '../types';

export const saveToSheet = async (
  profile: UserProfile,
  measurements: PhysicalMeasurements,
  answers: QuestionnaireAnswers,
  scores: CalculatedScores,
  comment: string,
  gasUrl: string
): Promise<{ success: boolean; message: string }> => {
  
  if (!gasUrl) {
    return { success: false, message: 'API URLが設定されていません。' };
  }

  // 送信するデータ構造 (GAS側で列に合わせて展開します)
  const payload = {
    timestamp: new Date().toISOString(),
    ...profile,
    ...measurements,
    ...answers,
    scores,
    comment
  };

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (result.status === 'success') {
      return { success: true, message: 'データを保存しました。' };
    } else {
      return { success: false, message: '保存に失敗しました: ' + (result.message || '不明なエラー') };
    }

  } catch (error: any) {
    console.error('Save error:', error);
    return { success: false, message: '通信エラーが発生しました。インターネット接続を確認してください。' };
  }
};
