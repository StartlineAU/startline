import { render } from "@react-email/render";
import RegistrationConfirmationEmail from "@/emails/registration-confirmation";
import WaitlistConfirmationEmail from "@/emails/waitlist-confirmation";

export const dynamic = "force-static";

const DUMMY_REGO = {
  eventName: "Trail Run Adventure",
  eventDate: "Sat, 15 Nov 2025",
  startTime: "7:30 AM",
  category: "Full Marathon",
  location: "Lane Cove National Park, NSW",
  registrationFee: "$89.00",
  serviceFee: "$5.45",
  total: "$94.45",
  userEmail: "participant@example.com",
};

export async function GET() {
  const [registrationHtml, waitlistHtml] = await Promise.all([
    render(RegistrationConfirmationEmail(DUMMY_REGO)),
    render(WaitlistConfirmationEmail()),
  ]);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Email Previews</title></head>
<body style="background:#0A0A0A;padding:40px;margin:0">
<div style="max-width:600px;margin:0 auto 40px">${registrationHtml}</div>
<hr style="border-color:#2A2A2A;margin:40px auto;max-width:600px">
<div style="max-width:600px;margin:0 auto">${waitlistHtml}</div>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
