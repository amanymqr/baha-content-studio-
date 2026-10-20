import type { Bi, Category } from "./score";

// Fixed editorial rules. They describe why a kind of news usually matters to an
// audience, in general terms. They are not analysis of a specific story, they do
// not say whether the effect is good or bad, and they make no forecast.

export type ImpactAudience = "firstTime" | "sellers" | "homeowners" | "investors";
export type Level = "high" | "medium" | "low";

type Rule = { level: Level; note: Bi };

export const IMPACT: Record<Category, Record<ImpactAudience, Rule>> = {
  boc: {
    firstTime: { level: "high", note: { ar: "قرار الفائدة عادةً بأثّر على تكلفة الاقتراض وعلى المبلغ اللي ممكن البنك يوافق عليه.", en: "Rate decisions usually affect borrowing costs and how much a lender may approve." } },
    sellers: { level: "medium", note: { ar: "تكلفة الاقتراض وحدة من العوامل اللي بتأثّر على عدد المشترين القادرين يشتروا.", en: "Borrowing costs are one of the factors in how many buyers can afford to buy." } },
    homeowners: { level: "high", note: { ar: "أصحاب الرهن المتغيّر واللي قرّب موعد تجديدهم هم أكثر ناس بتهمّهم قرارات الفائدة.", en: "Owners with variable mortgages or upcoming renewals are most exposed to rate decisions." } },
    investors: { level: "high", note: { ar: "الفائدة بتدخل بحساب تكلفة التمويل والعائد على أي عقار مؤجّر.", en: "Rates feed into financing costs and returns on rental property." } },
  },
  mortgage: {
    firstTime: { level: "high", note: { ar: "قواعد الرهن والقدرة على الشراء بتحدّد كم ممكن المشتري يقترض وكم لازم يدفع مقدّماً.", en: "Mortgage rules and affordability set how much a buyer can borrow and put down." } },
    sellers: { level: "medium", note: { ar: "أي تغيير بقدرة المشترين على التمويل ممكن ينعكس على الطلب.", en: "Changes in buyers' ability to finance can show up in demand." } },
    homeowners: { level: "high", note: { ar: "مهم لأي حدا عنده رهن أو بفكّر يجدّد أو يعيد التمويل.", en: "Relevant to anyone with a mortgage, renewing or refinancing." } },
    investors: { level: "medium", note: { ar: "شروط التمويل بتأثّر على تكلفة شراء عقار استثماري.", en: "Financing terms affect the cost of buying an investment property." } },
  },
  prices_sales: {
    firstTime: { level: "high", note: { ar: "أرقام الأسعار والمبيعات بتعطي المشتري صورة عن السوق قبل ما يقرّر.", en: "Price and sales figures give buyers a picture of the market before deciding." } },
    sellers: { level: "high", note: { ar: "البائع بستخدم أرقام المبيعات والأسعار ليفهم السوق ويسعّر بيته.", en: "Sellers use sales and price figures to read the market and price their home." } },
    homeowners: { level: "medium", note: { ar: "بتعطي فكرة عامة عن السوق، بس قيمة كل بيت بتختلف حسب موقعه ونوعه.", en: "Gives a general market picture; each home's value still depends on its location and type." } },
    investors: { level: "medium", note: { ar: "اتجاه الأسعار والمبيعات جزء من تقييم أي فرصة استثمارية.", en: "Price and sales trends are part of judging any investment." } },
  },
  first_time: {
    firstTime: { level: "high", note: { ar: "برامج ودعم موجّه مباشرة للمشترين لأول مرة. لازم نتأكد من الشروط من المصدر.", en: "Programs aimed directly at first-time buyers. Eligibility must be checked at the source." } },
    sellers: { level: "low", note: { ar: "تأثيرها على البائع غير مباشر، عن طريق المشترين المؤهلين.", en: "Indirect for sellers, through eligible buyers." } },
    homeowners: { level: "low", note: { ar: "غالباً مش موجّهة لأصحاب البيوت الحاليين.", en: "Usually not aimed at current owners." } },
    investors: { level: "low", note: { ar: "غالباً مش موجّهة للمستثمرين.", en: "Usually not aimed at investors." } },
  },
  policy_tax: {
    firstTime: { level: "medium", note: { ar: "الضرائب والرسوم ممكن تغيّر تكلفة الشراء. التفاصيل والشروط بالمصدر.", en: "Taxes and fees can change the cost of buying. Details and conditions are in the source." } },
    sellers: { level: "medium", note: { ar: "بعض السياسات والضرائب بتمسّ البائع وقت البيع. لازم نرجع للنص الرسمي.", en: "Some policies and taxes apply at sale. Check the official text." } },
    homeowners: { level: "medium", note: { ar: "ممكن تمسّ ضرائب العقار أو استخدامه. التفاصيل بالمصدر.", en: "May affect property taxes or use. Details are in the source." } },
    investors: { level: "high", note: { ar: "المستثمر عادةً أكثر حدا بتأثّر بقواعد الضرائب والتنظيم.", en: "Investors are usually most exposed to tax and zoning rules." } },
  },
  inventory: {
    firstTime: { level: "medium", note: { ar: "كمية البيوت المعروضة أو الجديدة بتحدّد قديش في خيارات قدام المشتري.", en: "The number of listed or new homes shapes how many options buyers have." } },
    sellers: { level: "high", note: { ar: "المعروض بحدّد قديش في منافسة على بيت البائع.", en: "Supply shapes how much competition a seller faces." } },
    homeowners: { level: "low", note: { ar: "تأثيره على أصحاب البيوت غير مباشر.", en: "Indirect for current owners." } },
    investors: { level: "medium", note: { ar: "بيانات البناء والمعروض بتساعد المستثمر يفهم الطلب على المدى البعيد.", en: "Construction and supply data help investors read longer-term demand." } },
  },
  rentals: {
    firstTime: { level: "medium", note: { ar: "كثير مستأجرين بقارنوا بين الإيجار والشراء.", en: "Many renters compare renting with buying." } },
    sellers: { level: "low", note: { ar: "تأثيره على البائع محدود إلا إذا كان بيته مؤجّر.", en: "Limited for sellers unless the home is rented." } },
    homeowners: { level: "low", note: { ar: "بهمّ أصحاب البيوت اللي بأجّروا جزء من بيتهم.", en: "Relevant to owners who rent out part of their home." } },
    investors: { level: "high", note: { ar: "الإيجارات ونسب الشواغر أساس حساب عائد العقار المؤجّر.", en: "Rents and vacancy are the basis of rental returns." } },
  },
  general: {
    firstTime: { level: "low", note: { ar: "خبر اقتصادي عام، صلته بالشراء غير مباشرة.", en: "General economic news, indirectly tied to buying." } },
    sellers: { level: "low", note: { ar: "خبر اقتصادي عام، صلته بالبيع غير مباشرة.", en: "General economic news, indirectly tied to selling." } },
    homeowners: { level: "low", note: { ar: "خبر اقتصادي عام. بعض المؤشرات مثل التضخم بتتابعها البنوك.", en: "General economic news. Some indicators, like inflation, are watched by lenders." } },
    investors: { level: "low", note: { ar: "مؤشر عام ممكن يكون جزء من صورة أكبر.", en: "A broad indicator that can be part of a bigger picture." } },
  },
};

/** Shown on every analysis. */
export const LIMITATIONS: Bi[] = [
  { ar: "التقييم والتصنيف تلقائي بالقواعد والكلمات، مش تحليل ذكاء اصطناعي، ومش توقّع لأداء المحتوى.", en: "Scores and tags are automatic keyword rules, not AI analysis and not a prediction of content performance." },
  { ar: "ملاحظات الجمهور قواعد عامة لنوع الخبر. ما بتقول إذا التأثير إيجابي أو سلبي، وما فيها توقّعات للسوق.", en: "Audience notes are general rules for this kind of news. They don't say whether the effect is good or bad, and make no market forecast." },
  { ar: "الأرقام منقولة حرفياً من نص المصدر. لازم نراجعها مع المصدر الأصلي قبل النشر.", en: "Figures are quoted exactly from the source text. Check them against the original before publishing." },
  { ar: "الخلاصة الرسمية أحياناً مختصرة. التفاصيل الكاملة بتكون بصفحة المصدر.", en: "Feed summaries can be short. Full details are on the source page." },
];

export const GLOSSARY: { term: Bi; en: string; def: Bi; categories: Category[] }[] = [
  { term: { ar: "سعر الفائدة الأساسي", en: "Policy rate" }, en: "Policy rate", categories: ["boc", "mortgage"], def: { ar: "سعر الفائدة اللي بحدّده بنك كندا، وبتتأثّر فيه فوائد القروض عند البنوك.", en: "The rate set by the Bank of Canada, which influences the rates banks charge on loans." } },
  { term: { ar: "الرهن المتغيّر", en: "Variable-rate mortgage" }, en: "Variable rate", categories: ["boc", "mortgage"], def: { ar: "رهن فائدته بتتغيّر مع سعر الفائدة عند البنك خلال مدة العقد.", en: "A mortgage whose rate moves with the lender's prime rate during the term." } },
  { term: { ar: "الرهن الثابت", en: "Fixed-rate mortgage" }, en: "Fixed rate", categories: ["boc", "mortgage"], def: { ar: "رهن فائدته ثابتة طول مدة العقد.", en: "A mortgage whose rate stays the same for the whole term." } },
  { term: { ar: "تجديد الرهن", en: "Mortgage renewal" }, en: "Renewal", categories: ["boc", "mortgage"], def: { ar: "لما تخلص مدة عقد الرهن، بتوقّع عقد جديد بفائدة حسب السوق وقتها.", en: "When a mortgage term ends, the borrower signs a new term at the rate available then." } },
  { term: { ar: "الموافقة المبدئية", en: "Pre-approval" }, en: "Pre-approval", categories: ["mortgage", "first_time"], def: { ar: "ورقة من البنك بتقلّك قديش ممكن يقرضك تقريباً، قبل ما تلاقي بيت.", en: "A lender's estimate of how much it may lend, before you find a home." } },
  { term: { ar: "اختبار التحمّل", en: "Stress test" }, en: "Stress test", categories: ["mortgage"], def: { ar: "البنك بيفحص إذا بتقدر تدفع الأقساط على فائدة أعلى من الفائدة اللي رح تاخدها.", en: "Lenders check you could still pay at a rate higher than the one you'll get." } },
  { term: { ar: "السعر المرجعي", en: "Benchmark price" }, en: "Benchmark", categories: ["prices_sales"], def: { ar: "سعر لبيت نموذجي بالمنطقة، بستخدموه ليقارنوا الأسعار مع الوقت بدقة أكثر من المتوسط.", en: "The price of a typical home in an area, used to compare prices over time more reliably than the average." } },
  { term: { ar: "متوسط سعر البيع", en: "Average selling price" }, en: "Average price", categories: ["prices_sales"], def: { ar: "مجموع أسعار البيوت المباعة مقسوم على عددها. بتأثّر فيه نوعية البيوت اللي انباعت.", en: "Total sale prices divided by the number of sales. It shifts with the mix of homes sold." } },
  { term: { ar: "إعلانات جديدة", en: "New listings" }, en: "New listings", categories: ["prices_sales", "inventory"], def: { ar: "عدد البيوت اللي انعرضت للبيع لأول مرة خلال الفترة.", en: "Homes put up for sale for the first time in the period." } },
  { term: { ar: "بدء البناء", en: "Housing starts" }, en: "Housing starts", categories: ["inventory"], def: { ar: "عدد الوحدات السكنية اللي بلّش بناؤها خلال الفترة.", en: "Homes on which construction began during the period." } },
  { term: { ar: "تصاريح البناء", en: "Building permits" }, en: "Building permits", categories: ["inventory"], def: { ar: "قيمة أو عدد تصاريح البناء اللي صدرت، وبتعطي فكرة عن البناء الجاي.", en: "The value or number of permits issued, a signal of upcoming construction." } },
  { term: { ar: "نسبة الشواغر", en: "Vacancy rate" }, en: "Vacancy", categories: ["rentals"], def: { ar: "نسبة الشقق الفاضية للإيجار. كل ما قلّت، صار الطلب على الإيجار أعلى من المعروض.", en: "The share of rental units that are empty. Lower means demand is tighter than supply." } },
  { term: { ar: "حساب التوفير لأول بيت", en: "FHSA" }, en: "FHSA", categories: ["first_time"], def: { ar: "حساب توفير معفى من الضريبة للمشترين لأول مرة بكندا، إله شروط وحدود سنوية.", en: "A tax-free savings account for first-time buyers in Canada, with eligibility rules and annual limits." } },
  { term: { ar: "ضريبة نقل الملكية", en: "Land transfer tax" }, en: "Land transfer tax", categories: ["policy_tax", "first_time"], def: { ar: "ضريبة بدفعها المشتري عند تسجيل البيت. تورنتو إلها ضريبة إضافية فوق ضريبة أونتاريو.", en: "A tax the buyer pays when the purchase is registered. Toronto charges its own on top of Ontario's." } },
  { term: { ar: "مؤشر أسعار المستهلك", en: "Consumer Price Index" }, en: "CPI", categories: ["general"], def: { ar: "مقياس لتغيّر أسعار السلع والخدمات، وبستخدمه بنك كندا لمتابعة التضخم.", en: "A measure of price changes for goods and services that the Bank of Canada uses to track inflation." } },
];

export const CATEGORY_LABEL: Record<Category, Bi> = {
  boc: { ar: "قرارات بنك كندا", en: "Bank of Canada decisions" },
  mortgage: { ar: "الرهن والقدرة على الشراء", en: "Mortgages & affordability" },
  prices_sales: { ar: "الأسعار والمبيعات", en: "Prices & sales" },
  first_time: { ar: "المشترين لأول مرة", en: "First-time buyers" },
  policy_tax: { ar: "سياسات وضرائب السكن", en: "Housing policy & taxes" },
  inventory: { ar: "المعروض والبناء", en: "Supply & construction" },
  rentals: { ar: "سوق الإيجار", en: "Rental market" },
  general: { ar: "اقتصاد عام", en: "General economy" },
};
