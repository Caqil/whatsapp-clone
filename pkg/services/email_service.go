// pkg/services/email_service.go
package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"os"
)

type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUsername string
	smtpPassword string
	fromEmail    string
	fromName     string
}

type EmailData struct {
	To         string
	Subject    string
	MagicLink  string
	FirstName  string
	ExpiresIn  string
	AppName    string
	SupportURL string
}

func NewEmailService() *EmailService {
	return &EmailService{
		smtpHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		smtpPort:     getEnv("SMTP_PORT", "587"),
		smtpUsername: getEnv("SMTP_USERNAME", ""),
		smtpPassword: getEnv("SMTP_PASSWORD", ""),
		fromEmail:    getEnv("FROM_EMAIL", "noreply@whatsapp-clone.com"),
		fromName:     getEnv("FROM_NAME", "WhatsApp Clone"),
	}
}

func (e *EmailService) SendMagicLink(to, firstName, magicLink string) error {
	data := EmailData{
		To:         to,
		Subject:    "🔗 Your magic login link",
		MagicLink:  magicLink,
		FirstName:  firstName,
		ExpiresIn:  "15 minutes",
		AppName:    "WhatsApp Clone",
		SupportURL: "https://your-app.com/support",
	}

	htmlBody, err := e.generateHTML(data)
	if err != nil {
		return err
	}

	return e.sendEmail(data.To, data.Subject, htmlBody)
}

func (e *EmailService) generateHTML(data EmailData) (string, error) {
	tmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Subject}}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; margin-bottom: 20px; color: #333; }
        .message { font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 30px; }
        .button { display: inline-block; background: #25d366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
        .button:hover { background: #128c7e; }
        .security { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #ffc107; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .logo { font-size: 28px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">💬</div>
            <h1>{{.AppName}}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">Hi {{.FirstName}}! 👋</div>
            
            <div class="message">
                Click the button below to securely sign in to your account. This link will expire in {{.ExpiresIn}} for your security.
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{.MagicLink}}" class="button">🔐 Sign In Securely</a>
            </div>
            
            <div class="security">
                <strong>🛡️ Security Note:</strong><br>
                This email was sent because someone requested access to your account. If this wasn't you, you can safely ignore this email. The link will expire automatically.
            </div>
            
            <div class="message">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{{.MagicLink}}" style="color: #25d366; word-break: break-all;">{{.MagicLink}}</a>
            </div>
        </div>
        
        <div class="footer">
            <p>Having trouble? <a href="{{.SupportURL}}" style="color: #25d366;">Contact Support</a></p>
            <p>© 2025 {{.AppName}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`

	t, err := template.New("magic-link").Parse(tmpl)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

func (e *EmailService) sendEmail(to, subject, htmlBody string) error {
	// Skip email sending in development if no SMTP config
	if e.smtpUsername == "" || e.smtpPassword == "" {
		log.Printf("📧 EMAIL (DEV MODE): To=%s, Subject=%s", to, subject)
		log.Printf("📧 HTML Body: %s", htmlBody)
		return nil
	}

	auth := smtp.PlainAuth("", e.smtpUsername, e.smtpPassword, e.smtpHost)

	headers := make(map[string]string)
	headers["From"] = fmt.Sprintf("%s <%s>", e.fromName, e.fromEmail)
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + htmlBody

	err := smtp.SendMail(
		e.smtpHost+":"+e.smtpPort,
		auth,
		e.fromEmail,
		[]string{to},
		[]byte(message),
	)

	if err != nil {
		log.Printf("❌ Failed to send email: %v", err)
		return err
	}

	log.Printf("✅ Email sent successfully to %s", to)
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
