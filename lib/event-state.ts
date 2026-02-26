// Event State Types and Management

export type LightStatus = 'on' | 'off' | 'burst';

export type EventPhase = 
  | 'waiting'      // 等待开始
  | 'intro'        // 开场
  | 'female_intro' // 女嘉宾介绍
  | 'male_enter'   // 男嘉宾入场
  | 'male_question'// 男嘉宾提问
  | 'talent'       // 才艺/惩罚
  | 'vcr1'         // VCR1 播放
  | 'qa1'          // 第一轮问答
  | 'vcr2'         // VCR2 播放
  | 'qa2'          // 第二轮问答
  | 'reversal'     // 权力反转
  | 'heart_reveal' // 心动女生揭晓
  | 'final_qa'     // 最后一问
  | 'final_choice' // 最终选择
  | 'result'       // 结果公布
  | 'return'       // 返场环节
  | 'ended';       // 活动结束

export interface FemaleGuest {
  id: number;           // 1-12
  name: string;
  nickname?: string;
  age?: string;
  school?: string;
  major?: string;
  zodiac?: string;      // 星座
  photo?: string;       // Legacy single photo (backward compat)
  photos: string[];     // Multiple photos array
  tags: string[];       // 3 tags
  introduction?: string;
}

// Helper to get photos from guest (handles backward compatibility)
export function getGuestPhotos(guest: FemaleGuest): string[] {
  if (guest.photos && guest.photos.length > 0) {
    return guest.photos.filter(url => url && url.trim());
  }
  if (guest.photo) {
    return [guest.photo];
  }
  return [];
}

export interface MaleGuest {
  id: number;           // 1-6
  name: string;
  nickname?: string;
  age?: string;
  school?: string;
  major?: string;
  photo?: string;
  vcr1Url?: string;     // VCR1 video URL
  vcr2Url?: string;     // VCR2 video URL
  introduction?: string;
  question?: string;    // Question to ask female guests ("您的需求是？")
}

// Slide slot for custom designed images/pages
export interface SlideSlot {
  id: string;           // 'opening', 'intermission', 'custom-1', etc.
  name: string;         // Display name
  imageUrl?: string;    // Uploaded image URL
  description?: string; // Usage hint
}

// Pre-defined slide slot IDs
export type SlideSlotId = 
  | 'opening'       // 开场幻灯片
  | 'intermission'  // 中场休息
  | 'success'       // 牵手成功
  | 'fail'          // 牵手失败
  | 'ending'        // 结束页面
  | 'custom-1'      // 自定义1
  | 'custom-2'      // 自定义2
  | 'custom-3'      // 自定义3
  | 'custom-4'      // 自定义4
  | 'custom-5';     // 自定义5

// Default slide slots
export const defaultSlideSlots: SlideSlot[] = [
  { id: 'opening', name: '开场幻灯片', description: '活动开始前展示' },
  { id: 'intermission', name: '中场休息', description: '中场时展示' },
  { id: 'success', name: '牵手成功', description: '配对成功时展示' },
  { id: 'fail', name: '牵手失败', description: '配对失败时展示' },
  { id: 'ending', name: '结束页面', description: '活动结束时展示' },
  { id: 'custom-1', name: '自定义幻灯片 1', description: '可随时调用' },
  { id: 'custom-2', name: '自定义幻灯片 2', description: '可随时调用' },
  { id: 'custom-3', name: '自定义幻灯片 3', description: '可随时调用' },
  { id: 'custom-4', name: '自定义幻灯片 4', description: '可随时调用' },
  { id: 'custom-5', name: '自定义幻灯片 5', description: '可随时调用' },
];

export interface EventState {
  phase: EventPhase;
  currentMaleGuest: number;         // 1-6, which male guest is on stage
  currentRound: number;             // 1-6, which round
  lights: Record<number, LightStatus>;  // 1-12 female guest lights
  heartChoice: number | null;       // Male's secret heart choice
  showingProfile: number | null;    // Which female's profile is showing (popup)
  showingTag: number | null;        // Which tag index (0-2) is revealed
  currentFemaleIntro: number | null; // Which female is being introduced (fullscreen)
  vcrPlaying: boolean;
  vcrType: 'vcr1' | 'vcr2' | null;
  vcrIntroUrl?: string;             // VCR intro/opener video URL
  vcrPlayingIntro?: boolean;        // Currently playing intro (before main VCR)
  message: string;                  // Current phase message/title
  currentSlide: string | null;      // Current slide ID being shown (fullscreen)
  stageBackground?: string;         // Custom stage background image URL
  backgroundBlur: number;           // Background blur level (0-20px)
  useGoogleSlides?: boolean;        // Use Google Slides for female intro
  lastUpdated: number;              // Timestamp
}

export interface EventData {
  state: EventState;
  femaleGuests: FemaleGuest[];
  maleGuests: MaleGuest[];
  slides: SlideSlot[];              // Slide configurations
}

// Initial state
export const initialEventState: EventState = {
  phase: 'waiting',
  currentMaleGuest: 1,
  currentRound: 1,
  lights: {
    1: 'on', 2: 'on', 3: 'on', 4: 'on',
    5: 'on', 6: 'on', 7: 'on', 8: 'on',
    9: 'on', 10: 'on', 11: 'on', 12: 'on',
  },
  heartChoice: null,
  showingProfile: null,
  showingTag: null,
  currentFemaleIntro: null,
  vcrPlaying: false,
  vcrType: null,
  message: '等待活动开始...',
  currentSlide: null,
  backgroundBlur: 0,
  lastUpdated: Date.now(),
};

// Phase display names
export const phaseNames: Record<EventPhase, string> = {
  waiting: '等待开始',
  intro: '开场',
  female_intro: '女嘉宾介绍',
  male_enter: '男嘉宾入场',
  male_question: '您的需求是？',
  talent: '才艺展示',
  vcr1: 'VCR：基本资料',
  qa1: '第一轮问答',
  vcr2: 'VCR：情感经历',
  qa2: '第二轮问答',
  reversal: '权力反转',
  heart_reveal: '心动女生揭晓',
  final_qa: '最后一问',
  final_choice: '最终选择',
  result: '结果公布',
  return: '返场环节',
  ended: '活动结束',
};

// Light status colors
export const lightColors: Record<LightStatus, string> = {
  on: '#22c55e',    // Green
  off: '#374151',   // Gray
  burst: '#ec4899', // Pink (爆灯)
};
