'use client';

import { useState, useEffect } from 'react';

// 验证问题配置
const VERIFICATION_QUESTION = "非诚勿扰活动是哪个学校举办的？（英文缩写，如 NYU）";
const CORRECT_ANSWERS = ["columbia", "cu", "哥大", "哥伦比亚"];

// 群二维码路径
const QR_CODE_PATH = "/assets/group-qr.png";

// 生成每日口令 - 基于日期的简单哈希
function generateDailyCode(): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const seed = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // 生成4位数字口令
  const code = ((seed * 9301 + 49297) % 233280).toString().slice(-4).padStart(4, '0');
  return code;
}

export default function GroupPage() {
  const [answer, setAnswer] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [dailyCode, setDailyCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDailyCode(generateDailyCode());
  }, []);

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

  const copyCode = () => {
    navigator.clipboard.writeText(dailyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              回答以下问题获取入群口令
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
            
            {/* 动态口令区域 */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 mb-4 border-2 border-pink-200">
              <p className="text-gray-600 text-sm mb-2">今日入群口令</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-mono font-bold text-pink-600 tracking-widest">
                  {dailyCode}
                </span>
                <button
                  onClick={copyCode}
                  className="px-3 py-1 bg-pink-500 text-white text-sm rounded-lg hover:bg-pink-600 transition-colors"
                >
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">口令每日更新，请勿截图分享</p>
            </div>
            
            {/* 群二维码 */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <img 
                src={QR_CODE_PATH} 
                alt="微信群二维码"
                className="w-48 h-48 mx-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23f3f4f6" width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14">请上传群二维码</text></svg>';
                }}
              />
            </div>
            
            {/* 入群说明 */}
            <div className="bg-blue-50 rounded-lg p-4 text-left">
              <p className="text-blue-800 font-medium text-sm mb-2">📝 入群步骤：</p>
              <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                <li>扫描上方二维码</li>
                <li>申请入群时填写口令 <span className="font-mono font-bold">{dailyCode}</span></li>
                <li>等待管理员验证通过</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
