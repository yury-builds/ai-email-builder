import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendBody = {
  to: string;
  subject: string;
  html: string;
  preheader?: string;
};

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "AI Email Builder <onboarding@resend.dev>";
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured on the server" }, { status: 500 });
  }

  const body = (await req.json()) as SendBody;
  if (!body.to || !body.subject || !body.html) {
    return NextResponse.json({ error: "Missing to, subject, or html" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
    return NextResponse.json({ error: "Invalid recipient address" }, { status: 400 });
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: body.to,
      subject: body.subject,
      html: body.html,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error.message || "Resend rejected the message" }, { status: 502 });
    }
    return NextResponse.json({ id: result.data?.id ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
