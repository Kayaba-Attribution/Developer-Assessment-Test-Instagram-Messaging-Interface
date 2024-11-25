# Developer-Assessment-Test-Instagram-Messaging-Interface

_By Juan Gomez, and some neural network that knows too much_

See original master plans:
[Backend 70% time](backend/development_plan.md)
[Frontend 30% time](frontend/development_plan.md)

# Instagram Messenger Frontend

React application for Instagram message automation with TypeScript and shadcn/ui.

## Features

- Session-based authentication with protected routes
- Three message sending modes:
  - Quick Send: Session-based
  - Manual Input: Full credentials
  - API-Based: JSON payload
- Admin dashboard with:
  - Message history tracking
  - Status filtering
  - Recipient search
  - Real-time updates

## Setup

```bash
npm install
npm run dev
```
*_backend must be running on port 3000_
## Tech Stack

- React 18 with TypeScript
- React Router v6
- Axios for API calls
- TailwindCSS & shadcn/ui
- React Hook Form + Zod validation
- Sonner for toasts

## Project Structure

```
src/
├── components/      # UI components
├── contexts/        # Auth context
├── lib/             # API and types
```

#### Routes
- `/login`: Authentication
- `/messages`: Message form
- `/admin`: Message history dashboard

### Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Login
    participant AuthContext
    participant API
    participant ProtectedRoute

    User->>Login: Enter Credentials
    Login->>API: loginUser()
    API-->>Login: Return Session
    Login->>AuthContext: setUsername()
    AuthContext->>localStorage: Store Username
    
    Note over User,ProtectedRoute: Protected Route Access
    User->>ProtectedRoute: Access Route
    ProtectedRoute->>AuthContext: Check Auth
    alt Valid Session
        AuthContext-->>ProtectedRoute: Allow Access
        ProtectedRoute-->>User: Show Content
    else Invalid Session
        AuthContext-->>ProtectedRoute: Deny Access
        ProtectedRoute->>Login: Redirect
    end
```

### Message Operations Flow
```mermaid
flowchart TD
    User[User] --> LoginChoice{Choose Login Method}
    
    LoginChoice -->|Quick Send| Session[Use Existing Session]
    LoginChoice -->|Manual| Credentials[Enter Full Credentials] 
    LoginChoice -->|JSON| JsonInput[Paste JSON Config]
    
    Session & Credentials & JsonInput --> MessageForm[Message Form]
    MessageForm -->|Send| Backend[Backend API]
    
    Backend -->|Success| Success[Success Toast]
    Backend -->|Error| Error[Error Toast]
    Backend --> Store[Store in DB]
    
    Store --> History[Message History]
    History --> Filters[Apply Filters]
    
    subgraph Admin Dashboard
        Filters -->|Status| StatusFilter[Status: Sent/Failed]
        Filters -->|Search| SearchFilter[Search Recipients]
        Filters -->|Time| TimeFilter[Sort by Time]
        
        StatusFilter & SearchFilter & TimeFilter --> Display[Display Results]
    end
    
    style Session fill:#e3f2fd
    style Credentials fill:#e3f2fd  
    style JsonInput fill:#e3f2fd
    style History fill:#fce4ec
    style Display fill:#fce4ec
```

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