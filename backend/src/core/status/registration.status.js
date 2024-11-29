const REGISTRATION_STATUS = {
  INITIALIZED: 'INITIALIZED',
  PROFILE_CREATED: 'PROFILE_CREATED',
  BROWSER_LAUNCHED: 'BROWSER_LAUNCHED',
  FORM_FILLING: 'FORM_FILLING',
  AWAITING_VERIFICATION: 'AWAITING_VERIFICATION',
  VERIFICATION_SUBMITTED: 'VERIFICATION_SUBMITTED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

class RegistrationStatusTracker {
  constructor(redis) {
    this.redis = redis;
    this.STATUS_TTL = 3600; // 1 hour
  }

  async updateStatus(registrationId, status, details = {}) {
    const statusData = {
      status,
      timestamp: Date.now(),
      details,
    };

    await this.redis.setex(
      `registration:${registrationId}:status`,
      this.STATUS_TTL,
      JSON.stringify(statusData)
    );

    return statusData;
  }

  async getStatus(registrationId) {
    const status = await this.redis.get(`registration:${registrationId}:status`);
    return status ? JSON.parse(status) : null;
  }
}

module.exports = {
  RegistrationStatusTracker,
  REGISTRATION_STATUS
}; 