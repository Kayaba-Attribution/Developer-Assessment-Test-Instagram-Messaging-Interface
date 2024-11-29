class RegistrationStatusController {
  constructor(statusTracker, logger) {
    this.statusTracker = statusTracker;
    this.logger = logger;
  }

  async getStatus(req, res) {
    try {
      const { registrationId } = req.params;
      
      if (!registrationId) {
        return res.status(400).json({
          success: false,
          error: 'Registration ID is required'
        });
      }

      const status = await this.statusTracker.getStatus(registrationId);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'Registration not found'
        });
      }

      return res.json({
        success: true,
        data: status
      });
    } catch (error) {
      this.logger.error('Failed to fetch registration status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch registration status'
      });
    }
  }
}

module.exports = RegistrationStatusController; 