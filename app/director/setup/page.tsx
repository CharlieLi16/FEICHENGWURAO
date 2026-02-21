'use client';

import { useState, useEffect } from 'react';
import { FemaleGuest, MaleGuest } from '@/lib/event-state';
import Link from 'next/link';
import SkeletonUpload from '@/components/SkeletonUpload';

interface RegistrationEntry {
  index: number;
  legalName: string;
  nickname: string;
  age: string;
  gender: string;
  school: string;
  major: string;
  fileUrl: string;
  introduction: string;
}

export default function SetupPage() {
  const [femaleGuests, setFemaleGuests] = useState<FemaleGuest[]>([]);
  const [maleGuests, setMaleGuests] = useState<MaleGuest[]>([]);
  const [registrations, setRegistrations] = useState<{ male: RegistrationEntry[]; female: RegistrationEntry[] }>({
    male: [],
    female: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Load existing data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load event data
      const eventRes = await fetch('/api/event/state');
      const eventData = await eventRes.json();
      
      // Always set the data from server (even if empty arrays)
      // The server should return persisted data after initialization
      setFemaleGuests(eventData.femaleGuests || []);
      setMaleGuests(eventData.maleGuests || []);

      // Load registrations
      const [maleRes, femaleRes] = await Promise.all([
        fetch('/api/admin/list?gender=男'),
        fetch('/api/admin/list?gender=女'),
      ]);
      const maleData = await maleRes.json();
      const femaleData = await femaleRes.json();
      setRegistrations({
        male: maleData.entries || [],
        female: femaleData.entries || [],
      });
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  // Initialize empty guests ONLY ONCE after initial load, if truly empty
  useEffect(() => {
    if (!initialized || loading) return;
    
    // Only initialize if arrays are empty AND we haven't already initialized
    if (femaleGuests.length === 0) {
      setFemaleGuests(
        Array.from({ length: 12 }, (_, i) => ({
          id: i + 1,
          name: '',
          photos: [],
          tags: ['', '', ''],
        }))
      );
    }
    if (maleGuests.length === 0) {
      setMaleGuests(
        Array.from({ length: 6 }, (_, i) => ({
          id: i + 1,
          name: '',
        }))
      );
    }
  }, [initialized]); // Only run when initialized changes (once)

  // Import from registration
  const importFemaleGuest = (slotId: number, reg: RegistrationEntry) => {
    const urls = reg.fileUrl?.split(' | ').filter(u => u && !u.startsWith('[')) || [];
    setFemaleGuests((prev) =>
      prev.map((g) =>
        g.id === slotId
          ? {
              ...g,
              name: reg.legalName,
              nickname: reg.nickname,
              age: reg.age,
              school: reg.school,
              major: reg.major,
              photos: urls,           // All photos
              photo: urls[0] || '',   // First photo for backward compat
              introduction: reg.introduction,
            }
          : g
      )
    );
  };

  const importMaleGuest = (slotId: number, reg: RegistrationEntry) => {
    const urls = reg.fileUrl?.split(' | ').filter(u => u && !u.startsWith('[')) || [];
    setMaleGuests((prev) =>
      prev.map((g) =>
        g.id === slotId
          ? {
              ...g,
              name: reg.legalName,
              nickname: reg.nickname,
              age: reg.age,
              school: reg.school,
              major: reg.major,
              photo: urls[0] || '',
              introduction: reg.introduction,
            }
          : g
      )
    );
  };

  // Update guest fields
  const updateFemaleGuest = (id: number, field: keyof FemaleGuest, value: string) => {
    setFemaleGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const updateFemaleTag = (id: number, tagIndex: number, value: string) => {
    setFemaleGuests((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const newTags = [...g.tags];
          newTags[tagIndex] = value;
          return { ...g, tags: newTags };
        }
        return g;
      })
    );
  };

  const updateMaleGuest = (id: number, field: keyof MaleGuest, value: string) => {
    setMaleGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  // Save all data
  const saveData = async () => {
    // Client-side protection: warn if trying to save empty data
    const hasAnyFemale = femaleGuests.some(g => g.name?.trim());
    const hasAnyMale = maleGuests.some(g => g.name?.trim());
    
    if (!hasAnyFemale && !hasAnyMale) {
      const confirmed = window.confirm(
        '⚠️ 警告：所有嘉宾数据都是空的！\n\n' +
        '确定要保存吗？这可能会覆盖现有数据。\n\n' +
        '如果你想保留现有数据，请点击"取消"并刷新页面。'
      );
      if (!confirmed) {
        setMessage('❌ 已取消保存');
        return;
      }
    }
    
    setSaving(true);
    setMessage('');
    try {
      await fetch('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setFemaleGuests', guests: femaleGuests }),
      });
      await fetch('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setMaleGuests', guests: maleGuests }),
      });
      setMessage('✅ 保存成功！');
    } catch (e) {
      setMessage('❌ 保存失败');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">⚙️ 嘉宾数据设置</h1>
          <p className="text-gray-400 text-sm">设置参与活动的嘉宾信息</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/director" className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
            ← 返回控制台
          </Link>
          <button
            onClick={saveData}
            disabled={saving}
            className="px-6 py-2 bg-pink-600 rounded-lg hover:bg-pink-500 disabled:opacity-50"
          >
            {saving ? '保存中...' : '💾 保存'}
          </button>
        </div>
      </header>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-center ${message.includes('成功') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {message}
        </div>
      )}

      {/* Female Guests */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-pink-400">👩 女嘉宾 (1-12)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {femaleGuests.map((guest) => (
            <div key={guest.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-pink-400">#{guest.id}</span>
                {/* Import dropdown */}
                <select
                  onChange={(e) => {
                    const reg = registrations.female.find((r) => r.index === parseInt(e.target.value));
                    if (reg) importFemaleGuest(guest.id, reg);
                  }}
                  className="bg-gray-700 rounded px-2 py-1 text-sm"
                  defaultValue=""
                >
                  <option value="">导入报名...</option>
                  {registrations.female.map((reg) => (
                    <option key={reg.index} value={reg.index}>
                      {reg.legalName} ({reg.nickname})
                    </option>
                  ))}
                </select>
              </div>

              {/* Photo Upload - Visual Skeleton */}
              <SkeletonUpload
                value={guest.photo}
                onChange={(url) => updateFemaleGuest(guest.id, 'photo', url || '')}
                placeholder="嘉宾照片"
                accept="image/*"
                aspectRatio="1:1"
                className="mb-3"
              />

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="姓名"
                  value={guest.name}
                  onChange={(e) => updateFemaleGuest(guest.id, 'name', e.target.value)}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="昵称"
                  value={guest.nickname || ''}
                  onChange={(e) => updateFemaleGuest(guest.id, 'nickname', e.target.value)}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="年龄"
                    value={guest.age || ''}
                    onChange={(e) => updateFemaleGuest(guest.id, 'age', e.target.value)}
                    className="bg-gray-700 rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="学校"
                    value={guest.school || ''}
                    onChange={(e) => updateFemaleGuest(guest.id, 'school', e.target.value)}
                    className="bg-gray-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="星座"
                    value={guest.zodiac || ''}
                    onChange={(e) => updateFemaleGuest(guest.id, 'zodiac', e.target.value)}
                    className="bg-gray-700 rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="专业"
                    value={guest.major || ''}
                    onChange={(e) => updateFemaleGuest(guest.id, 'major', e.target.value)}
                    className="bg-gray-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  placeholder="自我介绍/兴趣爱好"
                  value={guest.introduction || ''}
                  onChange={(e) => updateFemaleGuest(guest.id, 'introduction', e.target.value)}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm h-20 resize-none"
                />

                {/* Tags */}
                <div className="pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">标签 (3个)</div>
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`标签 ${i + 1}`}
                      value={guest.tags[i] || ''}
                      onChange={(e) => updateFemaleTag(guest.id, i, e.target.value)}
                      className="w-full bg-gray-700 rounded px-3 py-2 text-sm mb-1"
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Male Guests */}
      <section>
        <h2 className="text-xl font-bold mb-4 text-blue-400">👨 男嘉宾 (1-6)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {maleGuests.map((guest) => (
            <div key={guest.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-blue-400">#{guest.id}</span>
                {/* Import dropdown */}
                <select
                  onChange={(e) => {
                    const reg = registrations.male.find((r) => r.index === parseInt(e.target.value));
                    if (reg) importMaleGuest(guest.id, reg);
                  }}
                  className="bg-gray-700 rounded px-2 py-1 text-sm"
                  defaultValue=""
                >
                  <option value="">导入报名...</option>
                  {registrations.male.map((reg) => (
                    <option key={reg.index} value={reg.index}>
                      {reg.legalName} ({reg.nickname})
                    </option>
                  ))}
                </select>
              </div>

              {/* Photo Upload - Visual Skeleton */}
              <SkeletonUpload
                value={guest.photo}
                onChange={(url) => updateMaleGuest(guest.id, 'photo', url || '')}
                placeholder="嘉宾照片"
                accept="image/*"
                aspectRatio="1:1"
                className="mb-3"
              />

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="姓名"
                  value={guest.name}
                  onChange={(e) => updateMaleGuest(guest.id, 'name', e.target.value)}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="昵称"
                  value={guest.nickname || ''}
                  onChange={(e) => updateMaleGuest(guest.id, 'nickname', e.target.value)}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="年龄"
                    value={guest.age || ''}
                    onChange={(e) => updateMaleGuest(guest.id, 'age', e.target.value)}
                    className="bg-gray-700 rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="学校"
                    value={guest.school || ''}
                    onChange={(e) => updateMaleGuest(guest.id, 'school', e.target.value)}
                    className="bg-gray-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  placeholder="自我介绍"
                  value={guest.introduction || ''}
                  onChange={(e) => updateMaleGuest(guest.id, 'introduction', e.target.value)}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm h-16 resize-none"
                />
                <input
                  type="text"
                  placeholder="您的需求是？(问女嘉宾的问题)"
                  value={guest.question || ''}
                  onChange={(e) => updateMaleGuest(guest.id, 'question', e.target.value)}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-blue-500/30 focus:border-blue-500"
                />

                {/* VCR Videos - Visual Skeleton */}
                <div className="pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">VCR 视频 <span className="text-gray-500">(支持上传或粘贴链接)</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">VCR1 基本资料</div>
                      <SkeletonUpload
                        value={guest.vcr1Url}
                        onChange={(url) => updateMaleGuest(guest.id, 'vcr1Url', url || '')}
                        placeholder="VCR1"
                        accept="video/*"
                        aspectRatio="16:9"
                        allowUrlInput
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">VCR2 情感经历</div>
                      <SkeletonUpload
                        value={guest.vcr2Url}
                        onChange={(url) => updateMaleGuest(guest.id, 'vcr2Url', url || '')}
                        placeholder="VCR2"
                        accept="video/*"
                        aspectRatio="16:9"
                        allowUrlInput
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save Button (floating) */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={saveData}
          disabled={saving}
          className="px-8 py-4 bg-pink-600 rounded-full shadow-lg hover:bg-pink-500 disabled:opacity-50 text-lg font-bold"
        >
          {saving ? '保存中...' : '💾 保存设置'}
        </button>
      </div>
    </div>
  );
}
