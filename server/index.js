require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist
app.use(express.static(path.join(__dirname, '../dist')));

// Price mapping in cents (EUR)
const prices = {
  basic: 50,       // €0.50
  standard: 49900, // €499
  premium: 59900,  // €599
};

// Nodemailer transporter (Gmail SMTP)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'rinosocialenterprises@gmail.com',
    pass: process.env.EMAIL_PASSWORD, // App Password from Gmail
  },
});

// Send confirmation email
app.post('/api/send-email', async (req, res) => {
  try {
    const { email, name, tier } = req.body;

    const planNames = {
      basic: 'Basic',
      standard: 'Standard',
      premium: 'Premium',
    };

    const mailOptions = {
      from: '"Rino Enterprises" <rinosocialenterprises@gmail.com>',
      to: email,
      subject: 'Thank you for your purchase! We will be in contact within 24 hours.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: linear-gradient(135deg, #8B5CF6, #F59E0B); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">RINO ENTERPRISES</h1>
            <p style="color: white; margin: 10px 0 0; font-size: 14px;">Social Media Management</p>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #8B5CF6; margin-top: 0;">Thank you, ${name}!</h2>
            <p style="font-size: 16px; line-height: 1.6;">
              We've received your payment for the <strong>${planNames[tier] || 'Basic'} Plan</strong>.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B5CF6;">
              <p style="font-size: 18px; font-weight: bold; color: #8B5CF6; margin: 0;">
                We will be in contact within 24 hours
              </p>
              <p style="margin: 10px 0 0; color: #666;">
                Our team will reach out to discuss your social media management needs, review your brand, platforms, and goals before starting work.
              </p>
            </div>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              In the meantime, if you have any questions, feel free to reply to this email or contact us at <a href="mailto:rinosocialenterprises@gmail.com" style="color: #8B5CF6;">rinosocialenterprises@gmail.com</a>.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              Rino Enterprises | London, England<br/>
              <a href="https://www.instagram.com/rinoenterprises" style="color: #8B5CF6;">Instagram</a> | 
              <a href="https://www.facebook.com/share/18fzqUfvJY/" style="color: #8B5CF6;">Facebook</a>
            </p>
          </div>
        </div>
      `,
    };

    // Also send a notification to yourself
    const notificationMail = {
      from: '"Rino Enterprises Website" <rinosocialenterprises@gmail.com>',
      to: 'rinosocialenterprises@gmail.com',
      subject: `New Purchase: ${planNames[tier] || 'Basic'} Plan by ${name}`,
      html: `
        <h2>New Purchase Alert!</h2>
        <p><strong>Customer:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Plan:</strong> ${planNames[tier] || 'Basic'}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    await transporter.sendMail(notificationMail);

    res.json({ success: true });
  } catch (error) {
    console.error('Email error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create Payment Intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { tier, email } = req.body;
    const amount = prices[tier] || prices.basic;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      metadata: {
        tier: tier || 'basic',
        product: `Rino Enterprises - ${tier || 'basic'} Plan`,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Stripe error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
