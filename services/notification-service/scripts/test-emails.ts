import { emailService } from '../src/services/email.service';
import {
    generateWelcomeHtml,
    generateWelcomeCredentialsHtml,
    generateOtpEmailHtml,
    generatePasswordChangedHtml,
    generateTwoFactorStatusHtml,
    generateAlertHtml,
    generateEventEndRequestHtml,
    generateEventDeleteRequestHtml,
    generatePasswordResetHtml,
    getSystemSettings
} from '../src/templates/email.templates';

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const targetEmail = "test@example.com"; 

        {
            subject: "Welcome to SustainPro",
        html: generateWelcomeHtml({ recipientName: "John Doe", loginUrl: "https://sustainpro.com/login", organizationName: "Acme Corp" })
    },
    {
        subject: "Your Account Credentials",
        html: generateWelcomeCredentialsHtml({ recipientName: "John Doe", userName: "johndoe", userEmail: "john@example.com", tempPassword: "TestPassword123!", loginUrl: "https://sustainpro.com/login", isTemporaryPassword: true })
    },
    {
        subject: "Your OTP Code",
        html: generateOtpEmailHtml({ recipientName: "John Doe", code: "123456", purpose: "login_2fa", expiryMinutes: 10 })
    },
    {
        subject: "Password Changed Successfully",
        html: generatePasswordChangedHtml({ recipientName: "John Doe", changedAt: new Date(), ipAddress: "192.168.1.1" })
    },
    {
        subject: "2FA Status Changed",
        html: generateTwoFactorStatusHtml({ recipientName: "John Doe", enabled: true, method: "Authenticator App" })
    },
    {
        subject: "System Alert",
        html: generateAlertHtml({ recipientName: "John Doe", alertType: "critical", title: "High Energy Usage Detected", message: "HVAC System #1 has exceeded its maximum expected daily consumption by 20%. Please verify settings or inspect unit.", actionUrl: "https://sustainpro.com/alerts/123", deviceName: "HVAC-1" })
    },
    {
        subject: "Event End Request",
        html: generateEventEndRequestHtml({ recipientName: "Admin", eventName: "Dubai Expo 2026", requestedByName: "Sarah Connor", requestTime: new Date().toISOString(), eventUrl: "https://sustainpro.com/events/456", organizationName: "Acme Corp" })
    },
    {
        subject: "Event Delete Request",
        html: generateEventDeleteRequestHtml({ recipientName: "Admin", eventName: "Dubai Expo 2026", requestedByName: "Sarah Connor", requestTime: new Date().toISOString(), eventUrl: "https://sustainpro.com/events/456", organizationName: "Acme Corp" })
    },
    {
        subject: "Password Reset Request",
        html: generatePasswordResetHtml({ recipientName: "John Doe", resetUrl: "https://sustainpro.com/reset-password?token=abcdef", expiryMinutes: 30 })
    }
];

async function runTest() {
    console.log("Waiting for System Settings to load...");
    await getSystemSettings();
    console.log("Waiting for EmailService to initialize...");
    await wait(2000); // Connect to db / smtp
    
    // Generate templates AFTER system settings are loaded
    const emailsToTest = [
        {
            subject: "Welcome to SustainPro",
            html: generateWelcomeHtml({ recipientName: "John Doe", loginUrl: "https://sustainpro.com/login", organizationName: "Acme Corp" })
        },
        {
            subject: "Your Account Credentials",
            html: generateWelcomeCredentialsHtml({ recipientName: "John Doe", userName: "johndoe", userEmail: "john@example.com", tempPassword: "TestPassword123!", loginUrl: "https://sustainpro.com/login", isTemporaryPassword: true })
        },
        {
            subject: "Your OTP Code",
            html: generateOtpEmailHtml({ recipientName: "John Doe", code: "123456", purpose: "login_2fa", expiryMinutes: 10 })
        },
        {
            subject: "Password Changed Successfully",
            html: generatePasswordChangedHtml({ recipientName: "John Doe", changedAt: new Date(), ipAddress: "192.168.1.1" })
        },
        {
            subject: "2FA Status Changed",
            html: generateTwoFactorStatusHtml({ recipientName: "John Doe", enabled: true, method: "Authenticator App" })
        },
        {
            subject: "System Alert",
            html: generateAlertHtml({ recipientName: "John Doe", alertType: "critical", title: "High Energy Usage Detected", message: "HVAC System #1 has exceeded its maximum expected daily consumption by 20%. Please verify settings or inspect unit.", actionUrl: "https://sustainpro.com/alerts/123", deviceName: "HVAC-1" })
        },
        {
            subject: "Event End Request",
            html: generateEventEndRequestHtml({ recipientName: "Admin", eventName: "Dubai Expo 2026", requestedByName: "Sarah Connor", requestTime: new Date().toISOString(), eventUrl: "https://sustainpro.com/events/456", organizationName: "Acme Corp" })
        },
        {
            subject: "Event Delete Request",
            html: generateEventDeleteRequestHtml({ recipientName: "Admin", eventName: "Dubai Expo 2026", requestedByName: "Sarah Connor", requestTime: new Date().toISOString(), eventUrl: "https://sustainpro.com/events/456", organizationName: "Acme Corp" })
        },
        {
            subject: "Password Reset Request",
            html: generatePasswordResetHtml({ recipientName: "John Doe", resetUrl: "https://sustainpro.com/reset-password?token=abcdef", expiryMinutes: 30 })
        }
    ];

    console.log(`Starting to send email template tests... (${emailsToTest.length} total)`);
    for (let i = 0; i < emailsToTest.length; i++) {
        const template = emailsToTest[i];
        console.log(`[${i+1}/${emailsToTest.length}] Sending template: ${template.subject}`);
        
        try {
            const result = await emailService.send({
                to: targetEmail,
                subject: "[Design Test] " + template.subject,
                html: template.html,
                text: "Please view in HTML format."
            });

            if (result.success) {
                console.log(`✅ Success for ${template.subject}`);
                if (result.previewUrl) {
                    console.log(`   Preview URL: ${result.previewUrl}`);
                }
            } else {
                console.log(`❌ Failed:`, result.error);
            }
        } catch (error) {
            console.error(`💥 Error sending ${template.subject}:`, error);
        }
        
        if (i < emailsToTest.length - 1) {
            console.log("⏳ Waiting 5 seconds before next email...\n");
            await wait(5000);
        }
    }

    console.log("\n🎉 Finished sending all test emails.");
    process.exit(0);
}

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
