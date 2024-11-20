### Developer-Assessment-Test-Instagram-Messaging-Interface

# Instagram Messenger Backend

A Node.js backend service that handles automated Instagram messaging using Playwright (agentql) for browser automation.

## Features

- Instagram session management with MongoDB
- Automated login and message sending
- Session persistence and reuse
- Message history tracking
- Error handling and logging
- Screenshot capture for debugging
- API endpoints for message operations

## Requirements

- Node.js 16+
- MongoDB
- AgentQL API key

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
PORT=3000
MONGODB_URI=your_mongodb_uri
AGENTQL_API_KEY=your_agentql_key
NODE_ENV=production
```

3. Start the server:
```bash
npm start
```

## API Endpoints

- `POST /api/login`: Login to Instagram
- `POST /api/login/force`: Force new login session
- `POST /api/messages/send`: Send message using existing session
- `POST /api/messages/send-with-auth`: Send message with authentication
- `GET /api/messages/history/:username`: Get message history

## Project Structure

```
src/
├── config/          # Configuration files
├── models/          # Database models
├── services/        # Business logic
└── utils/           # Helper functions
```

### Technical diagram

```mermaid
flowchart TD
    Client --> |HTTP Requests| Server[Express Server]
    Server --> |User Auth| Auth[Authentication Service]
    Server --> |Message Ops| Msg[Message Service]
    
    Auth --> |Session Management| SS[Session Service]
    Msg --> |Session Validation| SS
    
    SS --> |Store/Retrieve| DB[(MongoDB)]
    
    Auth --> |Browser Automation| PW[AgentQL Playwright]
    Msg --> |Browser Automation| PW
    
    PW --> |Interact| IG[Instagram]
    
    subgraph Services
        Auth
        Msg
        SS
    end
```

## Session Service

### Core Functionality

The SessionService manages Instagram sessions and user authentication:

```javascript
// Create/Update session
await sessionService.createOrUpdateSession(username, password, sessionData);

// Validate existing session
const isValid = await sessionService.validateSession(username);

// Get stored credentials
const credentials = await sessionService.getStoredCredentials(username);

// Log message activity
await sessionService.logMessage(fromUser, toUser, content, status);

// Get message history
const history = await sessionService.getMessageHistory(username, {
  status: 'sent',
  recipient: 'user123'
});
```

### Session Management

- **Session Storage**: Stores essential Instagram cookies (sessionId, userId, csrfToken, rur)
- **Password Security**: Implements bcrypt hashing for stored passwords
- **Expiration**: Sessions automatically expire after 24 hours
- **Message Tracking**: Logs all message attempts with status and errors

```mermaid
flowchart TD
    Login[Login Request] --> ValidateSession{Check Session}
    ValidateSession -->|Valid| UseExisting[Use Existing Session]
    ValidateSession -->|Invalid| CreateNew[Create New Session]
    
    CreateNew --> HashPass[Hash Password]
    HashPass --> StoreSession[Store in MongoDB]
    StoreSession --> SaveCookies[Save Essential Cookies]
    
    subgraph MessageFlow["Message Flow"]
        SendMsg[Send Message Request]
        ValidateMsg{Validate Session}
        SendMsg --> ValidateMsg
        ValidateMsg -->|Valid| SendToIG[Send to Instagram]
        ValidateMsg -->|Invalid| ReLogin[Re-login Flow]
        SendToIG --> LogMsg[Log Message]
    end
    
    SaveCookies --> MessageFlow
```

### Data Schema

```javascript
{
  instagram_username: String,
  instagram_password: String, // Hashed
  session: {
    sessionId: String,
    userId: String,
    csrfToken: String,
    rur: String,
    expiresAt: Date
  },
  messages: [{
    recipient: String,
    content: String,
    status: String,
    createdAt: Date,
    error: String
  }],
  lastActivity: Date
}
```