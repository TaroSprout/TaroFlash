#!/usr/bin/env node
// Generates supabase/templates/*.html from one shared shell so brand styling
// (colors, dark-mode overrides, card layout) lives in a single place instead
// of being copy-pasted across auth email templates.
import { writeFileSync } from 'node:fs'

const SUPPORT_EMAIL = 'support@taro-flash.com'
const OUT_DIR = new URL('../supabase/templates/', import.meta.url)

function buttonHtml(button) {
  if (!button) return ''

  return `
            <tr>
              <td style="padding: 0 32px 32px 32px" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td class="button-cell" style="border-radius: 12px; background-color: #11b7d4">
                      <a
                        href="${button.href}"
                        style="
                          display: inline-block;
                          padding: 14px 28px;
                          font-size: 15px;
                          font-weight: 600;
                          color: #f3f1ea;
                          text-decoration: none;
                          border-radius: 12px;
                        "
                      >
                        ${button.label}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
}

function buildEmailHtml({ title, heading, message, button, footer }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <style>
      @media (prefers-color-scheme: dark) {
        .bg-page {
          background-color: #1c1c1c !important;
        }
        .bg-card {
          background-color: #292929 !important;
        }
        .text-heading {
          color: #f3f1ea !important;
        }
        .text-muted {
          color: #b2b2b2 !important;
        }
        .divider {
          border-color: #4f4f4f !important;
        }
        .button-cell {
          background-color: #0a7588 !important;
        }
        .text-brand {
          color: #0a7588 !important;
        }
      }
    </style>
  </head>
  <body
    class="bg-page"
    style="
      margin: 0;
      padding: 0;
      background-color: #ede9df;
      font-family:
        -apple-system,
        Segoe UI,
        Roboto,
        Helvetica,
        Arial,
        sans-serif;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      class="bg-page"
      style="background-color: #ede9df; padding: 32px 16px"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="480"
            cellpadding="0"
            cellspacing="0"
            class="bg-card"
            style="
              max-width: 480px;
              width: 100%;
              background-color: #f9f8f5;
              border-radius: 16px;
              overflow: hidden;
            "
          >
            <tr>
              <td style="padding: 32px 32px 24px 32px; text-align: center">
                <div
                  class="text-brand"
                  style="font-size: 30px; font-weight: 700; color: #11b7d4; letter-spacing: -0.01em"
                >
                  TaroFlash
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 8px 32px">
                <h1
                  class="text-heading"
                  style="
                    margin: 0;
                    font-size: 18px;
                    line-height: 28px;
                    color: #744e2a;
                    text-align: center;
                  "
                >
                  ${heading}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 32px 32px 32px">
                <p
                  class="text-muted"
                  style="
                    margin: 0;
                    font-size: 15px;
                    line-height: 24px;
                    color: #b8b1a9;
                    text-align: center;
                  "
                >
                  ${message}
                </p>
              </td>
            </tr>${buttonHtml(button)}
            <tr>
              <td class="divider" style="padding: 0 32px 32px 32px; border-top: 1px solid #e7e0d5">
                <p
                  class="text-muted"
                  style="
                    margin: 24px 0 0 0;
                    font-size: 13px;
                    line-height: 20px;
                    color: #b2b2b2;
                    text-align: center;
                  "
                >
                  ${footer}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}

const STRONG = 'style="color: #744e2a"'
const NOTIFICATION_FOOTER = `If this was you, no action is needed. If not, <a href="mailto:${SUPPORT_EMAIL}" class="text-brand" style="color: #11b7d4">contact support</a> right away.`

const TEMPLATES = {
  'email_change.html': {
    title: 'Confirm email address change',
    heading: 'Confirm your new email',
    message: `Confirm you'd like to change the email on your account from <strong class="text-heading" ${STRONG}>{{ .Email }}</strong> to <strong class="text-heading" ${STRONG}>{{ .NewEmail }}</strong>.`,
    button: { href: '{{ .ConfirmationURL }}', label: 'Confirm email change' },
    footer: "Didn't request this? You can safely ignore this email."
  },
  'password_changed.html': {
    title: 'Your password was changed',
    heading: 'Your password was changed',
    message: 'The password on your account was recently changed.',
    footer: NOTIFICATION_FOOTER
  },
  'email_changed.html': {
    title: 'Your email address was changed',
    heading: 'Your email address was changed',
    message: `Your account email was changed from <strong class="text-heading" ${STRONG}>{{ .OldEmail }}</strong> to <strong class="text-heading" ${STRONG}>{{ .Email }}</strong>.`,
    footer: NOTIFICATION_FOOTER
  },
  'identity_linked.html': {
    title: 'Sign-in method linked',
    heading: 'Sign-in method linked',
    message: `<strong class="text-heading" ${STRONG}>{{ .Provider }}</strong> was linked to your account as a sign-in method.`,
    footer: NOTIFICATION_FOOTER
  },
  'identity_unlinked.html': {
    title: 'Sign-in method removed',
    heading: 'Sign-in method removed',
    message: `<strong class="text-heading" ${STRONG}>{{ .Provider }}</strong> was removed as a sign-in method from your account.`,
    footer: NOTIFICATION_FOOTER
  }
}

for (const [filename, spec] of Object.entries(TEMPLATES)) {
  writeFileSync(new URL(filename, OUT_DIR), buildEmailHtml(spec))
  console.log(`wrote supabase/templates/${filename}`)
}
