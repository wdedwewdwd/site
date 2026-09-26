/**
 * Sample catalog for development and first deploy.
 * Idempotent: safe to run multiple times (uses upserts keyed by slug/sku/code).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const categories = [
  { slug: "filters", name: "فیلترجات خودرو", icon: "wind" },
  { slug: "oil", name: "روغن و روانکننده‌ها", icon: "droplet" },
  { slug: "electrical", name: "سیستم برقی خودرو", icon: "battery" },
  { slug: "brakes", name: "لوازم ترمز", icon: "disc" },
  { slug: "suspension", name: "جلوبندی و کمک فنر", icon: "circle-dot" },
  { slug: "gearbox", name: "گیربکس و کلاچ", icon: "settings" },
  { slug: "engine", name: "قطعات موتور", icon: "cog" },
];

const brands = [
  { slug: "bosch", name: "بوش", latin: "BOSCH", country: "آلمان" },
  { slug: "meco", name: "مکو", latin: "MECO", country: "ایران" },
  { slug: "isaco", name: "ایساکو", latin: "ISACO", country: "ایران" },
  { slug: "phc", name: "پی اچ سی", latin: "PHC", country: "کره جنوبی" },
  { slug: "ngk", name: "ان‌جی‌کا", latin: "NGK", country: "ژاپن" },
  { slug: "behran", name: "بهران", latin: "Behran", country: "ایران" },
];

const cars = [
  { slug: "peugeot-206-t5", make: "پژو", name: "پژو ۲۰۶ تیپ ۵" },
  { slug: "peugeot-206", make: "پژو", name: "پژو ۲۰۶" },
  { slug: "peugeot-207", make: "پژو", name: "پژو ۲۰۷" },
  { slug: "peugeot-405", make: "پژو", name: "پژو ۴۰۵" },
  { slug: "samand", make: "ایران خودرو", name: "سمند" },
  { slug: "pride", make: "سایپا", name: "پراید" },
  { slug: "tiba", make: "سایپا", name: "تیبا" },
];

type P = {
  sku: string; slug: string; name: string; category: string; brand: string; price: number; compareAt?: number;
  stock: number; rating: number; ratings: number; sold: number; img: number; cars: string[]; oem?: string;
};

const products: P[] = [
  { sku: "BR-1001", slug: "bosch-front-brake-pad-206-t5", name: "لنت ترمز جلو پژو ۲۰۶ تیپ ۵ بوش", category: "brakes", brand: "bosch", price: 320_000, compareAt: 380_000, stock: 24, rating: 4.5, ratings: 128, sold: 540, img: 1, cars: ["peugeot-206-t5", "peugeot-206", "peugeot-207"], oem: "0986AB1234" },
  { sku: "BR-1002", slug: "meco-rear-brake-pad-206", name: "لنت ترمز عقب پژو ۲۰۶ کربنی مکو", category: "brakes", brand: "meco", price: 290_000, compareAt: 340_000, stock: 40, rating: 4.0, ratings: 64, sold: 410, img: 2, cars: ["peugeot-206", "peugeot-206-t5"] },
  { sku: "BR-1003", slug: "isaco-front-brake-pad-samand", name: "لنت ترمز جلو سمند ملی ایساکو", category: "brakes", brand: "isaco", price: 410_000, compareAt: 480_000, stock: 18, rating: 4.7, ratings: 91, sold: 380, img: 3, cars: ["samand"] },
  { sku: "BR-1004", slug: "phc-front-brake-pad-pride", name: "لنت ترمز جلو پراید کره ای پی اچ سی", category: "brakes", brand: "phc", price: 180_000, compareAt: 210_000, stock: 55, rating: 4.1, ratings: 210, sold: 720, img: 4, cars: ["pride", "tiba"] },
  { sku: "BR-1005", slug: "isaco-front-brake-pad-405", name: "لنت ترمز جلو ایساکو ۴۰۵", category: "brakes", brand: "isaco", price: 450_000, compareAt: 510_000, stock: 12, rating: 4.5, ratings: 45, sold: 190, img: 1, cars: ["peugeot-405"] },
  { sku: "BR-1006", slug: "meco-front-brake-disc-206", name: "دیسک ترمز چرخ جلو پژو ۲۰۶ مکو", category: "brakes", brand: "meco", price: 830_000, compareAt: 980_000, stock: 9, rating: 4.4, ratings: 33, sold: 120, img: 2, cars: ["peugeot-206", "peugeot-206-t5"] },
  { sku: "BR-1007", slug: "bosch-rear-brake-pad", name: "لنت ترمز عقب بوش", category: "brakes", brand: "bosch", price: 325_000, compareAt: 380_000, stock: 0, rating: 4.2, ratings: 20, sold: 90, img: 3, cars: ["peugeot-206", "peugeot-207"] },
  { sku: "BR-1008", slug: "bosch-dot4-brake-fluid", name: "روغن ترمز بوش مدل DOT 4", category: "brakes", brand: "bosch", price: 125_000, compareAt: 145_000, stock: 70, rating: 4.6, ratings: 77, sold: 300, img: 4, cars: [] },
  { sku: "OL-2001", slug: "behran-pishtaz-10w40-4l", name: "روغن موتور بهران پیشتاز ۱۰W۴۰ چهار لیتری", category: "oil", brand: "behran", price: 415_000, compareAt: 490_000, stock: 35, rating: 4.8, ratings: 150, sold: 650, img: 1, cars: [] },
  { sku: "EL-3001", slug: "ngk-spark-plug-short", name: "شمع سوزنی ان‌جی‌کا پایه کوتاه", category: "electrical", brand: "ngk", price: 180_000, compareAt: 210_000, stock: 100, rating: 4.5, ratings: 98, sold: 500, img: 2, cars: ["peugeot-206", "pride", "samand"], oem: "7092" },
  { sku: "EL-3002", slug: "ngk-spark-plug-japan", name: "شمع سوزنی ان‌جی‌کا اصل ژاپن", category: "electrical", brand: "ngk", price: 385_000, stock: 60, rating: 4.9, ratings: 40, sold: 210, img: 3, cars: ["peugeot-206", "peugeot-207", "peugeot-405"], oem: "7092" },
  { sku: "FL-4001", slug: "bosch-oil-filter-206", name: "فیلتر روغن پژو ۲۰۶ بوش", category: "filters", brand: "bosch", price: 145_000, compareAt: 165_000, stock: 44, rating: 4.3, ratings: 58, sold: 260, img: 4, cars: ["peugeot-206", "peugeot-206-t5", "peugeot-207"] },
  { sku: "FL-4002", slug: "isaco-air-filter-samand", name: "فیلتر هوا سمند ایساکو", category: "filters", brand: "isaco", price: 120_000, stock: 30, rating: 4.0, ratings: 22, sold: 140, img: 1, cars: ["samand"] },
  { sku: "SU-5001", slug: "isaco-front-shock-405", name: "کمک فنر جلو پژو ۴۰۵ ایساکو", category: "suspension", brand: "isaco", price: 1_450_000, compareAt: 1_600_000, stock: 8, rating: 4.4, ratings: 19, sold: 60, img: 2, cars: ["peugeot-405"] },
  { sku: "GB-6001", slug: "meco-clutch-kit-pride", name: "دیسک و صفحه کلاچ پراید مکو", category: "gearbox", brand: "meco", price: 980_000, stock: 15, rating: 4.1, ratings: 26, sold: 75, img: 3, cars: ["pride", "tiba"] },
  { sku: "EN-7001", slug: "isaco-timing-belt-206", name: "تسمه تایم پژو ۲۰۶ ایساکو", category: "engine", brand: "isaco", price: 390_000, compareAt: 430_000, stock: 26, rating: 4.6, ratings: 37, sold: 180, img: 4, cars: ["peugeot-206", "peugeot-206-t5"] },
];

async function main() {
  const catIds: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    const row = await db.category.upsert({ where: { slug: c.slug }, create: { ...c, sortOrder: i }, update: { name: c.name, icon: c.icon } });
    catIds[c.slug] = row.id;
  }
  const brandIds: Record<string, string> = {};
  for (const b of brands) brandIds[b.slug] = (await db.brand.upsert({ where: { slug: b.slug }, create: b, update: b })).id;
  const carIds: Record<string, string> = {};
  for (const [i, c] of cars.entries())
    carIds[c.slug] = (await db.carModel.upsert({ where: { slug: c.slug }, create: { ...c, sortOrder: i }, update: c })).id;

  for (const p of products) {
    const data = {
      name: p.name,
      slug: p.slug,
      price: p.price,
      compareAtPrice: p.compareAt ?? null,
      stock: p.stock,
      ratingAvg: p.rating,
      ratingCount: p.ratings,
      soldCount: p.sold,
      oemCode: p.oem ?? null,
      warranty: "۱۲ ماهه آریزون یدک",
      madeIn: brands.find((b) => b.slug === p.brand)?.country,
      weightGrams: 1200,
      description: `${p.name} با ضمانت اصالت کالا و سلامت فیزیکی. این قطعه پیش از ارسال توسط کارشناسان آریزون یدک کنترل کیفی می‌شود.`,
      categoryId: catIds[p.category],
      brandId: brandIds[p.brand],
    };
    const product = await db.product.upsert({ where: { sku: p.sku }, create: { sku: p.sku, ...data }, update: data });
    await db.productImage.deleteMany({ where: { productId: product.id } });
    await db.productImage.createMany({
      data: [
        { productId: product.id, url: `/images/products/sample-${p.img}.jpg`, alt: p.name, sortOrder: 0 },
        { productId: product.id, url: `/images/products/sample-${(p.img % 4) + 1}.jpg`, alt: p.name, sortOrder: 1 },
      ],
    });
    await db.productFitment.deleteMany({ where: { productId: product.id } });
    if (p.cars.length)
      await db.productFitment.createMany({ data: p.cars.map((c) => ({ productId: product.id, carModelId: carIds[c] })) });
  }

  await db.discountCode.upsert({
    where: { code: "ARIZON10" },
    create: { code: "ARIZON10", type: "PERCENT", value: 10, maxDiscount: 200_000, minOrder: 300_000 },
    update: {},
  });

  if ((await db.faq.count()) === 0) {
    await db.faq.createMany({
      data: [
        { question: "چطور از اصالت قطعه مطمئن شوم؟", answer: "تمام قطعات آریزون یدک با ضمانت اصالت و فاکتور رسمی ارسال می‌شوند و در صورت عدم اصالت، وجه به‌طور کامل بازگردانده می‌شود.", group: "خرید", sortOrder: 1 },
        { question: "زمان ارسال سفارش چقدر است؟", answer: "ارسال سریع در تهران ۱ تا ۲ روز کاری و ارسال با پست پیشتاز به سراسر کشور ۳ تا ۴ روز کاری زمان می‌برد.", group: "ارسال", sortOrder: 2 },
        { question: "آیا امکان مرجوع کردن کالا وجود دارد؟", answer: "بله. طبق قانون تجارت الکترونیکی، تا ۷ روز پس از تحویل حق انصراف از خرید دارید، به شرط آنکه کالا نصب و استفاده نشده باشد.", group: "مرجوعی", sortOrder: 3 },
        { question: "چگونه قطعه مناسب خودرویم را پیدا کنم؟", answer: "در صفحه هر محصول بخش «خودروهای سازگار» را ببینید یا از فیلتر سازگاری خودرو در لیست محصولات استفاده کنید. در صورت تردید با پشتیبانی تماس بگیرید.", group: "خرید", sortOrder: 4 },
        { question: "روش‌های پرداخت کدام است؟", answer: "پرداخت آنلاین از طریق درگاه امن بانکی (عضو شبکه شاپرک) و پرداخت در محل با کارتخوان.", group: "پرداخت", sortOrder: 5 },
      ],
    });
  }

  console.log(`Seeded ${categories.length} categories, ${brands.length} brands, ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
