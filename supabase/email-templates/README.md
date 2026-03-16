# Supabase Auth Email Templates

Paste these into the Supabase dashboard under **Authentication > Email Templates**.

For each template, set the **Subject** and paste the **HTML body** into the Body field.

---

## 1. Confirm signup

**Subject:**
```
Confirm your email address
```

**Body:**
```html
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Confirm your email address</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]>
<style type="text/css">
body, table, td, p, h1, a { font-family: Calibri, Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#FDF8F0;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;">Confirm your email to get started with Thrive 4 Better</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FDF8F0;">
<tr><td align="center" style="padding:40px 16px;">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;">

<tr>
<td align="center" style="background-color:#2D5A3D;padding:28px 40px;">
<img src="https://www.thrive4better.com/thrive4better-logo.png" alt="Thrive 4 Better" width="180" height="48" style="display:block;border:0;outline:none;max-width:180px;height:auto;" />
</td>
</tr>

<tr>
<td style="background-color:#7A9E7E;height:3px;line-height:3px;font-size:1px;">&nbsp;</td>
</tr>

<tr>
<td style="padding:32px 40px;">
<h1 style="font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.3;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Confirm your email</h1>
<p style="font-size:15px;line-height:1.6;color:#1A1A1A;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Thanks for signing up with Thrive 4 Better. Please confirm your email address by clicking the button below.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td align="center" style="background-color:#2D5A3D;border-radius:6px;">
<a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;background-color:#2D5A3D;border-radius:6px;color:#FFFFFF;font-size:15px;font-weight:600;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-decoration:none;padding:12px 32px;border:1px solid #2D5A3D;">Confirm email address</a>
</td></tr>
</table>
<p style="font-size:15px;line-height:1.6;color:#1A1A1A;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Or enter this code manually:</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td style="background-color:#FDF8F0;border:1px solid #E8E8E8;border-radius:6px;font-size:32px;font-weight:700;letter-spacing:0.2em;color:#2D5A3D;padding:14px 28px;font-family:'Courier New',monospace;text-align:center;">{{ .Token }}</td></tr>
</table>
<p style="font-size:13px;line-height:1.5;color:#666666;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">If you didn't create this account, you can safely ignore this email.</p>
</td>
</tr>

<tr>
<td style="border-top:1px solid #E8E8E8;padding:20px 40px;text-align:center;">
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Thrive 4 Better | Supporting Your Growth</p>
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">20 Zelkova Cct, Fraser Rise VIC 3336</p>
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<a href="https://www.thrive4better.com/privacy" style="color:#7A9E7E;text-decoration:underline;">Privacy Policy</a>
</p>
<p style="font-size:11px;color:#999999;margin:8px 0 0;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">&copy; 2026 Thrive 4 Better. All rights reserved.</p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>
```

---

## 2. Invite user

**Subject:**
```
You've been invited to Thrive 4 Better
```

**Body:**
```html
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>You've been invited to Thrive 4 Better</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]>
<style type="text/css">
body, table, td, p, h1, a { font-family: Calibri, Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#FDF8F0;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;">You've been invited to join Thrive 4 Better</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FDF8F0;">
<tr><td align="center" style="padding:40px 16px;">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;">

<tr>
<td align="center" style="background-color:#2D5A3D;padding:28px 40px;">
<img src="https://www.thrive4better.com/thrive4better-logo.png" alt="Thrive 4 Better" width="180" height="48" style="display:block;border:0;outline:none;max-width:180px;height:auto;" />
</td>
</tr>

<tr>
<td style="background-color:#7A9E7E;height:3px;line-height:3px;font-size:1px;">&nbsp;</td>
</tr>

<tr>
<td style="padding:32px 40px;">
<h1 style="font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.3;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">You've been invited</h1>
<p style="font-size:15px;line-height:1.6;color:#1A1A1A;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">You've been invited to create an account on Thrive 4 Better. Click the button below to accept the invitation and set up your account.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td align="center" style="background-color:#2D5A3D;border-radius:6px;">
<a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;background-color:#2D5A3D;border-radius:6px;color:#FFFFFF;font-size:15px;font-weight:600;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-decoration:none;padding:12px 32px;border:1px solid #2D5A3D;">Accept invitation</a>
</td></tr>
</table>
<p style="font-size:13px;line-height:1.5;color:#666666;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">If you weren't expecting this invitation, you can safely ignore this email.</p>
</td>
</tr>

<tr>
<td style="border-top:1px solid #E8E8E8;padding:20px 40px;text-align:center;">
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Thrive 4 Better | Supporting Your Growth</p>
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">20 Zelkova Cct, Fraser Rise VIC 3336</p>
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<a href="https://www.thrive4better.com/privacy" style="color:#7A9E7E;text-decoration:underline;">Privacy Policy</a>
</p>
<p style="font-size:11px;color:#999999;margin:8px 0 0;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">&copy; 2026 Thrive 4 Better. All rights reserved.</p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>
```

---

## 3. Magic Link

**Subject:**
```
Your sign-in link
```

**Body:**
```html
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Your sign-in link</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]>
<style type="text/css">
body, table, td, p, h1, a { font-family: Calibri, Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#FDF8F0;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;">Your sign-in link for Thrive 4 Better</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FDF8F0;">
<tr><td align="center" style="padding:40px 16px;">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;">

<tr>
<td align="center" style="background-color:#2D5A3D;padding:28px 40px;">
<img src="https://www.thrive4better.com/thrive4better-logo.png" alt="Thrive 4 Better" width="180" height="48" style="display:block;border:0;outline:none;max-width:180px;height:auto;" />
</td>
</tr>

<tr>
<td style="background-color:#7A9E7E;height:3px;line-height:3px;font-size:1px;">&nbsp;</td>
</tr>

<tr>
<td style="padding:32px 40px;">
<h1 style="font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.3;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Sign in to your account</h1>
<p style="font-size:15px;line-height:1.6;color:#1A1A1A;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Click the button below to sign in. No password needed.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td align="center" style="background-color:#2D5A3D;border-radius:6px;">
<a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;background-color:#2D5A3D;border-radius:6px;color:#FFFFFF;font-size:15px;font-weight:600;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-decoration:none;padding:12px 32px;border:1px solid #2D5A3D;">Sign in</a>
</td></tr>
</table>
<p style="font-size:15px;line-height:1.6;color:#1A1A1A;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Or enter this code manually:</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td style="background-color:#FDF8F0;border:1px solid #E8E8E8;border-radius:6px;font-size:32px;font-weight:700;letter-spacing:0.2em;color:#2D5A3D;padding:14px 28px;font-family:'Courier New',monospace;text-align:center;">{{ .Token }}</td></tr>
</table>
<p style="font-size:13px;line-height:1.5;color:#666666;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">This link expires in 10 minutes and can only be used once. If you didn't request this, no action is needed.</p>
</td>
</tr>

<tr>
<td style="border-top:1px solid #E8E8E8;padding:20px 40px;text-align:center;">
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Thrive 4 Better | Supporting Your Growth</p>
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">20 Zelkova Cct, Fraser Rise VIC 3336</p>
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<a href="https://www.thrive4better.com/privacy" style="color:#7A9E7E;text-decoration:underline;">Privacy Policy</a>
</p>
<p style="font-size:11px;color:#999999;margin:8px 0 0;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">&copy; 2026 Thrive 4 Better. All rights reserved.</p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>
```

---

## 4. Change Email Address

**Subject:**
```
Confirm your new email address
```

**Body:**
```html
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Confirm your new email address</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]>
<style type="text/css">
body, table, td, p, h1, a { font-family: Calibri, Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#FDF8F0;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;">Confirm your new email address for Thrive 4 Better</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FDF8F0;">
<tr><td align="center" style="padding:40px 16px;">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;">

<tr>
<td align="center" style="background-color:#2D5A3D;padding:28px 40px;">
<img src="https://www.thrive4better.com/thrive4better-logo.png" alt="Thrive 4 Better" width="180" height="48" style="display:block;border:0;outline:none;max-width:180px;height:auto;" />
</td>
</tr>

<tr>
<td style="background-color:#7A9E7E;height:3px;line-height:3px;font-size:1px;">&nbsp;</td>
</tr>

<tr>
<td style="padding:32px 40px;">
<h1 style="font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.3;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Confirm your new email</h1>
<p style="font-size:15px;line-height:1.6;color:#1A1A1A;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">We received a request to change the email address on your Thrive 4 Better account. Click the button below to confirm this change.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td align="center" style="background-color:#2D5A3D;border-radius:6px;">
<a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;background-color:#2D5A3D;border-radius:6px;color:#FFFFFF;font-size:15px;font-weight:600;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-decoration:none;padding:12px 32px;border:1px solid #2D5A3D;">Confirm email change</a>
</td></tr>
</table>
<p style="font-size:15px;line-height:1.6;color:#1A1A1A;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Or enter this code manually:</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td style="background-color:#FDF8F0;border:1px solid #E8E8E8;border-radius:6px;font-size:32px;font-weight:700;letter-spacing:0.2em;color:#2D5A3D;padding:14px 28px;font-family:'Courier New',monospace;text-align:center;">{{ .Token }}</td></tr>
</table>
<p style="font-size:13px;line-height:1.5;color:#666666;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">If you didn't request this change, please contact us immediately or ignore this email. Your email address will remain unchanged.</p>
</td>
</tr>

<tr>
<td style="border-top:1px solid #E8E8E8;padding:20px 40px;text-align:center;">
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Thrive 4 Better | Supporting Your Growth</p>
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">20 Zelkova Cct, Fraser Rise VIC 3336</p>
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<a href="https://www.thrive4better.com/privacy" style="color:#7A9E7E;text-decoration:underline;">Privacy Policy</a>
</p>
<p style="font-size:11px;color:#999999;margin:8px 0 0;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">&copy; 2026 Thrive 4 Better. All rights reserved.</p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>
```

---

## 5. Reset Password

**Subject:**
```
Reset your password
```

**Body:**
```html
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Reset your password</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]>
<style type="text/css">
body, table, td, p, h1, a { font-family: Calibri, Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#FDF8F0;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;">Reset your Thrive 4 Better password</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FDF8F0;">
<tr><td align="center" style="padding:40px 16px;">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;">

<tr>
<td align="center" style="background-color:#2D5A3D;padding:28px 40px;">
<img src="https://www.thrive4better.com/thrive4better-logo.png" alt="Thrive 4 Better" width="180" height="48" style="display:block;border:0;outline:none;max-width:180px;height:auto;" />
</td>
</tr>

<tr>
<td style="background-color:#7A9E7E;height:3px;line-height:3px;font-size:1px;">&nbsp;</td>
</tr>

<tr>
<td style="padding:32px 40px;">
<h1 style="font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.3;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Reset your password</h1>
<p style="font-size:15px;line-height:1.6;color:#1A1A1A;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">We received a request to reset your password. Click the button below to choose a new one.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td align="center" style="background-color:#8B2252;border-radius:6px;">
<a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;background-color:#8B2252;border-radius:6px;color:#FFFFFF;font-size:15px;font-weight:600;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-decoration:none;padding:12px 32px;border:1px solid #8B2252;">Reset password</a>
</td></tr>
</table>
<p style="font-size:13px;line-height:1.5;color:#666666;margin:0 0 16px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td style="border-top:1px solid #E8E8E8;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 24px;">
<tr><td style="background-color:#FDF8F0;border-left:3px solid #7A9E7E;padding:14px 18px;border-radius:0 4px 4px 0;">
<p style="font-size:13px;color:#666666;margin:0;line-height:1.5;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;"><strong style="color:#1A1A1A;">Security tip:</strong> Thrive 4 Better will never ask for your password by email or phone. If you're unsure about this request, contact us directly.</p>
</td></tr>
</table>
</td>
</tr>

<tr>
<td style="border-top:1px solid #E8E8E8;padding:20px 40px;text-align:center;">
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Thrive 4 Better | Supporting Your Growth</p>
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">20 Zelkova Cct, Fraser Rise VIC 3336</p>
<p style="font-size:12px;color:#666666;line-height:1.5;margin:0 0 4px;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<a href="https://www.thrive4better.com/privacy" style="color:#7A9E7E;text-decoration:underline;">Privacy Policy</a>
</p>
<p style="font-size:11px;color:#999999;margin:8px 0 0;font-family:'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">&copy; 2026 Thrive 4 Better. All rights reserved.</p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>
```
