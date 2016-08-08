# Test list

This is a list of manual tests that we need to run to make sure this app
is working correctly.  It isn't complete yet -- feel free to add more,
and definitely add more when you add new functionality.

- login
  - account info shows up at top right (correctly, whether or not the
    user is in the HMIS database) 
  - search screen appears
  - logout button appears
- search
  - all matching clients appear in results
- edit
  - switch to edit screen works
  - datepicker works to edit date
  - search after editing (should show new/changed info)
- export
  - should have latest version of data
- import
  - should show success/error messages for each line of the csv
    (success, error: API response, or duplicate) 
  - should error once for non-csvs, not-correctly-formatted csvs, etc.
  - after import, new data should show up in searches
- logout
  - account information disappears
  - login screen shows up