export const SendResetPasswordMailTemplate = ({ resetLink }: { resetLink: string }) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    .button {
      background-color: #000000;
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 5px;
      display: inline-block;
      font-weight: bold;
    }
    .container {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .link-text {
      word-break: break-all;
      color: #007bff;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Password Reset Request</h2>
    <p>You've requested a password reset.</p>
    <p>If you did not request this, please ignore this email.</p>
    <p>Otherwise, you can reset your password by clicking on the link below:</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" class="button">Reset Password</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    
    <p style="font-size: 12px; color: #666;">
      If the button does not work, copy and paste the link below into your browser:
    </p>
    <p>
      <a href="${resetLink}" class="link-text">${resetLink}</a>
    </p>
  </div>
</body>
</html>
`;