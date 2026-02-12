'use client';

import { useState } from 'react';

// 验证问题配置 - 可以随时修改
const VERIFICATION_QUESTION = "非诚勿扰活动是哪个学校举办的？（英文缩写，如 NYU）";
const CORRECT_ANSWERS = ["columbia", "cu", "哥大", "哥伦比亚"]; // 支持多个正确答案（小写比较）

// 群二维码图片路径 - 上传到 public/assets/group-qr.png
const QR_CODE_PATH = "/assets/group-qr.png";

export default function GroupPage() {
  const [answer, setAnswer] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedAnswer = answer.trim().toLowerCase();
    const isCorrect = CORRECT_ANSWERS.some(ans => 
      normalizedAnswer.includes(ans.toLowerCase())
    );

    if (isCorrect) {
      setVerified(true);
      setError('');
    } else {
      setAttempts(prev => prev + 1);
      setError(attempts >= 2 ? '回答错误，请确认你了解本活动' : '回答错误，请重试');
      setAnswer('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-pink-600 mb-2">
          💕 非诚勿扰观众群
        </h1>
        
        {!verified ? (
          <>
            <p className="text-gray-600 text-center mb-6">
              回答以下问题加入观众群
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {VERIFICATION_QUESTION}
                </label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                  placeholder="请输入答案"
                  autoComplete="off"
                />
              </div>
              
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
              
              <button
                type="submit"
                className="w-full py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
              >
                验证
              </button>
            </form>
            
            <p className="text-xs text-gray-400 text-center mt-4">
              此验证用于防止广告账号加入
            </p>
          </>
        ) : (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-4">✅ 验证通过！</p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <img 
                src={QR_CODE_PATH} 
                alt="微信群二维码"
                className="w-64 h-64 mx-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23f3f4f6" width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14">请上传群二维码</text></svg>';
                }}
              />
            </div>
            
            <p className="text-gray-600 text-sm">
              长按识别二维码加入群聊
            </p>
            
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-yellow-700 text-xs">
                ⚠️ 请勿将此页面分享给他人
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
