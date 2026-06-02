# Production Setup — SMTP, Resend, Sentry

Tres configuraciones de dashboards para hacer una vez. ~25 min en total.

---

## 1. Verificar `courtsociety.org` en Resend (~10 min + propagación DNS)

Sin esto, ni los magic links ni los emails de aprobación llegan con el branding de Court Society.

1. https://resend.com → **Domains → Add Domain** → `courtsociety.org`.
2. Resend te muestra 3–4 records DNS (un TXT para SPF, dos CNAME para DKIM, opcionalmente uno para MX). Copialos.
3. Andá a tu DNS provider (Cloudflare / Namecheap / Route53 / GoDaddy). Pegá cada record exactamente como Resend los muestra. **No agregues ni saques nada de los nombres ni los valores.**
   - En Cloudflare: dejá los records de Resend con la nube **gris** (DNS only), no naranja (proxied). Resend no se lleva bien con el proxy.
4. Volvé a Resend → **Verify**. Suele estar listo en 5–10 min; a veces hasta una hora dependiendo del provider.
5. Una vez en estado **Verified**, andá a **API Keys → Create API key**:
   - Name: `court-society-prod`
   - Permission: **Sending access**
   - Domain: `courtsociety.org`
6. **Copiá la key** (`re_...`) y pegala en Vercel → Settings → Environment Variables:
   ```
   RESEND_API_KEY=re_xxxxxxxxxx
   RESEND_FROM_EMAIL=Court Society <nominations@courtsociety.org>
   ```
   (Production + Preview.)

Test rápido: una vez configurado, mandate vos mismo una aplicación de prueba con otro email y aprobala desde `/admin/applications`. El email "Welcome to Court Society" debería llegarte desde `nominations@courtsociety.org`.

---

## 2. Custom SMTP en Supabase Auth (~5 min)

Hace que los **magic links** también salgan desde `nominations@courtsociety.org` (en lugar del dominio default de Supabase) y sube el rate limit de 2/hora a lo que vos pongas.

**Prerequisito:** Resend del paso 1 ya verificado.

1. Supabase → **Authentication → Settings** (sidebar izquierdo). Bajá hasta la sección **SMTP Settings**.
2. Activá el toggle **Enable Custom SMTP**.
3. Llená así:

   | Campo | Valor |
   |---|---|
   | Sender email | `nominations@courtsociety.org` |
   | Sender name | `Court Society` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | Tu Resend API key (`re_...`, la misma de Vercel) |
   | Minimum interval | dejar en `0` |

4. **Save**.
5. En la misma página, buscá **Rate Limits → Email rate limit per hour**. Cambialo de `2` a `30` (o `100`). Save.

---

## 3. Email template del magic link (~3 min)

Por default, Supabase manda un email feísimo "Confirm your email" con un botón azul. Vamos a reemplazarlo con un email branded.

1. Supabase → **Authentication → Email Templates → Magic Link**.
2. **Subject heading**: cambialo a `Your Court Society sign-in link`.
3. **Message (HTML)**: borrá lo que hay y pegá esto:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F5F1E8;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F5F1E8;">Tap to sign in to Court Society. Link expires in 60 minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F1E8;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;background:#FFFFFF;">
          <tr>
            <td style="background:#0E2A1F;padding:40px 36px 36px;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:0.32em;color:#A68B5B;text-transform:uppercase;margin-bottom:24px;">Court &nbsp; Society</div>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:30px;font-weight:400;color:#F5F1E8;line-height:1.15;">Your sign-in link.</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px 28px;">
              <div style="width:32px;height:1px;background:#A68B5B;margin:0 0 22px;"></div>
              <p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.75;color:#4a4840;">Tap below to sign in to Court Society. This link expires in 60 minutes.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 12px;">
                <tr>
                  <td style="background:#0E2A1F;padding:14px 30px;border-bottom:2px solid #A68B5B;">
                    <a href="{{ .ConfirmationURL }}" style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.22em;color:#F5F1E8;text-transform:uppercase;text-decoration:none;display:inline-block;">Sign in</a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#8A8478;line-height:1.6;">Didn&rsquo;t request this? You can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 36px 28px;border-top:1px solid rgba(0,0,0,0.08);">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.22em;color:#A68B5B;text-transform:uppercase;text-align:center;">nominations@courtsociety.org</div>
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;color:#8A8478;text-align:center;margin-top:10px;line-height:1.6;">Court Society &middot; Santiago &middot; S&atilde;o Paulo &middot; Miami<br/>A private network. By nomination.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

4. **Save**.

> Importante: `{{ .ConfirmationURL }}` es el placeholder de Supabase para el magic link real. No lo edites.

5. (Opcional pero recomendado) repetí el mismo ejercicio con los templates **Confirm signup**, **Invite user**, **Reset password**, **Change email** — ajustando el título y el body. Si no querés tocarlos ahora, déjalos; tu flujo de magic link no los usa.

---

## 4. Sentry (~10 min)

Para enterarte cuando un miembro real tiene un error en producción.

1. https://sentry.io → **Sign up** (free tier: 5K errors/mes, suficiente para empezar).
2. Create new organization → **Court Society** (o reusá una si ya tenés).
3. Create new project:
   - Platform: **Next.js**
   - Project name: `court-society-app`
   - Alert frequency: "On every new issue" (para empezar; bajalo después si te abruma).
4. Sentry te muestra un DSN (parece `https://abc123@o12345.ingest.sentry.io/67890`). Copialo.
5. En Vercel → Settings → Environment Variables, agregá (Production + Preview):
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://abc123@o12345.ingest.sentry.io/67890
   SENTRY_DSN=https://abc123@o12345.ingest.sentry.io/67890
   ```
   (Sí, el mismo valor en las dos.)

6. (Opcional, recomendado) para que los stack traces vengan con código real en vez de minificado:
   - Sentry → **Settings → Auth Tokens → Create Auth Token** con scope `project:releases` y `org:read`. Copialo.
   - En Vercel agregá:
     ```
     SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxx
     SENTRY_ORG=court-society
     SENTRY_PROJECT=court-society-app
     ```
   - El build de Vercel va a subir los source maps automáticamente.

7. Redeploy en Vercel.

8. Test: andá a tu app deployada, hacé algo que rompa (ej. abrí la consola del browser y corré `throw new Error("sentry test")`). En ~30 segundos lo ves en Sentry → Issues.

---

## Checklist final

Después de los 4 pasos:

- [ ] DNS de `courtsociety.org` en Resend dice **Verified**
- [ ] `RESEND_API_KEY` en Vercel
- [ ] Custom SMTP activado en Supabase con Resend
- [ ] Rate limit subido a 30+/hora
- [ ] Magic Link template branded
- [ ] Sentry project creado, DSN en Vercel
- [ ] Redeploy con todas las env vars
- [ ] Probaste el flujo end-to-end: nuevo email → magic link branded → aplicación → admin aprueba → welcome email branded

Si un miembro real entra y algo rompe, ahora te enterás en Sentry en lugar de que te avise por WhatsApp.
