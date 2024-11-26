// src/config/constants.js
const QUERIES = {
  LOGIN_FORM: `{
      login_form {
        username_input
        password_input
        login_button
        signup_button
      }
    }`,
  ERROR_MESSAGE: `{
      error_message
    }`,
  CHALLENGE_PAGE: `{
      verify_identity_button
      send_sms_button
      security_code_input
      submit_button
    }`,
  SUSPICIOUS_LOGIN: `{
      confirmation_code_input
      submit_button
    }`,
  MESSAGE_BOX: `{
      message_input
      send_button
    }`,
  NEW_MESSAGE: `{
      first_message_input
      first_chat_button
    }`,
  
};

const DIRECTORIES = ["debug_screenshots", "sessions", "logs"];

module.exports = {
  QUERIES,
  DIRECTORIES,
};
