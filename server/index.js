import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';

const app = express();
const PORT = process.env.PORT || 3001;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const prices = { basic: 50, standard: 49900, premium: 59900 };

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { tier, email } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: prices[tier] || prices.basic, currency: 'eur',
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
    const { email, name, tier } = req.body;
    const planNames = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };
    
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f0f0f0;"><table style="width:100%;"><tr><td align="center"><table style="width:600px;"><tr><td style="background:linear-gradient(135deg,#8B5CF6,#F59E0B);padding:30px;text-align:center;border-radius:8px 8px 0 0;"><h1 style="color:white;margin:0;">RINO ENTERPRISES</h1></td></tr><tr><td style="background:#f9f9f9;padding:30px;"><h2 style="color:#8B5CF6;">Thank you, ' + name + '!</h2><p>We have received your payment for the <strong>' + (planNames[tier] || 'Basic') + ' Plan</strong>.</p><div style="background:white;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #8B5CF6;"><p style="font-size:18px;font-weight:bold;color:#8B5CF6;margin:0;">We will be in contact within 24 hours</p><p style="color:#666;">Our team will reach out to discuss your social media management needs.</p></div></td></tr></table></td></tr></table></body></html>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Rino Enterprises <onboarding@resend.dev>', to: [email], subject: 'Thank you! We will be in contact within 24 hours.', html })
    });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Rino Enterprises <onboarding@resend.dev>', to: ['rinosocialenterprises@gmail.com'], subject: 'New Purchase: ' + (planNames[tier] || 'Basic'), html: '<h2>New Purchase!</h2><p>' + name + ' - ' + email + '</p>' })
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.listen(PORT, () => console.log('Server on port ' + PORT));
