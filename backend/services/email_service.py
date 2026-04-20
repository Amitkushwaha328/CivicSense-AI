"""
CivicSense AI — Email Notification Service (SendGrid)
Sends complaint confirmation emails to citizens when their complaint is filed.

Requires environment variable: SENDGRID_API_KEY
"""

import os
import logging

logger = logging.getLogger(__name__)

SENDGRID_API_KEY   = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL         = os.getenv("EMAIL_FROM", "noreply@civicsense.ai")
FROM_NAME          = "CivicSense AI"


def send_complaint_email(
    to_email:    str,
    citizen_name: str,
    damage_type:  str,
    severity:     str,
    address:      str,
    pdf_url:      str,
    hazard_level: int = 0,
) -> bool:
    """
    Send a complaint confirmation email with PDF link.
    Returns True on success, False on failure (never raises).
    """
    if not SENDGRID_API_KEY:
        logger.warning("[Email] SENDGRID_API_KEY not set — skipping email send")
        return False

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, To, From

        severity_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(severity, "⚪")
        category_emoji = {
            "Road Damage":           "🛣️",
            "Garbage":               "🗑️",
            "Water Leak":            "💧",
            "Broken Infrastructure": "⚡",
        }.get(damage_type, "📋")

        html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Inter', Arial, sans-serif; background: #0a0a0a; color: #f1f5f9; margin: 0; padding: 0; }}
    .wrapper {{ max-width: 560px; margin: 0 auto; padding: 32px 16px; }}
    .card {{ background: #111827; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; }}
    .logo {{ display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }}
    .badge {{ background: linear-gradient(135deg, #10b981, #059669); color: #000; font-weight: 900;
              font-size: 14px; width: 40px; height: 40px; border-radius: 10px;
              display: flex; align-items: center; justify-content: center; }}
    h1 {{ color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 8px; }}
    p  {{ color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }}
    .detail-row {{ display: flex; justify-content: space-between; padding: 10px 0;
                   border-bottom: 1px solid #1e293b; font-size: 13px; }}
    .detail-label {{ color: #64748b; }}
    .detail-value {{ color: #f1f5f9; font-weight: 600; }}
    .btn {{ display: inline-block; background: linear-gradient(135deg, #10b981, #059669);
            color: #000; font-weight: 700; padding: 14px 28px; border-radius: 12px;
            text-decoration: none; font-size: 14px; margin-top: 24px; }}
    .severity-high   {{ color: #ef4444; }}
    .severity-medium {{ color: #f59e0b; }}
    .severity-low    {{ color: #22c55e; }}
    .footer {{ margin-top: 24px; text-align: center; color: #374151; font-size: 12px; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">
        <div class="badge">CS</div>
        <div>
          <div style="color:#fff;font-weight:800;font-size:16px">CivicSense AI</div>
          <div style="color:#6b7280;font-size:12px">Smart City Platform</div>
        </div>
      </div>

      <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">
        Complaint Confirmation
      </p>
      <h1>Your complaint has been filed {category_emoji}</h1>
      <p>
        Hi {citizen_name}, your civic issue report has been officially logged and
        a formal complaint PDF has been generated and sent to your municipality.
      </p>

      <div style="margin: 24px 0">
        <div class="detail-row">
          <span class="detail-label">Issue Type</span>
          <span class="detail-value">{category_emoji} {damage_type}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Severity</span>
          <span class="detail-value severity-{severity}">{severity_emoji} {severity.title()}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Location</span>
          <span class="detail-value">{address or "GPS coordinates captured"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">AI Hazard Score</span>
          <span class="detail-value">{hazard_level}/10</span>
        </div>
        <div class="detail-row" style="border-bottom:none">
          <span class="detail-label">Status</span>
          <span class="detail-value" style="color:#f59e0b">⏳ Pending Municipal Action</span>
        </div>
      </div>

      <p style="color:#64748b;font-size:13px">
        You'll earn <strong style="color:#10b981">+10 Impact Points</strong> once the
        municipality marks your issue as resolved. Track your report in the app.
      </p>

      <a class="btn" href="{pdf_url}">📄 Download Complaint PDF</a>
    </div>
    <div class="footer">
      © 2025 CivicSense AI · Built with Gemini Vision + FastAPI + React<br>
      <span style="color:#1f2937">You received this because you filed a civic issue report.</span>
    </div>
  </div>
</body>
</html>
"""

        message = Mail(
            from_email    = (FROM_EMAIL, FROM_NAME),
            to_emails     = to_email,
            subject       = f"✅ Complaint Filed — {damage_type} | CivicSense AI",
            html_content  = html_body,
        )

        sg  = SendGridAPIClient(SENDGRID_API_KEY)
        res = sg.send(message)
        logger.info(f"[Email] Sent to {to_email} — status {res.status_code}")
        return res.status_code in (200, 202)

    except Exception as e:
        logger.error(f"[Email] Failed to send to {to_email}: {e}")
        return False


def send_resolution_email(
    to_email:      str,
    citizen_name:  str,
    damage_type:   str,
    address:       str,
    resolution_note: str,
    points_earned:   int = 10,
) -> bool:
    """
    Notify the citizen that their issue has been resolved and points awarded.
    """
    if not SENDGRID_API_KEY:
        logger.warning("[Email] SENDGRID_API_KEY not set — skipping resolution email")
        return False

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: Arial, sans-serif; background: #0a0a0a; color: #f1f5f9; margin: 0; padding: 32px 16px; }}
    .card {{ max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1e293b;
             border-radius: 16px; padding: 32px; }}
    .badge {{ background: linear-gradient(135deg,#10b981,#059669); color:#000; font-weight:900;
              width:40px; height:40px; border-radius:10px; display:inline-flex;
              align-items:center; justify-content:center; font-size:14px; }}
  </style>
</head>
<body>
  <div class="card">
    <div style="margin-bottom:20px">
      <span class="badge">CS</span>
      <span style="margin-left:10px;color:#fff;font-weight:800">CivicSense AI</span>
    </div>
    <div style="font-size:40px;margin-bottom:12px">🎉</div>
    <h2 style="color:#10b981;margin:0 0 8px">Issue Resolved!</h2>
    <p style="color:#94a3b8">Hi {citizen_name}, great news — your reported issue has been resolved by the municipality!</p>
    <div style="background:#0f172a;border-radius:12px;padding:16px;margin:20px 0">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase">Resolved Issue</p>
      <p style="margin:0;color:#fff;font-weight:600">{damage_type} · {address}</p>
      {f'<p style="margin:8px 0 0;color:#94a3b8;font-size:13px">📝 {resolution_note}</p>' if resolution_note else ''}
    </div>
    <div style="background:#052e16;border:1px solid #166534;border-radius:12px;padding:16px;text-align:center">
      <p style="margin:0 0 4px;color:#6b7280;font-size:12px">Impact Points Earned</p>
      <p style="margin:0;color:#10b981;font-size:28px;font-weight:900">+{points_earned} pts</p>
    </div>
    <p style="color:#4b5563;font-size:12px;margin-top:20px;text-align:center">
      © 2025 CivicSense AI
    </p>
  </div>
</body>
</html>
"""

        message = Mail(
            from_email   = (FROM_EMAIL, FROM_NAME),
            to_emails    = to_email,
            subject      = f"🎉 Issue Resolved! +{points_earned} Impact Points Earned | CivicSense AI",
            html_content = html_body,
        )
        sg  = SendGridAPIClient(SENDGRID_API_KEY)
        res = sg.send(message)
        return res.status_code in (200, 202)

    except Exception as e:
        logger.error(f"[Email] Resolution email failed: {e}")
        return False
