// Server-side enqueue of a registered app email, mirroring send-transactional-email
// (suppression check, unsubscribe token, email_send_log, transactional queue).
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { TEMPLATES } from './transactional-email-templates/registry.ts'

const SITE_NAME = "encouragingwords"
const SENDER_DOMAIN = "notify.mn-pa.com"
const FROM_DOMAIN = "notify.mn-pa.com"

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// deno-lint-ignore no-explicit-any
export async function enqueueTemplateEmail(supabase: any, opts: {
  templateName: string
  recipientEmail: string
  idempotencyKey: string
  templateData: Record<string, unknown>
}): Promise<{ ok: boolean; reason?: string }> {
  const template = TEMPLATES[opts.templateName]
  if (!template) return { ok: false, reason: 'template_not_found' }
  const messageId = crypto.randomUUID()
  const to = opts.recipientEmail
  const normalized = to.toLowerCase()

  const { data: suppressed, error: supErr } = await supabase
    .from('suppressed_emails').select('id').eq('email', normalized).maybeSingle()
  if (supErr) return { ok: false, reason: 'suppression_check_failed' }
  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: messageId, template_name: opts.templateName, recipient_email: to, status: 'suppressed',
    })
    return { ok: false, reason: 'email_suppressed' }
  }

  let unsubscribeToken: string
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens').select('token, used_at').eq('email', normalized).maybeSingle()
  if (existing && existing.used_at) {
    await supabase.from('email_send_log').insert({
      message_id: messageId, template_name: opts.templateName, recipient_email: to, status: 'suppressed',
      error_message: 'Unsubscribe token used but email missing from suppressed list',
    })
    return { ok: false, reason: 'email_suppressed' }
  }
  if (existing) {
    unsubscribeToken = existing.token
  } else {
    await supabase.from('email_unsubscribe_tokens').upsert(
      { token: generateToken(), email: normalized },
      { onConflict: 'email', ignoreDuplicates: true },
    )
    const { data: stored } = await supabase
      .from('email_unsubscribe_tokens').select('token').eq('email', normalized).maybeSingle()
    if (!stored) return { ok: false, reason: 'token_failed' }
    unsubscribeToken = stored.token
  }

  const element = React.createElement(template.component, opts.templateData)
  const html = await renderAsync(element)
  const text = await renderAsync(element, { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(opts.templateData) : template.subject

  await supabase.from('email_send_log').insert({
    message_id: messageId, template_name: opts.templateName, recipient_email: to, status: 'pending',
  })
  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: opts.templateName,
      idempotency_key: opts.idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })
  if (enqueueError) {
    await supabase.from('email_send_log').insert({
      message_id: messageId, template_name: opts.templateName, recipient_email: to, status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return { ok: false, reason: 'enqueue_failed' }
  }
  return { ok: true }
}
