# Demo plan 2k16

## Walkthrough

- We'll do the following:
  - login
    - show user info at top right
    - QUESTION FOR KARL: Do we care about this part?
  - start with empty database
    - QUESTION: are we showing this demo on the live HMIS server?  Will
      anyone mind if we clear that db?
    - NOTE: remember that you need to redeploy the server after manually clearing the db
  - import clients
    - I'm using the "import-with-one-validation-error.csv" file in the
      examples/ subdir
      - Note that the first line in that file has an error, but only if
        it isn't a duplicate.  That is, we do the duplicate check
        *first*, and API only show up once the client decides that a
        line isn't a duplicate and tries to POST it to the server.
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
      - Do some Postman demos to show built-in API search (`curl` works
        too, of course, but Postman is a little prettier)
        - FIRST: No Headers - Access Denied
          - hmis.opentechstrategies.com:8080/openhmis/api/v3/clients
        - SECOND:
          - QUESTION: Should I go through the OAuth 2.0 playground
            run-around during the demo, or is it too in the weeds?
          - Add headers:
            Authorization: [my id token]
            Accept: application/json
            - Receive all clients
            - Edit request like so:
              [NOTE: This is an example with the clients that are in
              the import file, not the current db.]
              http://hmis.opentechstrategies.com:8080/openhmis/api/v3/clients?firstName=J*
              http://hmis.opentechstrategies.com:8080/openhmis/api/v3/clients?firstName=James
              http://hmis.opentechstrategies.com:8080/openhmis/api/v3/clients?lastName=S
              http://hmis.opentechstrategies.com:8080/openhmis/api/v3/clients?lastName=S*
              http://hmis.opentechstrategies.com:8080/openhmis/api/v3/clients?lastName=Slaughter
              http://hmis.opentechstrategies.com:8080/openhmis/api/v3/clients?firstName=James&lastName=Slaughter
             - Or say I only care about adolescents/youth (people under 18):
              http://hmis.opentechstrategies.com:8080/openhmis/api/v3/clients?dobStart=1998-08-09
            - Or only about adults:
              http://hmis.opentechstrategies.com:8080/openhmis/api/v3/clients?dobEnd=1998-08-09
            - Or only about baby boomers:
              http://hmis.opentechstrategies.com:8080/openhmis/api/v3/clients?dobEnd=1964-12-31&dobStart=1946-01-01
            - Or youth named James:
              http://hmis.opentechstrategies.com:8080/openhmis/api/v3/clients?dobStart=1998-08-09&firstName=James
            - ...you get the idea
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