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
  photo?: string;
  tags: string[];       // 3 tags
  introduction?: string;
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
}

export interface EventState {
  phase: EventPhase;
  currentMaleGuest: number;         // 1-6, which male guest is on stage
  currentRound: number;             // 1-6, which round
  lights: Record<number, LightStatus>;  // 1-12 female guest lights
  heartChoice: number | null;       // Male's secret heart choice
  showingProfile: number | null;    // Which female's profile is showing
  showingTag: number | null;        // Which tag index (0-2) is revealed
  vcrPlaying: boolean;
  vcrType: 'vcr1' | 'vcr2' | null;
  message: string;                  // Current phase message/title
  lastUpdated: number;              // Timestamp
}

export interface EventData {
  state: EventState;
  femaleGuests: FemaleGuest[];
  maleGuests: MaleGuest[];
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
  vcrPlaying: false,
  vcrType: null,
  message: '等待活动开始...',
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
