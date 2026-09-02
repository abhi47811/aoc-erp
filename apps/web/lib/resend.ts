// Direct Resend API calls, bypassing Supabase Auth's built-in mailer
// entirely (it's rate-limited on the default tier regardless of anything
// configurable from application code). Sender domain is whatever's
// verified on the configured RESEND_API_KEY's account.

const FROM = 'AOC ERP <invites@houspire.ai>'

export async function sendInviteEmail(opts: {
  to: string
  tenantName: string
  inviterName: string
  role: string
  acceptUrl: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [opts.to],
      subject: `You've been invited to ${opts.tenantName} on AOC ERP`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0f172a; margin-bottom: 4px;">You're invited to ${escapeHtml(opts.tenantName)}</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            ${escapeHtml(opts.inviterName)} invited you to join <strong>${escapeHtml(opts.tenantName)}</strong>
            on AOC ERP as <strong>${escapeHtml(opts.role)}</strong>.
          </p>
          <a href="${opts.acceptUrl}"
             style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
            Accept Invitation
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            This link expires in 7 days. If you weren't expecting this, you can ignore this email.
          </p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error (${res.status}): ${body}`)
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
