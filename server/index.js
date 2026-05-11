import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 3001;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const prices = { basic: 50, standard: 49900, premium: 59900 };

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: process.env.EMAIL_USER || 'rinosocialenterprises@gmail.com', pass: process.env.EMAIL_PASSWORD }
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { email, name, tier } = req.body;
    const planNames = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };
    await transporter.sendMail({
      from: '"Rino Enterprises" <rinosocialenterprises@gmail.com>',
      to: email,
      subject: 'Thank you for your purchase! We will be in contact within 24 hours.',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background:linear-gradient(135deg,#8B5CF6,#F59E0B);padding:30px;text-align:center;"><h1 style="color:white;margin:0;">RINO ENTERPRISES</h1></div><div style="background:#f9f9f9;padding:30px;"><h2 style="color:#8B5CF6;">Thank you, ${name}!</h2><p>We've received your payment for the <strong>${planNames[tier] || 'Basic'} Plan</strong>.</p><div style="background:white;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #8B5CF6;"><p style="font-size:18px;font-weight:bold;color:#8B5CF6;margin:0;">We will be in contact within 24 hours</p><p style="color:#666;">Our team will reach out to discuss your social media management needs.</p></div><p style="color:#666;font-size:14px;">Questions? Reply to this email or contact us at rinosocialenterprises@gmail.com</p></div></div>`
    });
    await transporter.sendMail({
      from: '"Rino Enterprises" <rinosocialenterprises@gmail.com>',
      to: 'rinosocialenterprises@gmail.com',
      subject: `New Purchase: ${planNames[tier] || 'Basic'} by ${name}`,
      html: `<h2>New Purchase!</h2><p>Customer: ${name}</p><p>Email: ${email}</p><p>Plan: ${planNames[tier] || 'Basic'}</p>`
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { tier, email } = req.body;
    const amount = prices[tier] || prices.basic;
    const paymentIntent = await stripe.paymentIntents.create({
      amount, currency: 'eur', automatic_payment_methods: { enabled: true },
      receipt_email: email, metadata: { tier: tier || 'basic' }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
