class RegistrationStatusController {
  constructor(statusTracker) {
    this.statusTracker = statusTracker;
  }

  async getStatus(req, res) {
    const { registrationId } = req.params;
    
    try {
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
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch registration status'
      });
    }
  }
}

module.exports = RegistrationStatusController; 