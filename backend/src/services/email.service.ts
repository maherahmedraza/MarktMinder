import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

// Email configuration
const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
    from: process.env.SMTP_FROM || 'MarktMinder <noreply@marktminder.de>',
};

// Create transporter
const createTransporter = () => {
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        logger.warn('SMTP credentials not configured. Emails will be logged only.');
        return null;
    }

    return nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: emailConfig.auth,
    });
};

const transporter = createTransporter();

// Email templates
const templates = {
    priceAlert: (data: PriceAlertData) => ({
        subject: `🔔 Price Drop Alert: ${data.productName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Price Alert</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #5B6CFF 0%, #A855F7 100%); color: white; padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 32px; }
        .price-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .old-price { text-decoration: line-through; color: #9ca3af; font-size: 18px; }
        .new-price { font-size: 36px; font-weight: bold; color: #16a34a; }
        .savings { background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 8px; }
        .btn { display: inline-block; background: #5B6CFF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 16px; }
        .btn:hover { background: #4B4FF5; }
        .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
        .product-image { max-width: 200px; border-radius: 8px; margin: 16px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📉 Price Drop Alert!</h1>
        </div>
        <div class="content">
            <h2 style="margin-top: 0;">Great news!</h2>
            <p>A product you're tracking has dropped in price:</p>
            
            <h3 style="color: #374151;">${data.productName}</h3>
            
            ${data.imageUrl ? `<img src="${data.imageUrl}" alt="${data.productName}" class="product-image">` : ''}
            
            <div class="price-box">
                <div class="old-price">Was: €${data.oldPrice.toFixed(2)}</div>
                <div class="new-price">Now: €${data.newPrice.toFixed(2)}</div>
                <div class="savings">You save €${(data.oldPrice - data.newPrice).toFixed(2)} (${((1 - data.newPrice / data.oldPrice) * 100).toFixed(0)}% off)</div>
            </div>
            
            <p style="text-align: center;">
                <a href="${data.productUrl}" class="btn">View on ${data.marketplace}</a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                This alert was triggered because the price dropped below your target of €${data.targetPrice?.toFixed(2) || 'your threshold'}.
            </p>
        </div>
        <div class="footer">
            <p>MarktMinder - Your Smart Price Tracker</p>
            <p><a href="${process.env.FRONTEND_URL}/dashboard/alerts" style="color: #5B6CFF;">Manage your alerts</a></p>
        </div>
    </div>
</body>
</html>
        `,
        text: `
Price Drop Alert!

${data.productName}

Was: €${data.oldPrice.toFixed(2)}
Now: €${data.newPrice.toFixed(2)}
You save: €${(data.oldPrice - data.newPrice).toFixed(2)}

View product: ${data.productUrl}

---
MarktMinder - Your Smart Price Tracker
        `,
    }),

    welcome: (data: WelcomeData) => ({
        subject: `Welcome to MarktMinder, ${data.name}! 🎉`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to MarktMinder</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #5B6CFF 0%, #A855F7 100%); color: white; padding: 48px 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 32px; }
        .feature { display: flex; align-items: flex-start; gap: 16px; margin: 16px 0; }
        .feature-icon { font-size: 24px; }
        .btn { display: inline-block; background: #5B6CFF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to MarktMinder!</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Your smart price tracking journey begins now</p>
        </div>
        <div class="content">
            <h2 style="margin-top: 0;">Hi ${data.name}! 👋</h2>
            <p>Thanks for joining MarktMinder. You're now ready to track prices across Amazon, Etsy, and Otto!</p>
            
            <h3>Here's what you can do:</h3>
            
            <div class="feature">
                <span class="feature-icon">📊</span>
                <div>
                    <strong>Track Products</strong>
                    <p style="margin: 4px 0 0 0; color: #6b7280;">Add any product URL and we'll monitor the price 24/7</p>
                </div>
            </div>
            
            <div class="feature">
                <span class="feature-icon">🔔</span>
                <div>
                    <strong>Set Alerts</strong>
                    <p style="margin: 4px 0 0 0; color: #6b7280;">Get notified instantly when prices drop to your target</p>
                </div>
            </div>
            
            <div class="feature">
                <span class="feature-icon">📈</span>
                <div>
                    <strong>View History</strong>
                    <p style="margin: 4px 0 0 0; color: #6b7280;">See price trends and find the best time to buy</p>
                </div>
            </div>
            
            <p style="text-align: center; margin-top: 32px;">
                <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Start Tracking Now →</a>
            </p>
        </div>
        <div class="footer">
            <p>Questions? Reply to this email or visit our <a href="${process.env.FRONTEND_URL}/contact" style="color: #5B6CFF;">Help Center</a></p>
        </div>
    </div>
</body>
</html>
        `,
        text: `
Welcome to MarktMinder, ${data.name}!

Thanks for joining MarktMinder. You're now ready to track prices across Amazon, Etsy, and Otto!

Here's what you can do:

📊 Track Products - Add any product URL and we'll monitor the price 24/7
🔔 Set Alerts - Get notified instantly when prices drop to your target
📈 View History - See price trends and find the best time to buy

Start tracking now: ${process.env.FRONTEND_URL}/dashboard

---
MarktMinder - Your Smart Price Tracker
        `,
    }),

    passwordReset: (data: PasswordResetData) => ({
        subject: 'Reset Your MarktMinder Password',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #374151; color: white; padding: 32px; text-align: center; }
        .content { padding: 32px; }
        .btn { display: inline-block; background: #5B6CFF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0; }
        .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
            <p>Hi ${data.name},</p>
            <p>We received a request to reset your MarktMinder password. Click the button below to create a new password:</p>
            
            <p style="text-align: center; margin: 32px 0;">
                <a href="${data.resetUrl}" class="btn">Reset Password</a>
            </p>
            
            <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                    <li>This link expires in 1 hour</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
                If the button doesn't work, copy and paste this URL into your browser:<br>
                <a href="${data.resetUrl}" style="color: #5B6CFF; word-break: break-all;">${data.resetUrl}</a>
            </p>
        </div>
        <div class="footer">
            <p>MarktMinder - Your Smart Price Tracker</p>
        </div>
    </div>
</body>
</html>
        `,
        text: `
Password Reset Request

Hi ${data.name},

We received a request to reset your MarktMinder password. 

Click here to reset your password: ${data.resetUrl}

This link expires in 1 hour.

If you didn't request this, please ignore this email.

---
MarktMinder - Your Smart Price Tracker
        `,
    }),
};

// Type definitions
interface PriceAlertData {
    to: string;
    productName: string;
    oldPrice: number;
    newPrice: number;
    productUrl: string;
    imageUrl?: string;
    marketplace: string;
    targetPrice?: number;
}

interface WelcomeData {
    to: string;
    name: string;
}

interface PasswordResetData {
    to: string;
    name: string;
    resetUrl: string;
}

// Email service class
class EmailService {
    private retryAttempts = 3;
    private retryDelay = 1000;

    private async sendWithRetry(mailOptions: nodemailer.SendMailOptions): Promise<boolean> {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                if (!transporter) {
                    // Log email in development when no SMTP configured
                    logger.info('📧 Email (not sent - no SMTP):', {
                        to: mailOptions.to,
                        subject: mailOptions.subject,
                    });
                    return true;
                }

                const info = await transporter.sendMail(mailOptions);
                logger.info('📧 Email sent successfully:', {
                    messageId: info.messageId,
                    to: mailOptions.to,
                    subject: mailOptions.subject,
                });
                return true;
            } catch (error) {
                logger.error(`Email send attempt ${attempt} failed:`, error);
                if (attempt < this.retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                }
            }
        }
        return false;
    }

    async sendPriceAlert(data: PriceAlertData): Promise<boolean> {
        const template = templates.priceAlert(data);
        return this.sendWithRetry({
            from: emailConfig.from,
            to: data.to,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });
    }

    async sendWelcome(data: WelcomeData): Promise<boolean> {
        const template = templates.welcome(data);
        return this.sendWithRetry({
            from: emailConfig.from,
            to: data.to,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });
    }

    async sendPasswordReset(data: PasswordResetData): Promise<boolean> {
        const template = templates.passwordReset(data);
        return this.sendWithRetry({
            from: emailConfig.from,
            to: data.to,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });
    }

    // Test email configuration
    async verifyConnection(): Promise<boolean> {
        if (!transporter) {
            logger.warn('No SMTP transporter configured');
            return false;
        }

        try {
            await transporter.verify();
            logger.info('✅ SMTP connection verified');
            return true;
        } catch (error) {
            logger.error('❌ SMTP connection failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
