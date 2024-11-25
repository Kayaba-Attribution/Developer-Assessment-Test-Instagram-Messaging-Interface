# Temporary Email Service Documentation

## Core Functionality
The TempMailService provides disposable email addresses for testing and verification purposes. It generates random email addresses using combinations of names and domains, then allows retrieving messages and extracting verification codes.

### Key Components

1. **Email Generation**
```javascript
// Creates a random email address with optional custom prefix
const result = tempMailService.generateEmail("customPrefix"); 
// Returns: { 
//   email: "customPrefix@nuclene.com", 
//   hash: "b9b1a088e143a63876531f99016af53c" 
// }
```

2. **Message Retrieval**
```javascript
// Fetches all messages for a given email hash
const messages = await tempMailService.getEmails("b9b1a088e143a63876531f99016af53c");
```

3. **Code Extraction**
```javascript
// Extracts verification codes from email subjects
// Example: "123456 is your Instagram code" -> "123456"
const code = tempMailService.extractVerificationCode(emailSubject);
```

## API Routes

### 1. Create Email
```bash
# Request
curl -X POST http://localhost:3000/api/mail/create \
  -H "Content-Type: application/json" \
  -d '{"prefix": "testuser"}'

# Response
{
  "email": "testuser@nuclene.com",
  "hash": "b9b1a088e143a63876531f99016af53c"
}
```

### 2. Get Messages
```bash
# Request
curl -X GET "http://localhost:3000/api/mail/messages/b9b1a088e143a63876531f99016af53c"

# Response
[{
  "id": "5b2d3b442e3a2558afee20450f360518",
  "from": "Instagram",
  "subject": "123456 is your Instagram code",
  "timestamp": 1732564131.085,
  "verificationCode": "123456"
}]
```

### 3. Get Latest Code
```bash
# Request
curl -X GET "http://localhost:3000/api/mail/code/b9b1a088e143a63876531f99016af53c"

# Response
{
  "success": true,
  "code": "123456",
  "timestamp": 1732564131.085,
  "from": "Instagram"
}
```

## Use Case Example
1. Generate a temporary email for Instagram signup
2. Use the email on Instagram registration
3. Retrieve the verification code from the received email
4. Complete registration using the extracted code

```javascript
// Complete flow example
const emailData = await createEmail();  // Get email & hash
await useEmailForSignup(emailData.email);  // Use on site
await wait(5000);  // Wait for email
const verification = await getCode(emailData.hash);  // Get code
await submitVerification(verification.code);  // Use code
```