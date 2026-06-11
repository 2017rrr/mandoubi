# مشروع مندوبي — وثيقة شاملة لـ Claude Code

## ما هو مندوبي؟

مندوبي منصة توصيل في البحرين تربط أصحاب المحلات بمندوبين (سائقي سيارات) لتوصيل المنتجات.
مبني على نفس بنية مشوار لكنه مشروع **مستقل تماماً** — قاعدة بيانات مختلفة، repo مختلف، domain مختلف.

**الفرق الجوهري عن مشوار:**
- سعر واحد فقط: 2 BD (بدل بيكاب/سكس ويل)
- سيارة عادية فقط (بدون اختيار نوع مركبة)
- اسم "مندوب" بدل "سائق"
- هوية بصرية برتقالية + شعار سيارة SVG

---

## المعلومات التقنية الأساسية

```
GitHub:         https://github.com/2017rrr/mandoubi
Token GitHub:   [محفوظ في بيئة Claude — لا يُكتب هنا]

Supabase URL:   https://cymbgcojjhifjmadafbf.supabase.co
Supabase ID:    cymbgcojjhifjmadafbf
Anon Key:       [موجود في .env.local و Vercel Environment Variables]

الكود محلياً:   /home/claude/mandoubi/
```

---

## الأسعار والعمولات

```typescript
// src/utils/constants.ts
PRICES.standard = 2.000  // البحريني يدفع
COMMISSION       = 1.000  // عمولة الشركة
DRIVER_EARNINGS.standard = 1.000  // المندوب يحصل

// صيغة المبلغ دائماً
formatAmount(2) → "2.000 BD"
```

**قاعدة لا تتغير:** المندوب يحصل دائماً على `amount - 1`

---

## هيكل الملفات

```
src/
  pages/
    Login.tsx          — تسجيل دخول بشعار السيارة
    Register.tsx       — إنشاء حساب + OTP
    ChooseRole.tsx     — اختيار الدور (متجر/مندوب)
    store/
      StoreDashboard.tsx   — لوحة صاحب المحل
      StoreNewOrder.tsx    — إنشاء طلب جديد
      StoreProfile.tsx     — الملف الشخصي
    driver/
      DriverDashboard.tsx  — لوحة المندوب
    admin/
      AdminDashboard.tsx   — لوحة الأدمن
    ChatScreen.tsx     — المحادثة داخل الطلب

  components/
    CarLogo.tsx        — شعار السيارة SVG (مميز لمندوبي)
    TopBar.tsx         — الشريط العلوي
    BottomNav.tsx      — التنقل السفلي
    OrderCard.tsx      — بطاقة الطلب
    TelegramLink.tsx   — ربط تلغرام
    WhatsAppSupport.tsx — دعم واتساب

  utils/
    constants.ts       — الأسعار، الحالات، الأنواع
    notificationSound.ts
    storageUtils.ts

  contexts/
    AuthContext.tsx     — إدارة المصادقة

  integrations/
    supabase/client.ts — اتصال Supabase
    supabase/types.ts  — أنواع TypeScript

  i18n/
    ar.ts              — الترجمة العربية
    en.ts              — الترجمة الإنجليزية
    index.ts           — إعداد i18next
```

---

## قاعدة البيانات — الجداول

### profiles
```sql
id uuid (FK → auth.users)
name text
phone text
role text CHECK IN ('store', 'driver', 'admin')
created_at timestamptz
```
**ملاحظة:** يُنشأ تلقائياً عند تسجيل مستخدم جديد عبر trigger `on_auth_user_created`

### stores
```sql
id uuid PK
user_id uuid UNIQUE (FK → profiles)
store_name text
location_text text
created_at timestamptz
```

### drivers
```sql
id uuid PK
user_id uuid UNIQUE (FK → profiles)
vehicle_type text DEFAULT 'standard'   ← دائماً standard في مندوبي
is_available boolean DEFAULT true
rating numeric DEFAULT 0
created_at timestamptz
```

### orders
```sql
id uuid PK
order_number bigint IDENTITY           ← رقم تسلسلي للعرض
store_id uuid (FK → stores)
driver_id uuid nullable (FK → drivers)
pickup_address text
delivery_address text
pickup_lat, pickup_lng double precision
delivery_lat, delivery_lng double precision
delivery_type text DEFAULT 'standard'  ← دائماً standard في مندوبي
amount numeric DEFAULT 2.000           ← السعر الثابت
description text
notes text
client_phone text
pickup_time text DEFAULT 'immediate'
status text DEFAULT 'pending'
payment_status text DEFAULT 'pending'
receipt_url text
photo_before_url text
photo_after_url text
created_at, updated_at timestamptz
```

### messages
```sql
id uuid PK
order_id uuid (FK → orders)
sender_id uuid (FK → profiles)
sender_role text                  ← 'store' | 'driver' | 'admin'
message text
message_type text DEFAULT 'text'
media_url text
duration_seconds integer
created_at timestamptz
```

### notifications
```sql
id uuid PK
user_id uuid (FK → profiles)
order_id uuid nullable (FK → orders)
type text
title text
body text
is_read boolean DEFAULT false
created_at timestamptz
```

### telegram_users
```sql
id uuid PK
user_id uuid (FK → profiles)
telegram_chat_id bigint UNIQUE
linked_at timestamptz
```

### telegram_link_codes
```sql
id uuid PK
user_id uuid
code text UNIQUE
expires_at timestamptz
used boolean DEFAULT false
created_at timestamptz
```

---

## دوال قاعدة البيانات (RPCs)

### للتطبيق (مع auth session)
```sql
-- قبول طلب من المندوب
driver_accept_order(order_id uuid) → void

-- التحقق من أن المستخدم مندوب
has_driver_profile(_user_id uuid) → boolean

-- التحقق من أن المستخدم صاحب محل
has_store_profile(_user_id uuid) → boolean
```

### للبوت (بدون auth session)
```sql
-- قبول طلب من البوت
driver_accept_order_by_user(p_order_id uuid, p_driver_user_id uuid) → void

-- تحديث حالة الطلب من البوت
update_order_status_by_driver(p_order_id uuid, p_driver_user_id uuid, p_new_status text) → void

-- إرسال رسالة من البوت
send_chat_message_from_bot(p_order_id uuid, p_sender_user_id uuid, p_sender_role text, p_message text) → void
```

### مساعدة
```sql
is_admin(user_id uuid) → boolean
get_admin_ids() → TABLE(id uuid)
```

### View
```sql
-- الطلبات المتاحة للمندوبين (pending + بدون مندوب)
available_orders_for_drivers
-- يحتوي على: كل حقول orders + store_name
```

---

## Storage Buckets

| Bucket | الاستخدام |
|--------|-----------|
| `receipts` | إيصالات الدفع (BenefitPay) |
| `delivery-photos` | صور قبل/بعد التوصيل |
| `chat-media` | وسائط المحادثة |

---

## حالات الطلب (Order Status Flow)

```
pending → driver_assigned → arrived_pickup → loaded → in_transit → delivered
                                                                  ↘ cancelled
```

| الحالة | المعنى | من يغيرها |
|--------|--------|-----------|
| `pending` | جديد، ينتظر مندوب | تلقائي عند الإنشاء |
| `driver_assigned` | مندوب قبل الطلب | المندوب (acceptOrder) |
| `arrived_pickup` | وصل لمكان الاستلام | المندوب |
| `loaded` | تم تحميل البضاعة | المندوب |
| `in_transit` | في الطريق للتوصيل | المندوب |
| `delivered` | تم التسليم | المندوب |
| `cancelled` | ملغي | الأدمن |

---

## التوجيه (Routing)

```typescript
/login           → Login.tsx
/register        → Register.tsx
/forgot-password → ForgotPassword.tsx
/choose-role     → ChooseRole.tsx

/store           → StoreDashboard (طلباتي)
/store/new       → StoreNewOrder
/store/profile   → StoreProfile

/driver          → DriverDashboard (طلبات متاحة + طلباتي)
/driver/history  → سجل التوصيل

/admin           → AdminDashboard

/order/:orderId  → ChatScreen (محادثة الطلب)
```

---

## نظام المصادقة

```typescript
// AuthContext يوفر:
user       // Supabase User | null
profile    // { id, name, phone, role } | null
loading    // boolean
signOut()
refreshProfile()
```

**التدفق:**
1. مستخدم جديد → Register → OTP → ChooseRole → Dashboard
2. مستخدم موجود → Login → Dashboard مباشرة
3. انتهاء الجلسة → توجيه تلقائي لـ /login

---

## الهوية البصرية (Design System)

### الألوان
```css
--primary: hsl(22, 100%, 55%)     /* برتقالي #f97316 */
--background: hsl(18, 20%, 4%)    /* أسود دافئ */
--card: hsl(20, 22%, 9%)          /* بطاقة داكنة */
--foreground: hsl(30, 15%, 95%)   /* أبيض دافئ */
--success: hsl(152, 76%, 42%)     /* أخضر */
--destructive: hsl(0, 84%, 60%)   /* أحمر */
```

### الخط
```css
font-family: 'Cairo', sans-serif;
/* أوزان: 300, 400, 500, 600, 700, 800, 900 */
```

### CSS Classes الجاهزة
```css
.app-container    /* حاوية عرض 430px */
.page-content     /* padding-bottom: 96px للـ BottomNav */
.top-bar          /* sticky header */
.bottom-nav       /* fixed footer */
.order-card       /* بطاقة الطلب */
.btn-primary      /* زر برتقالي بتدرج */
.input-field      /* حقل إدخال موحد */
.status-badge     /* شارة الحالة */
.page-glow        /* التوهج البرتقالي العلوي */
```

### شعار السيارة
```tsx
import { CarLogo } from '@/components/CarLogo';

// الاستخدام
<CarLogo size={48} color="white" />
<CarLogo size={24} color="currentColor" />

// يرسم سيارة SVG جانبية مع نوافذ ومصابيح وعجلات
// الأبعاد: width=size, height=size*0.6
```

### نمط الأزرار الرئيسية
```tsx
// الزر الرئيسي دائماً
<button
  style={{
    height: '52px',
    width: '100%',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, hsl(22 100% 55%), hsl(16 95% 48%))',
    boxShadow: '0 4px 20px hsl(22 100% 55% / 0.4)',
  }}
>
```

---

## المكونات الأساسية

### CarLogo.tsx
شعار السيارة SVG المرسوم خصيصاً لمندوبي. يظهر في:
- TopBar (24px)
- صفحات Login/Register/ChooseRole (56-80px)
- أي مكان يحتاج هوية المشروع

### OrderCard.tsx
بطاقة الطلب مع:
- رقم الطلب باللون البرتقالي
- شارة حالة ملونة بنقطة حية
- عنواني الاستلام والتوصيل مع أيقونات
- حد برتقالي للطلبات النشطة
- المبلغ باللون البرتقالي

```tsx
<OrderCard
  order={order}
  showDriverAmount={true}   // لعرض نصيب المندوب (1 BD)
  showDriverAmount={false}  // لعرض السعر الكامل (2 BD)
/>
```

### TopBar.tsx
- شعار CarLogo صغير + اسم الصفحة
- زر الإشعارات مع عداد برتقالي
- لوحة إشعارات تنزلق من اليمين (بدل Sheet)
- الإشعار غير المقروء له خط برتقالي جانبي

### BottomNav.tsx
```tsx
// هيكل بند التنقل
{ icon: '📦', label: 'طلباتي', path: '/store' }

// العنصر النشط يأخذ:
// - خلفية مربعة برتقالية شفافة
// - نص برتقالي
// - أيقونة أكبر قليلاً (scale 1.15)
```

---

## نموذج إنشاء الطلب (StoreNewOrder)

**الحقول:**
1. عنوان الاستلام (نص + إحداثيات اختيارية)
2. عنوان التوصيل (نص + إحداثيات اختيارية)
3. وصف البضاعة
4. رقم هاتف العميل
5. وقت الاستلام (فوري / محدد)
6. ملاحظات
7. إيصال الدفع (صورة BenefitPay)

**نوع التوصيل:** ثابت `standard` — لا يوجد اختيار للمستخدم
**السعر:** ثابت 2.000 BD — يُعرض للمستخدم كمعلومة فقط

**تدفق الإنشاء:**
```
رفع الإيصال → verify-receipt Edge Function → تأكيد المبلغ → حفظ الطلب
```

**المسودة التلقائية:**
```typescript
const DRAFT_KEY = 'store_new_order_draft';
// تُحفظ في localStorage عند كل تغيير
// تُمسح بعد إرسال الطلب بنجاح
```

---

## التحقق من الإيصال (verify-receipt)

```typescript
// Edge Function: verify-receipt
POST /functions/v1/verify-receipt
{
  receiptPath: string,    // المسار في storage bucket
  expectedAmount: number  // 2.000
}

// تستخدم Claude AI للتحقق من:
// 1. صحة الإيصال
// 2. المبلغ يطابق expectedAmount
// 3. توقيت البحرين UTC+3

// تعيد: { valid: boolean, reason?: string }
```

**⚠️ مهم:** إذا رُفض الإيصال رغم صحته → مشكلة توقيت UTC+3

---

## دفع BenefitPay

```typescript
const BENEFITPAY_NUMBER = '39105085';  // رقم BenefitPay للدفع
const WHATSAPP_NUMBER = '97339105085'; // دعم واتساب

// المبلغ الثابت: 2.000 BD
```

---

## نظام الإشعارات

```typescript
// الإشعارات تُرسل في هذه الحالات:
// 1. قبول طلب → إشعار لصاحب المحل
// 2. تحديث حالة → إشعار لصاحب المحل
// 3. رسالة جديدة → إشعار للطرف الآخر

// إضافة إشعار:
await supabase.from('notifications').insert({
  user_id: targetUserId,
  order_id: orderId,
  type: 'order_accepted' | 'status_update' | 'new_message',
  title: 'العنوان',
  body: 'نص الإشعار'
});
```

---

## قواعد لا تنكسر أبداً

| القاعدة | السبب |
|---------|-------|
| استخدم `\|` كفاصل في callback_data تلغرام | UUID يحتوي على `_` فيختلط |
| توقيت البحرين = UTC+3 دائماً | verify-receipt يقارن بالتوقيت المحلي |
| المندوب يحصل على `amount - 1` دائماً | عمولة الشركة 1 BD |
| لا تستخدم `.single()` مع استعلامات متعددة | يسبب PGRST116 |
| `delivery_type` دائماً `'standard'` | مندوبي لا يدعم أنواع أخرى |
| `amount` دائماً `2.000` | السعر ثابت في مندوبي |
| لا تعدّل مشروع مشوار | المشروعان مستقلان تماماً |

---

## مشاكل شائعة وحلولها

**قبول طلب يعطي "not a driver":**
```sql
-- تأكد من وجود سجل في جدول drivers
SELECT * FROM drivers WHERE user_id = 'USER_ID';
-- إذا غير موجود، أضفه
INSERT INTO drivers (user_id) VALUES ('USER_ID');
```

**تحديث حالة يفشل في البوت:**
```sql
-- استخدم الدالة المخصصة وليس UPDATE مباشر
SELECT update_order_status_by_driver(order_id, driver_user_id, new_status);
```

**الإيصال مرفوض رغم صحته:**
→ مشكلة توقيت. verify-receipt يحسب وقت البحرين UTC+3

**404 على صفحة ثابتة:**
→ أضف استثناء في vercel.json قبل `/(.*)`

---

## بوت تلغرام (قيد الإعداد)

```
Bot Token: لم يُنشأ بعد
@Mandoubi_bot: لم يُسجَّل بعد
```

عند إنشاء البوت يجب:
1. استخدام نفس Edge Function من مشوار مع تعديل الـ token
2. تغيير رسائل البوت من "سائق" إلى "مندوب"
3. تغيير المبالغ من 5/10 BD إلى 2 BD

---

## الـ Edge Functions

| الدالة | الحالة | الوصف |
|--------|--------|-------|
| `verify-receipt` | يحتاج نشر | التحقق من إيصال BenefitPay |
| `telegram-bot` | يحتاج نشر | بوت تلغرام |

---

## متغيرات البيئة

```bash
# .env.local (لا يُرفع لـ GitHub)
VITE_SUPABASE_URL="https://cymbgcojjhifjmadafbf.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="[anon key من Supabase Dashboard]"
VITE_SUPABASE_PROJECT_ID="cymbgcojjhifjmadafbf"

# في Vercel Environment Variables أيضاً
```

---

## أوامر Git المعتادة

```bash
cd /home/claude/mandoubi

# دفع تغيير جديد
git add .
git commit -m "وصف التغيير"
git push origin main

# بيانات GitHub
# Remote: https://TOKEN@github.com/2017rrr/mandoubi.git
```

---

## الفرق الكامل عن مشوار

| العنصر | مشوار | مندوبي |
|--------|-------|--------|
| GitHub | /mishwark | /mandoubi |
| Supabase | hedjuzsdloazltxgmckr | cymbgcojjhifjmadafbf |
| اللون | أزرق | **برتقالي** |
| الخط | IBM Plex Sans Arabic | **Cairo** |
| الشعار | نص فقط | **سيارة SVG** |
| السعر | 5 BD / 10 BD | **2 BD فقط** |
| أنواع التوصيل | بيكاب / سكس ويل | **سيارة عادية فقط** |
| اسم المستخدم | سائق | **مندوب** |
| البوت | @Mishawark_bot | **@Mandoubi_bot (قيد الإعداد)** |
| الدومين | mishawark.com | **mandoubi.com (قيد الإعداد)** |
