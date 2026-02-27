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
  id: string;           // 'opening', 'intermission', or uuid for custom
  name: string;         // Display name (editable for custom)
  imageUrl?: string;    // Uploaded image URL
  googleSlideIndex?: number;  // Google Slides page number (1-based)
  description?: string; // Usage hint
}

// Pre-defined slide slot IDs (custom slots use dynamic uuids)
export type PresetSlideId = 
  | 'opening'       // 开场幻灯片
  | 'intermission'  // 中场休息
  | 'success'       // 牵手成功
  | 'fail'          // 牵手失败
  | 'ending';       // 结束页面

// Preset slide slots (always present)
export const presetSlideSlots: SlideSlot[] = [
  { id: 'opening', name: '开场幻灯片', description: '活动开始前展示' },
  { id: 'intermission', name: '中场休息', description: '中场时展示' },
  { id: 'success', name: '牵手成功', description: '配对成功时展示' },
  { id: 'fail', name: '牵手失败', description: '配对失败时展示' },
  { id: 'ending', name: '结束页面', description: '活动结束时展示' },
];

// Default slide slots (only presets, custom are added dynamically)
export const defaultSlideSlots: SlideSlot[] = [...presetSlideSlots];

// Helper to check if a slide is a preset
export function isPresetSlide(id: string): boolean {
  return ['opening', 'intermission', 'success', 'fail', 'ending'].includes(id);
}

export interface EventState {
  phase: EventPhase;
  currentMaleGuest: number;         // 1-6, which male guest is on stage
  currentRound: number;             // 1-6, which round
  lights: Record<number, LightStatus>;  // 1-12 female guest lights
  heartChoices: Record<number, number | null>;  // Each male guest's secret heart choice (maleId -> femaleId)
  showingProfile: number | null;    // Which female's profile is showing (popup)
  showingTag: number | null;        // Which tag index (0-2) is revealed
  currentFemaleIntro: number | null; // Which female is being introduced (fullscreen)
  vcrPlaying: boolean;
  vcrType: 'vcr1' | 'vcr2' | null;
  vcr1IntroUrl?: string;            // VCR1 intro/opener video URL
  vcr2IntroUrl?: string;            // VCR2 intro/opener video URL
  vcrPlayingIntro?: boolean;        // Currently playing intro (before main VCR)
  message: string;                  // Current phase message/title
  currentSlide: string | null;      // Current slide ID being shown (fullscreen)
  stageBackground?: string;         // Custom stage background image URL
  backgroundBlur: number;           // Background blur level (0-20px)
  useGoogleSlides?: boolean;        // Use Google Slides for female intro
  soundToPlay?: string;             // Sound name to play on stage (cleared after playing)
  soundTimestamp?: number;          // Timestamp to ensure same sound can replay
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
  heartChoices: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
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
