/**
 * Notification Service — RoadSense AI
 * Email notifications via nodemailer with branded HTML templates.
 *
 * SECURITY: SMTP credentials from .env only.
 * Notification failures are logged but never break API responses.
 */

const nodemailer = require('nodemailer');

// Create transporter — only if SMTP is configured
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
}

// ── Email Templates ──────────────────────────────────────────

const templates = {
  reportSubmitted: (data) => ({
    subject: `RoadSense AI — Report #${String(data._id || data.id || '').substring(0, 8)} Received`,
    html: `
      <div style="font-family:'Inter',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto">
        <div style="background:#007AFF;padding:20px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">RoadSense AI</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Vadodara Smart City</p>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e5e5">
          <h2 style="font-size:16px;color:#1D1D1F">Your report has been received</h2>
          <p style="color:#6E6E73;font-size:14px">
            Thank you for reporting a road issue. Our team will review it shortly.</p>
          <div style="background:#F5F5F7;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0 0 6px;font-size:12px;color:#6E6E73;text-transform:uppercase;letter-spacing:0.5px">Report ID</p>
            <p style="margin:0;font-size:18px;font-weight:600;color:#1D1D1F">#${String(data._id || data.id || '').substring(0, 8)}</p>
          </div>
          <p style="color:#6E6E73;font-size:13px">
            Submitted: ${new Date().toLocaleDateString('en-IN')}</p>
          <p style="color:#6E6E73;font-size:12px;margin-top:16px">
            You will receive an update when the status changes.<br>
            Vadodara Municipal Corporation — RoadSense AI Team</p>
        </div>
      </div>
    `
  }),

  statusChanged: (data, newStatus) => ({
    subject: `RoadSense AI — Report #${String(data._id || data.id || '').substring(0, 8)} is now ${newStatus}`,
    html: `
      <div style="font-family:'Inter',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto">
        <div style="background:#007AFF;padding:20px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">RoadSense AI</h1>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e5e5">
          <h2 style="font-size:16px;color:#1D1D1F">Status Update</h2>
          <p style="color:#6E6E73;font-size:14px">
            Your report #${String(data._id || data.id || '').substring(0, 8)} status has been updated.</p>
          <div style="background:#F5F5F7;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0 0 6px;font-size:12px;color:#6E6E73;text-transform:uppercase;letter-spacing:0.5px">New Status</p>
            <p style="margin:0;font-size:18px;font-weight:600;color:#30D158">
              ${String(newStatus).replace(/_/g, ' ').toUpperCase()}</p>
          </div>
          <p style="color:#6E6E73;font-size:13px">
            Updated: ${new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </div>
    `
  }),

  repairComplete: (data) => ({
    subject: `RoadSense AI — Road repaired! Report #${String(data._id || data.id || '').substring(0, 8)}`,
    html: `
      <div style="font-family:'Inter',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto">
        <div style="background:#30D158;padding:20px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">✓ Repair Complete</h1>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e5e5">
          <h2 style="font-size:16px;color:#1D1D1F">Road repaired — thank you!</h2>
          <p style="color:#6E6E73;font-size:14px">
            The road issue you reported has been repaired.
            Your report helped make Vadodara safer.</p>
          <p style="color:#6E6E73;font-size:13px">
            Report #${String(data._id || data.id || '').substring(0, 8)}</p>
        </div>
      </div>
    `
  })
};

// ── Send Email ────────────────────────────────────────────────

/**
 * Send an email notification using a named template.
 * @param {string} to — recipient email address
 * @param {string} templateName — 'reportSubmitted' | 'statusChanged' | 'repairComplete'
 * @param {Object} data — report/context data
 * @param {string} [extra] — extra param (e.g., newStatus for statusChanged)
 */
async function sendEmail(to, templateName, data, extra) {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[Notifications] SMTP not configured — skipping email to ${to} (${templateName})`);
    return;
  }

  if (!to || !templateName || !templates[templateName]) {
    console.log(`[Notifications] Invalid params — to: ${to}, template: ${templateName}`);
    return;
  }

  try {
    const template = templates[templateName](data, extra);
    await transport.sendMail({
      from: `"RoadSense AI" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: template.subject,
      html: template.html
    });
    console.log(`[Notifications] ✅ Email sent: ${templateName} → ${to}`);
  } catch (err) {
    // Notification failure should NEVER break the API response
    console.error(`[Notifications] ❌ Email failed (${templateName} → ${to}):`, err.message);
  }
}

module.exports = { sendEmail };
