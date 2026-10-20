import type { Bi, Category } from "../analysis/score";

// Content angles come from fixed marketing rules per news category. An angle is
// a topic to write about, built on a real story; it carries no facts of its own.
// Facts always come from the linked source when the content is written.

export type Audience = "firstTime" | "sellers" | "homeowners" | "investors" | "arab" | "english";
export type Format = "reel" | "carousel";
export type Objective = "educate" | "trust" | "leads" | "engagement";

export type AngleRule = {
  id: string;
  format: Format;
  objective: Objective;
  audiences: Audience[];
  title: Bi;
  why: Bi;
};

export const ANGLES: Record<Category, AngleRule[]> = {
  boc: [
    { id: "boc-explain", format: "reel", objective: "educate", audiences: ["firstTime", "homeowners", "english"], title: { ar: "قرار بنك كندا الأخير بدقيقة: شو قال بالضبط؟", en: "The Bank of Canada's latest decision in 60 seconds: what it actually said" }, why: { ar: "قرارات الفائدة بتجيب أسئلة كثيرة، والشرح القصير من المصدر الرسمي ببني ثقة.", en: "Rate decisions draw many questions; a short explainer from the official source builds trust." } },
    { id: "boc-renewal", format: "carousel", objective: "leads", audiences: ["homeowners", "investors"], title: { ar: "عندك تجديد رهن قريب؟ أسئلة لازم تسألها لبنكك بعد قرار الفائدة", en: "Renewing soon? Questions to ask your lender after the rate decision" }, why: { ar: "أصحاب الرهن اللي قرّب تجديدهم جمهور جاهز يتواصل.", en: "Owners near renewal are an audience ready to reach out." } },
    { id: "boc-arabic", format: "reel", objective: "trust", audiences: ["arab", "firstTime"], title: { ar: "يعني شو «سعر الفائدة»؟ شرح بالعربي للقادمين الجدد", en: "What is the policy rate? A plain explainer for newcomers" }, why: { ar: "الجالية العربية بتفضّل شرح المصطلحات المالية بلغتها.", en: "Arab newcomers prefer financial terms explained in their language." } },
  ],
  mortgage: [
    { id: "mtg-checklist", format: "carousel", objective: "educate", audiences: ["firstTime", "arab"], title: { ar: "قبل ما تقدّم على رهن: الأوراق والخطوات الأساسية", en: "Before you apply for a mortgage: the key documents and steps" }, why: { ar: "محتوى عملي بنحفظ وبنشارك، ومناسب للمشترين لأول مرة.", en: "Practical, saveable content that suits first-time buyers." } },
    { id: "mtg-news", format: "reel", objective: "trust", audiences: ["firstTime", "homeowners", "english"], title: { ar: "خبر جديد عن الرهن العقاري: شو اللي تغيّر حسب المصدر الرسمي", en: "New mortgage news: what changed, according to the official source" }, why: { ar: "ربط الخبر الرسمي بأسئلة الناس عن التمويل.", en: "Connects official news to everyday financing questions." } },
  ],
  prices_sales: [
    { id: "ps-numbers", format: "carousel", objective: "trust", audiences: ["sellers", "firstTime", "english"], title: { ar: "أرقام سوق GTA هالشهر من المصدر: المبيعات والأسعار بشرائح بسيطة", en: "This month's GTA market numbers from the source, in simple slides" }, why: { ar: "الأرقام الرسمية بتبني مصداقية، والكاروسيل مناسب للأرقام.", en: "Official figures build credibility, and carousels suit numbers." } },
    { id: "ps-sellers", format: "reel", objective: "leads", audiences: ["sellers", "homeowners"], title: { ar: "بتفكّر تبيع؟ شو بتقول آخر أرقام السوق الرسمية", en: "Thinking of selling? What the latest official market numbers say" }, why: { ar: "البائعين بدوّروا على قراءة للسوق قبل ما يتواصلوا مع وكيل.", en: "Sellers look for a market read before contacting an agent." } },
    { id: "ps-arabic", format: "reel", objective: "engagement", audiences: ["arab", "firstTime"], title: { ar: "سوق تورنتو بالعربي: أهم رقم بتقرير هالشهر", en: "The Toronto market in plain words: this month's key number" }, why: { ar: "رقم واحد واضح بالعربي بجيب تفاعل من الجالية.", en: "One clear number in Arabic draws community engagement." } },
  ],
  first_time: [
    { id: "ft-program", format: "carousel", objective: "educate", audiences: ["firstTime", "arab", "english"], title: { ar: "برنامج للمشترين لأول مرة: مين مؤهّل وكيف تتأكد من المصدر", en: "A first-time buyer program: who qualifies and how to check the source" }, why: { ar: "المشترين لأول مرة بدوّروا على برامج الدعم وبحفظوا هالمحتوى.", en: "First-time buyers search for support programs and save this content." } },
    { id: "ft-steps", format: "reel", objective: "leads", audiences: ["firstTime"], title: { ar: "أول بيت إلك؟ خطوة وحدة تعملها هالأسبوع", en: "Buying your first home? One step to take this week" }, why: { ar: "دعوة واضحة للتواصل مع جمهور بادئ بالبحث.", en: "A clear call to action for an audience starting their search." } },
  ],
  policy_tax: [
    { id: "pt-explain", format: "carousel", objective: "educate", audiences: ["investors", "homeowners", "english"], title: { ar: "قرار حكومي جديد عن السكن: شو بقول النص الرسمي بالضبط", en: "A new government housing decision: what the official text says" }, why: { ar: "السياسات بدها شرح هادي ودقيق من المصدر.", en: "Policy news needs a calm, accurate explainer from the source." } },
    { id: "pt-arabic", format: "reel", objective: "trust", audiences: ["arab", "firstTime"], title: { ar: "قانون أو ضريبة جديدة عن السكن؟ شرح مبسّط بالعربي", en: "A new housing rule or tax? A simple explainer" }, why: { ar: "الجالية بتثق بشرح المصادر الرسمية بلغتها.", en: "The community trusts official sources explained in its language." } },
  ],
  inventory: [
    { id: "inv-supply", format: "carousel", objective: "educate", audiences: ["investors", "sellers", "english"], title: { ar: "قديش عم ينبني بيوت؟ قراءة بسيطة لأرقام البناء الرسمية", en: "How much housing is being built? A simple read of the official numbers" }, why: { ar: "المستثمرين والبائعين بتابعوا المعروض.", en: "Investors and sellers follow supply." } },
    { id: "inv-reel", format: "reel", objective: "engagement", audiences: ["investors", "arab"], title: { ar: "رقم البناء الجديد بكندا هالشهر: شو يعني بالمختصر؟", en: "This month's new construction number: what it means in brief" }, why: { ar: "رقم واحد بفيديو قصير مناسب للتفاعل.", en: "One number in a short video suits engagement." } },
  ],
  rentals: [
    { id: "rent-investors", format: "carousel", objective: "leads", audiences: ["investors"], title: { ar: "للمستثمرين: شو بتقول آخر بيانات الإيجار الرسمية", en: "For investors: what the latest official rental data says" }, why: { ar: "بيانات الإيجار أساس قرار المستثمر.", en: "Rental data is central to investor decisions." } },
    { id: "rent-vs-buy", format: "reel", objective: "engagement", audiences: ["firstTime", "arab", "english"], title: { ar: "إيجار ولا شراء؟ أسئلة تسألها لنفسك قبل ما تقرّر", en: "Rent or buy? Questions to ask yourself before deciding" }, why: { ar: "سؤال شائع عند المستأجرين، بجيب تعليقات ونقاش.", en: "A common renter question that drives comments." } },
  ],
  general: [
    { id: "gen-context", format: "reel", objective: "educate", audiences: ["english", "homeowners"], title: { ar: "رقم اقتصادي جديد: هل إله علاقة بالعقار؟", en: "A new economic number: does it matter for real estate?" }, why: { ar: "صلة غير مباشرة، فبنحطّه بأولوية أقل.", en: "An indirect link, so it ranks lower." } },
  ],
};

export const AUDIENCE_LABEL: Record<Audience, Bi> = {
  firstTime: { ar: "المشترين لأول مرة", en: "First-time buyers" },
  sellers: { ar: "البائعين", en: "Sellers" },
  homeowners: { ar: "أصحاب البيوت", en: "Homeowners" },
  investors: { ar: "المستثمرين", en: "Investors" },
  arab: { ar: "الجالية العربية بكندا", en: "Arab audiences in Canada" },
  english: { ar: "الجمهور الكندي بالإنجليزي", en: "English-speaking Canadians" },
};

export const OBJECTIVE_LABEL: Record<Objective, Bi> = {
  educate: { ar: "توعية وشرح", en: "Educate" },
  trust: { ar: "بناء ثقة", en: "Build trust" },
  leads: { ar: "جلب عملاء", en: "Generate leads" },
  engagement: { ar: "تفاعل", en: "Engagement" },
};

export const FORMAT_LABEL: Record<Format, Bi> = { reel: { ar: "ريل", en: "Reel" }, carousel: { ar: "كاروسيل", en: "Carousel" } };
