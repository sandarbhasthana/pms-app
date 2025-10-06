// File: src/lib/config/email-config-checker.ts

export interface EmailConfigStatus {
  isConfigured: boolean;
  provider: 'sendgrid' | 'resend' | 'none';
  missingVars: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Check email service configuration and provide recommendations
 */
export function checkEmailConfiguration(): EmailConfigStatus {
  const missingVars: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check for SendGrid configuration
  const hasSendGrid = !!process.env.SENDGRID_API_KEY;
  const hasResend = !!process.env.RESEND_API_KEY;
  
  let provider: 'sendgrid' | 'resend' | 'none' = 'none';
  let isConfigured = false;

  if (hasSendGrid) {
    provider = 'sendgrid';
    isConfigured = true;

    // Validate SendGrid API key format
    if (!process.env.SENDGRID_API_KEY?.startsWith('SG.')) {
      warnings.push('SendGrid API key should start with "SG."');
    }

    // Check for webhook signing key
    if (!process.env.SENDGRID_WEBHOOK_SIGNING_KEY) {
      recommendations.push('Consider adding SENDGRID_WEBHOOK_SIGNING_KEY for webhook security');
    }

  } else if (hasResend) {
    provider = 'resend';
    isConfigured = true;
    warnings.push('Using Resend - consider upgrading to SendGrid for production');

    // Validate Resend API key format
    if (!process.env.RESEND_API_KEY?.startsWith('re_')) {
      warnings.push('Resend API key should start with "re_"');
    }

  } else {
    missingVars.push('SENDGRID_API_KEY or RESEND_API_KEY');
  }

  // Check common email configuration
  if (!process.env.EMAIL_FROM) {
    missingVars.push('EMAIL_FROM');
  } else {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.EMAIL_FROM)) {
      warnings.push('EMAIL_FROM should be a valid email address');
    }
  }

  if (!process.env.EMAIL_REPLY_TO) {
    missingVars.push('EMAIL_REPLY_TO');
  } else {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.EMAIL_REPLY_TO)) {
      warnings.push('EMAIL_REPLY_TO should be a valid email address');
    }
  }

  // Environment-specific recommendations
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isProduction) {
    if (provider === 'resend') {
      recommendations.push('Consider upgrading to SendGrid for production use');
    }
    
    if (provider === 'sendgrid') {
      recommendations.push('Ensure domain authentication is completed in SendGrid');
      recommendations.push('Configure webhooks for delivery tracking');
      recommendations.push('Set up suppression list management');
    }

    if (process.env.EMAIL_FROM?.includes('sendgrid.net') || 
        process.env.EMAIL_FROM?.includes('resend.dev')) {
      warnings.push('Using default domain - authenticate your own domain for better deliverability');
    }
  }

  if (isDevelopment) {
    if (provider === 'none') {
      recommendations.push('Set up email service for testing notifications');
    }
  }

  // Additional recommendations
  if (isConfigured) {
    recommendations.push('Test email configuration using /api/notifications/test?action=email-config');
    recommendations.push('Monitor email delivery rates and bounce statistics');
  }

  return {
    isConfigured,
    provider,
    missingVars,
    warnings,
    recommendations
  };
}

/**
 * Get email configuration summary for logging
 */
export function getEmailConfigSummary(): string {
  const config = checkEmailConfiguration();
  
  let summary = `📧 Email Configuration Status: ${config.isConfigured ? '✅ Configured' : '❌ Not Configured'}\n`;
  summary += `   Provider: ${config.provider.toUpperCase()}\n`;
  
  if (config.missingVars.length > 0) {
    summary += `   Missing: ${config.missingVars.join(', ')}\n`;
  }
  
  if (config.warnings.length > 0) {
    summary += `   Warnings: ${config.warnings.length} issues found\n`;
  }
  
  if (config.recommendations.length > 0) {
    summary += `   Recommendations: ${config.recommendations.length} suggestions\n`;
  }
  
  return summary;
}

/**
 * Log email configuration status on startup
 */
export function logEmailConfigStatus(): void {
  const summary = getEmailConfigSummary();
  console.log(summary);
  
  const config = checkEmailConfiguration();
  
  // Log warnings
  config.warnings.forEach(warning => {
    console.warn(`⚠️  Email Config Warning: ${warning}`);
  });
  
  // Log missing variables as errors
  config.missingVars.forEach(missingVar => {
    console.error(`❌ Email Config Error: Missing ${missingVar}`);
  });
  
  // Log recommendations in development
  if (process.env.NODE_ENV === 'development') {
    config.recommendations.forEach(recommendation => {
      console.info(`💡 Email Config Tip: ${recommendation}`);
    });
  }
}
