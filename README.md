@'

\# PhishSite — Email Origin Classifier



PhishSite is a browser-based email security tool that analyzes email content and helps identify suspicious or potentially phishing messages.



It provides an interactive interface for scanning email content, reviewing analysis results, inspecting authentication information, and viewing scan history.



\## Features



\- Email origin and phishing analysis

\- Suspicious-content detection

\- Email authentication analysis

\- SPF, DKIM, and DMARC inspection

\- Attachment analysis

\- Gmail integration

\- Gmail inbox message scanning

\- Gmail account identity display

\- Scan history

\- Analytics and results views

\- Manual email analysis

\- Gmail session-expiry handling

\- Secure Gmail disconnect flow

\- Gmail-derived data clearing

\- Responsive web interface

\- Content Security Policy (CSP)



\## Gmail Integration



PhishSite can connect to a Gmail account using Google's OAuth authentication flow.



The application requests read-only Gmail access and uses the Gmail API to retrieve messages for analysis.



The application is designed so that:



\- Gmail access can be disconnected by the user.

\- Expired or revoked Gmail sessions are detected.

\- The user is prompted to reconnect when authentication expires.

\- Gmail-derived scan data can be cleared when disconnecting.

\- Manually entered scan history is preserved when Gmail data is removed.

\- Gmail access uses the `gmail.readonly` scope.



\## Security and Privacy



PhishSite is designed with security and privacy considerations in mind.



Security-related features include:



\- Google OAuth authentication for Gmail access

\- Read-only Gmail permission

\- Authentication failure detection

\- Silent Gmail token refresh

\- Content Security Policy

\- Explicit Gmail data-retention disclosure

\- User-controlled Gmail disconnection

\- Separate handling of Gmail-derived and manually entered scan data



The application does not require Gmail credentials to be entered directly into PhishSite.



\## Tech Stack



\- HTML5

\- CSS3

\- JavaScript

\- Google Gmail API

\- Google Identity Services

\- Browser APIs



\## Project Structure



```text

PhishSite/

├── app.js

├── index.html

├── style.css

├── README.md

└── .gitignore

