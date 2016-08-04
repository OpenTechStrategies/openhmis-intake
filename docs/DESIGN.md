# DESIGN.md


## Major functions of this app

- login
  - This includes getting user info from an OAuth provider (e.g. Google)
    and, if the user exists in the HMIS user list, from the HMIS server.
  - This information is stored in cookies, for now.
  
- search
  - Find matches for a string (for now, we only search on first and last names).
- edit clients
  - Errors on save should be displayed to users in human-readable form.
  - Successful save currently returns the user to the search form.
  - This includes the ability to revert changes.
- create clients
  - Users can also cancel creating a client.
  - Errors on save should be displayed to users in human-readable form.
  - Successful save currently returns the user to the search form.
- export
  - We need to add an "in progress" alert for users, in case this takes
    a long time (see #38).
  - On success, a download is sent to the user.
  - On failure, we need to show a human-readable error.
- import
  - If the file is the wrong format, show one error.
  - If not, show success/failure per line of the file.  Each line will
    have one of these results:
    - duplicate
    - failure (show error message)
    - success (show success message)
- logout
  - Unset cookies
  - Return to login screen

## Client-side javascript
- index.js is the main file
  - This file should hold all base/structural functions.  Anything that
    a user does will have some readable function in this file.
  - These functions call out to more complex/specific ones as needed --
    e.g. for search, import, export.  Those functions are housed in
    other files.  For debugging, we should be able to remove those files
    completely without affecting the behavior of the rest of the app.

## Necessary functions
- get client data from the HMIS server
- update client data on the HMIS server
- show API errors to the user
- export all clients from HMIS server
- import a CSV to the HMIS server