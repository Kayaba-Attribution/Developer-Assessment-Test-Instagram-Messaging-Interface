// Example using the temp-mail.org API
const axios = require('axios');

async function createTempMail() {
    try {
        // Get a new email address
        const response = await axios.get('https://api.temp-mail.org/request/new/');
        const emailAddress = response.data.email;
        
        // Check for new messages
        const messages = await axios.get(`https://api.temp-mail.org/request/mail/id/${emailAddress}/`);
        
        return {
            email: emailAddress,
            messages: messages.data
        };
    } catch (error) {
        console.error('Error:', error);
    }
}

createTempMail().then(console.log);