### Back-End Development (Node.js):

Overview: Make use of agentql service to take an user instagram credentials and do the following:

1. Log in into the account - or load state if possible
    - if there is a first time login or session is expired login again
2. Given a recipient username and message, send a message
    - save messages and logs to the db

#### Handle Login Requests: 

**Use agentql to authenticate users.**
- [x] Setup AgentQL
- [x] Basic Login
- [x] Headless Login
- [ ] Handle invalid login credentials.

**Session Management:** 
Maintain a session state to track whether the user is already logged in. If logged in, skip the login step for future requests.
- [x] Save session state
- [x] Load saved session
*locally

**Login API Specification**
- [x] login route creation

**Send Messages:** 
Implement routes to process the recipient username and message and send the message via Instagram.
- [ ] ExpressJS route creation
- [ ] AgentQL navigation to required user 
- [ ] Check Nonexistent Instagram recipient usernames.
- [ ] Handle Failures in message delivery (e.g., network errors).

### Database Management (MongoDB):

**Implement MongoDB**
securely store user sessions and application logs, such as:

**User login state** 
- [ ] Create user schema
- [ ] Integration with login module
- [ ] Save session token and expiration +update state
- [ ] Query to check if token its valid <-> +update state

**Message logs** 
timestamp, recipient username, message content, delivery status
- [ ] Update user schema
- [ ] Integration with message sender module

3. Errors encountered during processing.

### Error Handling and Feedback:

Implement robust error handling for:
- Provide meaningful feedback to the user via the UI, such as:
- Success or failure message after sending a message.
- Specific error descriptions (e.g., “Incorrect username or password”).


