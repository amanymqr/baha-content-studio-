// Sample content for version 1, taken from the approved Figma design.
// Every screen that shows it carries the "sample data" badge until the
// official sources are connected.

type T = { ar: string; en: string };

export const hero = {
  title: { ar: "الفائدة ثابتة. جاوب على السؤال اللي الكل بسأله: «أشتري هلأ ولا أستنى؟»", en: "Rates are on hold. Answer the question everyone is asking: \"Should I buy now or wait?\"" },
  body: { ar: "مبني على قرار بنك كندا وآخر تقرير مبيعات من TRREB. مناسب جداً للمشترين لأول مرة والقادمين الجدد، بالعربي والإنجليزي.", en: "Built on the Bank of Canada decision and TRREB's latest sales report. A strong fit for first-time buyers and newcomers, in Arabic and English." },
  score: 94,
  bars: [{ key: "relevance", value: 96 }, { key: "timing", value: 100 }, { key: "leads", value: 88 }] as const,
  sources: "Bank of Canada · TRREB",
};

export type Stat = { label: T; value: string; delta: T; tone: "neutral" | "positive" | "negative" | "warning"; source: string; foot: T; means: T; spark: number[] };

export const stats: Stat[] = [
  {
    label: { ar: "سعر الفائدة الأساسي", en: "Policy rate" },
    value: "2.25%",
    delta: { ar: "دون تغيير", en: "Unchanged" },
    tone: "neutral",
    source: "BoC",
    foot: { ar: "بنك كندا · قرار أكتوبر", en: "Bank of Canada · October decision" },
    means: { ar: "الرقم اللي بتبني عليه البنوك فوائد القروض والرهن العقاري.", en: "The rate banks build loan and mortgage rates on." },
    spark: [3.25, 3.0, 3.0, 2.75, 2.75, 2.75, 2.5, 2.5, 2.5, 2.25, 2.25, 2.25],
  },
  {
    label: { ar: "متوسط سعر البيت في GTA", en: "GTA average price" },
    value: "$1.07M",
    delta: { ar: "−2.1% سنوياً", en: "−2.1% YoY" },
    tone: "negative",
    source: "TRREB",
    foot: { ar: "TRREB · تقرير سبتمبر", en: "TRREB · September report" },
    means: { ar: "معدل سعر البيوت اللي انباعت هالشهر في تورنتو والمنطقة حولها.", en: "The average price of homes sold this month in Toronto and the region." },
    spark: [1.12, 1.11, 1.1, 1.09, 1.1, 1.11, 1.1, 1.08, 1.07, 1.08, 1.07, 1.07],
  },
  {
    label: { ar: "مبيعات البيوت في GTA", en: "GTA home sales" },
    value: "5,592",
    delta: { ar: "+8.4% سنوياً", en: "+8.4% YoY" },
    tone: "positive",
    source: "TRREB",
    foot: { ar: "TRREB · تقرير سبتمبر", en: "TRREB · September report" },
    means: { ar: "عدد البيوت اللي انباعت فعلياً خلال الشهر.", en: "How many homes actually sold during the month." },
    spark: [4.6, 4.2, 3.9, 4.4, 5.0, 5.6, 6.1, 6.4, 5.8, 5.2, 5.4, 5.6],
  },
  {
    label: { ar: "شواغر الإيجار في تورنتو", en: "Toronto rental vacancy" },
    value: "3.1%",
    delta: { ar: "+0.7 نقطة", en: "+0.7 pts" },
    tone: "warning",
    source: "CMHC",
    foot: { ar: "CMHC · تقرير سوق الإيجار", en: "CMHC · Rental market report" },
    means: { ar: "نسبة الشقق الفاضية للإيجار. كل ما زادت، صار عند المستأجر خيارات أكثر.", en: "The share of empty rental units. The higher it is, the more choice renters have." },
    spark: [1.8, 1.9, 2.0, 2.1, 2.2, 2.4, 2.5, 2.6, 2.8, 2.9, 3.0, 3.1],
  },
];

export const monthly = {
  months: {
    ar: ["أكتوبر", "نوفمبر", "ديسمبر", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر"],
    en: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
  },
  sales: [5150, 4980, 3260, 3050, 4400, 5250, 6150, 6300, 5600, 5300, 5250, 5592],
  price: [1.13, 1.09, 1.07, 1.03, 1.08, 1.1, 1.13, 1.12, 1.1, 1.08, 1.06, 1.07],
};

export const audience = [
  { icon: "home", label: { ar: "المشترون لأول مرة", en: "First-time buyers" }, value: 72 },
  { icon: "percent", label: { ar: "المجدّدون", en: "Renewers" }, value: 55 },
  { icon: "key", label: { ar: "البائعون", en: "Sellers" }, value: 8 },
  { icon: "trend", label: { ar: "المستثمرون", en: "Investors" }, value: -18 },
] as const;

export const news = [
  {
    source: "BoC",
    sourceName: { ar: "بنك كندا", en: "Bank of Canada" },
    ago: { ar: "منذ ساعتين", en: "2 hours ago" },
    topic: { ar: "الفائدة", en: "Rates" },
    title: { ar: "بنك كندا يُبقي سعر الفائدة دون تغيير", en: "Bank of Canada holds its policy rate" },
    body: { ar: "القرار يمنح المشترين لأول مرة وضوحاً أكبر في الرهن الثابت، ويخفف الضغط على اللي بيجددوا قروضهم هالعام.", en: "The decision gives first-time buyers more clarity on fixed mortgages and eases pressure on this year's renewals." },
    impact: "high",
    tags: { ar: ["المشترون", "المجدّدون"], en: ["Buyers", "Renewers"] },
    score: 86,
  },
  {
    source: "TRREB",
    sourceName: { ar: "TRREB", en: "TRREB" },
    ago: { ar: "منذ 5 ساعات", en: "5 hours ago" },
    topic: { ar: "سوق GTA", en: "GTA market" },
    title: { ar: "مبيعات البيوت في GTA ترتفع مقارنة بالعام الماضي", en: "GTA home sales rise year over year" },
    body: { ar: "المشترون يعودون والأسعار ما زالت أقل من العام الماضي، وهي فرصة ينتظرها المشترون لأول مرة.", en: "Buyers are returning while prices remain below last year, the window first-time buyers have been waiting for." },
    impact: "medium",
    tags: { ar: ["المشترون", "البائعون"], en: ["Buyers", "Sellers"] },
    score: 81,
  },
  {
    source: "CMHC",
    sourceName: { ar: "CMHC", en: "CMHC" },
    ago: { ar: "أمس", en: "Yesterday" },
    topic: { ar: "الإيجارات", en: "Rentals" },
    title: { ar: "شواغر الإيجار في تورنتو عند أعلى مستوى منذ سنوات", en: "Toronto rental vacancy at a multi-year high" },
    body: { ar: "خيارات أكثر للمستأجرين، ومنافسة أكبر لصغار الملّاك والمستثمرين في الكوندو.", en: "More choice for renters and more competition for small landlords and condo investors." },
    impact: "medium",
    tags: { ar: ["المستأجرون", "المستثمرون"], en: ["Renters", "Investors"] },
    score: 74,
  },
] as const;

export const opportunities = [
  {
    rank: "01",
    format: { ar: "ريل", en: "Reel" },
    score: 94,
    title: { ar: "«أشتري هلأ ولا أستنى؟» شو يعني تثبيت الفائدة إلك", en: "\"Buy now or wait?\" What the rate hold means for you" },
    body: { ar: "أكثر سؤال بيوصل عالرسائل. التثبيت بيعطي المشترين لأول مرة فرصة واضحة يخططوا بثقة.", en: "The most common question in DMs. The hold gives first-time buyers a clear window to plan with confidence." },
    audience: { ar: "المشترون لأول مرة · القادمون الجدد", en: "First-time buyers · Newcomers" },
  },
  {
    rank: "02",
    format: { ar: "ريل", en: "Reel" },
    score: 88,
    title: { ar: "3 أشياء بتقدر تفاوض عليها هلأ كمشتري في GTA", en: "3 things you can negotiate right now as a GTA buyer" },
    body: { ar: "المبيعات طالعة بس الأسعار لسا أقل من السنة الماضية. المشتري إلو قوة ما كانت عنده بـ 2022.", en: "Sales are up but prices are still below last year. Buyers have leverage they didn't have in 2022." },
    audience: { ar: "المشترون · العائلات", en: "Buyers · Families" },
  },
] as const;

export const week = [
  { day: { ar: "إثنين", en: "Mon" }, date: 19, title: { ar: "ريل · شرح تثبيت الفائدة (عربي)", en: "Reel · Rate hold explained (Arabic)" }, status: "published" },
  { day: { ar: "أربعاء", en: "Wed" }, date: 21, title: { ar: "كاروسيل · 5 خرافات عن الشراء (إنجليزي)", en: "Carousel · 5 first-buyer myths (English)" }, status: "scheduled" },
  { day: { ar: "خميس", en: "Thu" }, date: 22, title: { ar: "ريل · نصائح التفاوض (عربي + إنجليزي)", en: "Reel · Negotiation tips (Arabic + English)" }, status: "scheduled" },
  { day: { ar: "جمعة", en: "Fri" }, date: 23, title: { ar: "كاروسيل · إيجار ولا شراء بـ 2026؟", en: "Carousel · Rent or buy in 2026?" }, status: "draft" },
] as const;
