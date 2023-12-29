# tpk-signage

This repository is a simple, web based signage solution for TPK. It uses [Balena](https://www.balena.io/) to host Docker containers that drive a raspberry pi. See `docker-compose.yml` for the specific containers.

The application displays via the [browser block](https://github.com/balena-labs-projects/browser). The core application stack is as follows:

- Node.js and express server. This uses `pug` for HTML rendering and `scss` for CSS compilation.
- The front-end app uses `htmx` and `bootstrap`.
- The API for the front-end uses routes that hit [airtable](https://airtable.com/) for menu items.
- Root url at `/` displays the "admin" interface. The main webapp lives at `/index`

There is also a Github workflow that uses the [Deploy to Balena](https://github.com/balena-io/deploy-to-balena-action) action.

## Development

Make sure to make a `.cache` directory in the root folder.

Environment variables for reference, you will need to write these into a `.env` file, for local development:
```
// browser block specific
ENABLE_GPU=1
KIOSK=1
LAUNCH_URL=http://localhost:8080/
MENU_ORIENTATION=vertical
PERSISTENT=1
ROTATE_DISPLAY=right
SHOW_CURSOR=0

// application specific
AIRTABLE_BASE=<Base ID>
AIRTABLE_TOKEN=<API key>
PORT=8080
REFRESH_TIMER=300000

// only for local development
DEV_MODE=true
```
