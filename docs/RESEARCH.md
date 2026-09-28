# EdTech platform research — what the leaders have in common

Platforms studied: Coursera, Udemy, edX, Great Learning, Simplilearn, upGrad, Scaler, Internshala, LinkedIn Learning.

## 1. Patterns every top platform shares (we copy these)
| Area | Pattern | Seen on | Gradient Code |
|---|---|---|---|
| Home | Search-first hero, category chips, featured course grid, trust strip, “how it works”, CTA | Coursera, Udemy | ✅ built |
| Catalog | Left filter sidebar (topic, level, price, format), sort, active-filter chips, result count | Coursera, Udemy | ✅ built (URL-driven, SEO-friendly) |
| Course card | Thumbnail, title, instructor, rating + count, hours, price with strike-through MRP, badges (Bestseller) | Udemy | ✅ built |
| Course page | Dark hero band → “What you'll learn” box → skills → curriculum accordion → requirements → description → who it's for → instructor → reviews; **sticky buy box** on the right | Udemy | ✅ built (instructor block + FAQ pending) |
| Free preview | 1st lesson playable without buying | Udemy, Coursera | ✅ layout, needs server fetch |
| Player | Video left, curriculum sidebar right, mark complete, prev/next, progress bar, tabs (Notes, Q&A, Resources) | Udemy, Coursera | ✅ core; tabs pending |
| Dashboard | Resume hero, progress cards, stats, certificates | Coursera | ✅ core |
| Certificates | Public verification URL + LinkedIn “Add to profile” | Coursera, Great Learning | ⏳ Phase 4 |
| Reviews | Stars + histogram, only enrolled learners can review | Udemy | ✅ DB + display; form pending |
| Checkout | Order summary, coupon, UPI/cards (Razorpay in India), refund note | Udemy, Scaler | ⏳ Phase 3 |
| Internships | Listing cards (stipend, duration, mode, skills), filters, apply with resume, status tracking | Internshala | ✅ listing + detail; apply pending |
| Career tracks | Bundle courses into a “program” with a higher price + mentorship | Great Learning, upGrad | ⏳ Phase 6 |
| SEO | `schema.org/Course` JSON-LD, server-rendered pages, clean slugs | all | ✅ on course page |

## 2. Business models
- **One-time per course** (Udemy) — easiest to start. ✅ current model.
- **Career-track bundle** (Great Learning/upGrad) — higher ticket, add mentorship + internship.
- **Subscription** (Coursera Plus, LinkedIn Learning) — later, once catalog has 15+ courses.
- Discount psychology: MRP strike-through + % off + coupon codes (Udemy).

## 3. What makes it feel “industry level”
1. Consistent spacing & tokens (done via Tailwind v4 theme).
2. Real numbers only — rating/learner counts come from DB, never invented.
3. Fast: server-rendered, no heavy client JS on marketing pages (current home ≈ 111 kB first load).
4. Trust: refund policy, secure payment note, verifiable certificates, instructor credentials.
5. Empty states and loading states everywhere.

## 4. Differentiator for Gradient Code
“Complete a course → unlock an internship.” Courses link to internships via `internships.required_course_id`, which connects learning to outcomes — something neither Udemy nor Internshala does alone.
