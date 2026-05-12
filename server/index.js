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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { tier, email } = req.body;
    const amount = prices[tier] || 0;
    if (amount === 0) return res.json({ clientSecret: 'free' });
    const paymentIntent = await stripe.paymentIntents.create({
      amount, currency: 'eur',
      automatic_payment_methods: { enabled: true },
      receipt_email: email, metadata: { tier: tier || 'basic' }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { email, name, tier, description } = req.body;
    const planNames = { basic: 'Basic (FREE)', standard: 'Standard', premium: 'Premium' };
    const planName = planNames[tier] || 'Basic (FREE)';
    const apiKey = process.env.RESEND_API_KEY;

    const customerHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;"><table style="width:100%;"><tr><td align="center"><table style="width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#8B5CF6,#F59E0B);padding:40px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:32px;">RINO ENTERPRISES</h1></td></tr><tr><td style="padding:40px 30px;"><h2 style="color:#8B5CF6;">Hi ' + name + ',</h2><p style="color:#444;font-size:16px;">Thank you for signing up for our <strong style="color:#8B5CF6;">' + planName + ' Plan</strong>!</p><div style="background:linear-gradient(135deg,rgba(139,92,246,0.08),rgba(245,158,11,0.08));border-left:4px solid #8B5CF6;padding:24px;margin:24px 0;"><p style="font-size:20px;font-weight:bold;color:#8B5CF6;margin:0;">We will be in contact within 24 hours</p><p style="color:#666;">Our team will reach out to discuss your social media management needs.</p></div>' + (description ? '<div style="background:#f0f0f0;padding:16px;margin:24px 0;"><p style="color:#888;font-size:13px;font-weight:bold;margin:0 0 8px;">WHAT YOU TOLD US:</p><p style="color:#444;font-size:14px;margin:0;">' + description + '</p></div>' : '') + '<p style="color:#999;font-size:14px;">Questions? Reply to this email or contact us at <a href="mailto:rinosocialenterprises@gmail.com" style="color:#8B5CF6;">rinosocialenterprises@gmail.com</a></p></td></tr></table></td></tr></table></body></html>';

    const adminHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;"><table style="width:100%;"><tr><td align="center"><table style="width:500px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#8B5CF6,#F59E0B);padding:30px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">NEW PURCHASE!</h1></td></tr><tr><td style="padding:30px;"><p style="color:#0a0a0a;font-size:18px;font-weight:600;">' + name + ' signed up for the ' + planName + ' Plan</p><div style="background:#f9f9f9;padding:20px;border-radius:8px;"><p><strong style="color:#555;">Customer:</strong> ' + name + '</p><p><strong style="color:#555;">Email:</strong> <a href="mailto:' + email + '" style="color:#8B5CF6;">' + email + '</a></p><p><strong style="color:#555;">Plan:</strong> <span style="color:#8B5CF6;font-weight:600;">' + planName + '</span></p>' + (description ? '<p><strong style="color:#555;">Description:</strong></p><div style="background:#fff;padding:12px;border-left:3px solid #8B5CF6;"><p style="color:#0a0a0a;font-size:14px;">' + description + '</p></div>' : '') + '<p><strong style="color:#555;">Date:</strong> ' + new Date().toLocaleString() + '</p></div></td></tr></table></td></tr></table></body></html>';

    await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'Rino Enterprises <onboarding@resend.dev>', to: [email], subject: 'Thank you! We will be in contact within 24 hours.', html: customerHtml }) });

    await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'Rino Enterprises <onboarding@resend.dev>', to: ['rinosocialenterprises@gmail.com'], subject: 'NEW: ' + planName + ' by ' + name, html: adminHtml }) });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log('Server on port ' + PORT));
