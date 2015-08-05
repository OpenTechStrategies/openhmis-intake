Installing OpenHMIS Intake
=================================================================
 
General Notes:
-------------------
* This service requires access to a working copy of the OpenHMIS API (0.x)
* This service uses NodeJS to run


To create a local build:
-------------------
The instructions below explain how to set up a development environment capable of running the API endpoints.  This section assumes you have already used git to download a local copy of the code base.

_In order for those endpoints to function correctly, you must also create a local copy of the schema._

1. Install [NodeJS](https://nodejs.org/).

2. Create and edit a local `config/env/local.js` file, 
  * The host and port should point to the location of the OpenHMIS API

  ```shell
    $> cp config/env/local.js.example config/env/local.js
    $> vi config/env/local.js
  ```

3. Install npm dependencies

  ```shell
    $> npm install
  ```


To run the web service:
---------------------

1. Using a Command Line Interface, navigate to the root directory of this code base.  It should be the one containing `server.js`

2. Start the application

  * Note: some unix based systems have a name conflict and you must type `nodejs` rather than `node`.

  ```shell
    $> node server.js
  ```

  or maybe:

  ```shell
    $> node_modules/.bin/forever -da start --watchDirectory . -l forever.log -o out.log -e err.log server.js
  ```

  (in the latter case, use `node_modules/.bin/forever stopall` later to stop the application).
