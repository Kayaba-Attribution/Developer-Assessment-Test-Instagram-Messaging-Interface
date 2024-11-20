### Front-End Development (React):

**Login Screen:**

- [x] Build a login screen in React with fields for:

- Username
- Password

**Message Form:**

After login (or if the user is already logged in) -> display a form with the following fields:
- Instagram recipient username
- Message to send
- Include a Submit button to initiate the message-sending process.
- Add form validation for empty fields or invalid formats.

**_Two Input Modes:_**

**1. Manual Input:** 
Allow users to manually fill out the form fields
- username, password, recipient username, and message

**2. API-Based Input:** 
Configure the UI to accept a JSON input in the following format:

```json
{
  "username": "example_username",
  "password": "example_password",
  "recipient": "instagram_user",
  "message": "Hello, this is a test message!"
}
```

When provided with this JSON (e.g., through Postilize), auto-fill the fields, allowing the user to preview or confirm the details before sending the message.


npx shadcn@latest add button
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add tabs
npx shadcn@latest add toast
npx shadcn@latest add dialog