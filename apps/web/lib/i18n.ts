/** Interface labels only. Data entered by staff is never translated. Amharic wording to be reviewed by the branch. */
export type Lang = 'en' | 'am';

export const labels = {
  appName: { en: 'Dembel Performance Hub', am: 'ደምበል የአፈጻጸም ማዕከል' },
  branch: { en: 'Temer Real Estate, Dembel Branch', am: 'ተመር ሪል እስቴት፣ ደምበል ቅርንጫፍ' },
  signIn: { en: 'Sign in', am: 'ግባ' },
  signingIn: { en: 'Signing in…', am: 'በመግባት ላይ…' },
  signOut: { en: 'Sign out', am: 'ውጣ' },
  staffId: { en: 'Staff ID or phone number', am: 'የሰራተኛ መለያ ወይም ስልክ ቁጥር' },
  password: { en: 'Password', am: 'የይለፍ ቃል' },
  forgot: { en: 'Forgot your password? Ask the Office Admin to reset it.', am: 'የይለፍ ቃልዎን ረሱ? የቢሮ አስተዳዳሪውን እንዲቀይርልዎ ይጠይቁ።' },
  newPasswordTitle: { en: 'Choose your own password', am: 'የራስዎን የይለፍ ቃል ይምረጡ' },
  newPasswordHelp: { en: 'You signed in with a temporary password. Choose a new one only you know: at least 8 characters, with letters and numbers.', am: 'በጊዜያዊ የይለፍ ቃል ገብተዋል። እርስዎ ብቻ የሚያውቁትን አዲስ ይምረጡ፦ ቢያንስ 8 ቁምፊ፣ ፊደልና ቁጥር ያለው።' },
  currentPassword: { en: 'Temporary or current password', am: 'ጊዜያዊ ወይም የአሁኑ የይለፍ ቃል' },
  newPassword: { en: 'New password', am: 'አዲስ የይለፍ ቃል' },
  repeatPassword: { en: 'Repeat new password', am: 'አዲሱን የይለፍ ቃል ይድገሙ' },
  savePassword: { en: 'Save password', am: 'የይለፍ ቃል አስቀምጥ' },
  mismatch: { en: 'The two new passwords are not the same.', am: 'ሁለቱ አዲስ የይለፍ ቃሎች አይመሳሰሉም።' },
  home: { en: 'Home', am: 'መነሻ' },
  staff: { en: 'Staff', am: 'ሰራተኞች' },
  teams: { en: 'Teams', am: 'ቡድኖች' },
  lists: { en: 'Sites & lists', am: 'ሳይቶችና ዝርዝሮች' },
  offline: { en: 'Can’t reach the server. Check your connection and try again.', am: 'ሰርቨሩን ማግኘት አልተቻለም። ግንኙነትዎን አረጋግጠው እንደገና ይሞክሩ።' },
  waking: { en: 'Starting up the server. The first visit of the day can take up to a minute.', am: 'ሰርቨሩ እየተነሳ ነው። የቀኑ የመጀመሪያ ጉብኝት እስከ አንድ ደቂቃ ሊወስድ ይችላል።' },
} as const;

export type LabelKey = keyof typeof labels;
export const t = (key: LabelKey, lang: Lang) => labels[key][lang];

export const ROLE_NAMES: Record<string, { en: string; am: string }> = {
  SR: { en: 'Sales Representative', am: 'የሽያጭ ተወካይ' },
  TM: { en: 'Telemarketer', am: 'ቴሌማርኬተር' },
  MD: { en: 'Media Team', am: 'የሚዲያ ቡድን' },
  DS: { en: 'Digital Marketing Specialist', am: 'የዲጂታል ማርኬቲንግ ባለሙያ' },
  SS: { en: 'Sales Supervisor', am: 'የሽያጭ ተቆጣጣሪ' },
  SM: { en: 'Sales Manager', am: 'የሽያጭ ሥራ አስኪያጅ' },
  MM: { en: 'Marketing Manager', am: 'የማርኬቲንግ ሥራ አስኪያጅ' },
  BM: { en: 'Branch Manager', am: 'የቅርንጫፍ ሥራ አስኪያጅ' },
  OA: { en: 'Office Admin', am: 'የቢሮ አስተዳዳሪ' },
};
