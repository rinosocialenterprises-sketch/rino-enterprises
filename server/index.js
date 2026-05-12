import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';

const app = express();
const PORT = process.env.PORT || 3001;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const prices = { basic: 0, standard: 49900, premium: 59900 };

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { tier, email } = req.body;
    const amount = prices[tier] || 0;
    if (amount === 0) return res.json({ clientSecret: 'free' });
    const paymentIntent = await stripe.paymentIntents.create({
      amount, currency: 'eur',
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      metadata: { tier: tier || 'basic' }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-email', async (req, res) => {
  console.log('Email request:', req.body);
  try {
    const { email, name, tier, description } = req.body;
    const planNames = { basic: 'BASIC', standard: 'STANDARD', premium: 'PREMIUM' };
    const planName = planNames[tier] || 'BASIC';
    const resendKey = process.env.RESEND_API_KEY;
    const results = { customer: null, admin: null };

    try {
      const custRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: 'Thank you! We will be in contact within 24 hours.',
          _template: 'box',
          Thank_you: name,
          Message: `We have received your purchase for the ${planName} Plan. We will be in contact within 24 hours to discuss your social media management needs. Our team will review your brand, platforms, and goals before starting work.`,
          What_you_told_us: description || 'No description provided',
          Next_steps: 'Reply to this email with any additional details about your project, or wait for our team to reach out within 24 hours.',
          _replyto: 'rinosocialenterprises@gmail.com'
        })
      });
      const custResult = await custRes.json();
      results.customer = { ok: custRes.ok, status: custRes.status, data: custResult };
      console.log('Customer email result:', custRes.status, custResult);
    } catch (err) {
      console.error('Customer email failed:', err.message);
      results.customer = { error: err.message };
    }

    try {
      const adminHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
<table style="width:100%;"><tr><td align="center">
<table style="width:500px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#8B5CF6,#F59E0B);padding:30px;text-align:center;">
  <h1 style="color:#fff;margin:0;font-size:24px;">NEW PURCHASE!</h1>
</td></tr>
<tr><td style="padding:30px;">
  <p style="color:#0a0a0a;font-size:18px;margin:0 0 20px;font-weight:600;">${name} just bought the ${planName} Plan</p>
  <div style="background:#f9f9f9;padding:20px;border-radius:8px;">
    <p style="margin:0 0 8px;"><strong style="color:#555;">Customer:</strong> <span style="color:#0a0a0a;">${name}</span></p>
    <p style="margin:0 0 8px;"><strong style="color:#555;">Email:</strong> <a href="mailto:${email}" style="color:#8B5CF6;text-decoration:none;">${email}</a></p>
    <p style="margin:0 0 8px;"><strong style="color:#555;">Plan:</strong> <span style="color:#8B5CF6;font-weight:600;">${planName}</span></p>
    ${description ? `<p style="margin:0 0 8px;"><strong style="color:#555;">Description:</strong></p><div style="background:#ffffff;padding:12px;border-radius:4px;border-left:3px solid #8B5CF6;"><p style="color:#0a0a0a;margin:0;font-size:14px;line-height:1.5;">${description}</p></div>` : ''}
  </div>
</td></tr></table></td></tr></table></body></html>`;

      const adminRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Rino Enterprises <onboarding@resend.dev>',
          to: ['rinosocialenterprises@gmail.com'],
          subject: `New Purchase: ${planName} by ${name}`,
          html: adminHtml,
          reply_to: email
        })
      });
      const adminResult = await adminRes.json();
      results.admin = { ok: adminRes.ok, status: adminRes.status, data: adminResult };
      console.log('Admin email result:', adminRes.status, adminResult);
    } catch (err) {
      console.error('Admin email failed:', err.message);
      results.admin = { error: err.message };
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Email handler error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
