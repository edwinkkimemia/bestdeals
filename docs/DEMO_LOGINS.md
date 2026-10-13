# Demo logins — chap.co.ke

> Public demo credentials. All demo users share one password (override with
> `SEED_USER_PASSWORD`). Never use these for admins — sign up with an
> `ADMIN_EMAILS` address instead (e.g. `admin@chap.co.ke`).

Default password: **`ChapDemo123!`** (or your `SEED_USER_PASSWORD` if set).

## Admin

| Role | How to get it |
|---|---|
| Admin | Sign up at `/auth/signup` with `admin@chap.co.ke` (or any `ADMIN_EMAILS` address), then sign in. Admin opens `/admin`. |

Locked out? Another admin can reset you: `PUT /api/admin/users { email, password }`
(clears the 15-min login lock too), or `PATCH /api/admin/users { email }` to just
unlock. Self-service: `/auth/password/request` → reset link (in demo mode the link
is returned in the API response + server log because email isn't configured).

## Demo sellers (own the catalogue listings)

| Seller | Email | Phone | Shop |
|---|---|---|---|
| FonZone Nairobi (business) | fonzone.nairobi@demo.chap.co.ke | 0722123456 | fon-zone-nairobi |
| Daniel K. | daniel.k@demo.chap.co.ke | 0710000109 | — |
| Pwani Homes | pwani.homes@demo.chap.co.ke | 0710000110 | — |
| Achieng O. | achieng.o@demo.chap.co.ke | 0710000111 | — |
| Kamau FixIt | kamau.fixit@demo.chap.co.ke | 0710000106 | — |
| Mama Fua Styles (business) | mama.fua.styles@demo.chap.co.ke | 0733987654 | mama-fua-styles |
| Pwani Fresh Foods (business) | pwani.fresh.foods@demo.chap.co.ke | 0700111222 | pwani-fresh-foods |
| Kiprop M. | kiprop.m@demo.chap.co.ke | 0710000112 | — |
| Rift Hardware Ltd (business) | rift.hardware.ltd@demo.chap.co.ke | 0711223344 | rift-hardware |
| Savannah SACCO (business) | savannah.sacco@demo.chap.co.ke | 0710000105 | — |
| Wanjiku M. | wanjiku.m@demo.chap.co.ke | 0710000101 | — |
| Otieno J. | otieno.j@demo.chap.co.ke | 0710000102 | — |
| Mwangi K. | mwangi.k@demo.chap.co.ke | 0710000104 | — |
| Chebet R. | chebet.r@demo.chap.co.ke | 0710000103 | — |
| Naliaka W. | naliaka.w@demo.chap.co.ke | 0710000107 | — |
| Baraka T. | baraka.t@demo.chap.co.ke | 0710000108 | — |

## Demo buyer + demo shops

| Account | Email | Notes |
|---|---|---|
| Demo Buyer | demo.buyer@demo.chap.co.ke | password same as above, phone 0712345678 |

Shops (storefronts at `/shops/<slug>`, owned by the seller in the same row above):

- `fon-zone-nairobi` — FonZone Nairobi — 0722123456
- `mama-fua-styles` — Mama Fua Styles — 0733987654
- `rift-hardware` — Rift Hardware Ltd — 0711223344
- `pwani-fresh-foods` — Pwani Fresh Foods — 0700111222

## Why "Invalid email or password" happens

1. **Wrong password** — demo password is `ChapDemo123!` unless `SEED_USER_PASSWORD`
   is set in your env. Re-seeds never overwrite an existing demo password, so a
   changed demo password survives redeploys (rotate via `PUT /api/admin/users`).
2. **Demo mode restart** — without `DATABASE_URL` the store is in-memory and wipes
   on restart. Sign-in now re-seeds missing `@demo.chap.co.ke` accounts on demand,
   so just retry with the default password.
3. **Locked out** — 5 wrong tries locks the email for ~15 min (`429`). Wait, use
   password reset, or ask an admin to unlock (`PATCH /api/admin/users`).
4. **Admin vs demo** — admins are NOT in the table above. If you signed up
   `admin@chap.co.ke` with your own password, use that — not the demo password.
