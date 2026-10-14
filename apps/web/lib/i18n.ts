/** Interface labels only. Data entered by staff is never translated. */
export type Lang = 'en' | 'am';

export const labels = {
  appName: { en: 'Dembel Performance Hub', am: 'ደምበል የአፈጻጸም ማዕከል' },
  branch: { en: 'Temer Real Estate · Dembel Branch', am: 'ተመር ሪል እስቴት · ደምበል ቅርንጫፍ' },
  signIn: { en: 'Sign in', am: 'ግባ' },
  staffId: { en: 'Staff ID or phone number', am: 'የሰራተኛ መለያ ወይም ስልክ ቁጥር' },
  password: { en: 'Password', am: 'የይለፍ ቃል' },
  signInSoon: { en: 'Sign-in opens in Phase 1.', am: 'መግቢያ በምዕራፍ 1 ይከፈታል።' },
  systemStatus: { en: 'System status', am: 'የስርዓት ሁኔታ' },
  api: { en: 'Server', am: 'ሰርቨር' },
  database: { en: 'Database', am: 'የመረጃ ቋት' },
  teams: { en: 'Teams', am: 'ቡድኖች' },
  activeStaff: { en: 'Active staff', am: 'ንቁ ሰራተኞች' },
  metrics: { en: 'Tracked metrics', am: 'የሚለኩ መለኪያዎች' },
  online: { en: 'Online', am: 'በመስመር ላይ' },
  offline: { en: 'Not reachable', am: 'አይገኝም' },
  checking: { en: 'Checking…', am: 'በማረጋገጥ ላይ…' },
  install: { en: 'Add to home screen from your browser menu to use it like an app.', am: 'እንደ መተግበሪያ ለመጠቀም ከአሳሽዎ ምናሌ ወደ መነሻ ገጽ ያክሉ።' },
} as const;

export type LabelKey = keyof typeof labels;
export const t = (key: LabelKey, lang: Lang) => labels[key][lang];
