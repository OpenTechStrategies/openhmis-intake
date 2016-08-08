# Demo plan 2k16

## Walkthrough

- We'll do the following:
  - login
    - show user info at top right
    - QUESTION FOR KARL: Do we care about this part?
  - start with empty database
    - NOTE: remember that you need to redeploy the server after manually clearing the db
  - import clients
    - I'm using the "test-import.csv" file in my top-level
      openhmis-intake dir, but it isn't in the repo (yet?).
      - note that one of the lines has an error
    - Make note of the fact that we can get an API error back from the
      first line.
    - Mention the duplicate check, even though we're starting with an
      empty db here. 
    - PROBLEM: need to refresh immediately after import; before
      searching.  Still have to resolve that.
      - TODO: try to fix, or just explain the need for manual refresh
        during the demo if necessary. 
  - search for clients
    - Try "Slaughter" or "Test" with that import set.
    - Note that we're currently only searching on the first and last
      name fields.  We could add other fields (e.g. SSN).
    - Talk about the difference between the demo client search
      capability and the built-in API search.
      - Do some Postman demos to show built-in API search
      - TODO: come up with/practice these
    - NOTE TO KARL: the demo client isn't using the API's search -- it
      just pulls down all the clients and uses regex to go through
      those.
  - edit a client
    - Do a successful edit (e.g., SSN, gender)
      - TODO: Show that the info is changed on the server via Postman
    - Try an unsuccessful one
      - DONE: make the API errors more human-readable.
      - Make the SSN too short or too long and see that an error shows
        up.
  - add a client
    - Try with just name, see that SSN is required
      - NOTE TO KARL: Server currently interprets empty string SSN as
        wrong format SSN, not missing SSN
    - Search after adding the person; they should show up right away
  - export (the changed set of) clients
    - QUESTION: export missed the new person on one occasion, but I
      can't reproduce that error so it might have been PEBKAC.
    - NOTE: the export occasionally seems to be getting called twice,
      probably as a result of my refactoring.  Check this out! 

## EXTRA CREDIT:

  - MAYBE: try as a non-admin user
    - attempt import; get access denied
    - search should work
    - edit/add fail with access denied