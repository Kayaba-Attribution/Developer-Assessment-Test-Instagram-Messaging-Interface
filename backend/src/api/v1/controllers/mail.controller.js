// src/api/v1/controllers/mail.controller.js
class MailController {
  constructor({ mailService, logger }) {
    this.mailService = mailService;
    this.logger = logger;
  }

  async generateEmail(req, res) {
    try {
      const emailData = this.mailService.generateEmail();
      return res.json({
        success: true,
        data: emailData,
      });
    } catch (error) {
      this.logger.error("[MailController] Generate error:", error.message);
      return res.status(500).json({
        success: false,
        error: "Failed to generate email",
      });
    }
  }

  async getVerificationCode(req, res) {
    try {
      const { hash } = req.params;
      if (!hash) {
        return res.status(400).json({
          success: false,
          error: "Hash is required",
        });
      }

      const verificationCode = await this.mailService.getVerificationCode(hash);
      return res.json({
        success: true,
        data: verificationCode,
      });
    } catch (error) {
      this.logger.error("[MailController] Get verification code error:", error.message);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch verification code",
      });
    }
  }

  async checkEmails(req, res) {
    try {
      const { hash } = req.params;
      if (!hash) {
        return res.status(400).json({
          success: false,
          error: "Hash is required",
        });
      }

      const emails = await this.mailService.getEmails(hash);
      return res.json({
        success: true,
        data: emails,
      });
    } catch (error) {
      this.logger.error("[MailController] Check error:", error.message);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch emails",
      });
    }
  }
}

module.exports = MailController;
