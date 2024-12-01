### Back-End Development (Node.js):

**THIS IS A ROUGH OVERVIEW OF A DEV PLAN**

#### **TODO:**
    - direct link to friends is not supported
    - restricted accounts
    - 1+ messages to unknown fails


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
- [x] Handle invalid login credentials.

**Session Management:** 
Maintain a session state to track whether the user is already logged in. If logged in, skip the login step for future requests.
- [x] Save session state
- [x] Load saved session
*locally

**Login API Specification**
- [x] login route creation

**Send Messages:** 
Implement routes to process the recipient username and message and send the message via Instagram.
- [x] AgentQL navigation to required user 
    - search button
    - input username
    - get first result
        - !results return
        - result? navigate to new page
            -  click message - /direct/t/114086033323765
            - send message
    - other approach -> leverage https://instagram.com/m/username 
        - page not found return
        - otherwise message
- [x] ExpressJS route creation
- [x] Send message
- [x] Check Nonexistent Instagram recipient usernames.
- [x] Handle Failures in message delivery (e.g., network errors).

### Database Management (MongoDB):

**Implement MongoDB**
securely store user sessions and application logs, such as:

**User login state** 
- [x] Create user schema
- [x] Integration with login module
- [x] Save session token and expiration +update state
- [x] Query to check if token its valid <-> +update state

**Message logs** 
timestamp, recipient username, message content, delivery status
- [x] Update user schema
- [x] Integration with message sender module

3. Errors encountered during processing.

### Error Handling and Feedback:

Implement robust error handling for:
- Provide meaningful feedback to the user via the UI, such as:
- Success or failure message after sending a message.
- Specific error descriptions (e.g., “Incorrect username or password”).


