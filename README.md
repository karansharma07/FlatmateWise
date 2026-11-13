# Flatmate by WiseLabs

A local, persistent full-stack prototype for flatmate discovery and moderated room listings. Includes responsive web, a JSON API and an operator moderation console. Dubai room publication defaults to off.

- [Market, regulatory and launch strategy](docs/strategy.md)
- [Product, design and engineering specification](docs/platform.md)

## Run locally

Install Node.js 24 or later. No third-party packages are required.

```sh
npm test
npm start
```

Open http://localhost:3000. Create two member accounts and a separate moderator account using invented emails and unique passwords of 12 or more characters. Complete same-city profiles for both members. Stop the server, then start it with the local moderator promotion command below. Stop and restart normally afterwards if desired. Promotion persists in the database.

```sh
PROMOTE_ADMIN=moderator@example.test npm start
```

In the first member account, submit a Bengaluru room using a synthetic review reference. In the moderator account, review the submission, record both checks and approve it. In the second member account, browse Bengaluru rooms and request a connection. Accept from the first account's inbox, send a message, and try reporting or blocking. Use separate browser profiles or sign out between accounts.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| PORT | 3000 | Listener port |
| BIND_HOST | 127.0.0.1 | Local interface |
| APP_ORIGIN | http://localhost:3000 | Exact browser origin, including port |
| DB_FILE | flatmate.sqlite | SQLite database path |
| PROMOTE_ADMIN | unset | Promote an existing account on startup |
| DUBAI_LISTINGS | unset | Set to enabled only for a synthetic local exercise or an authorized operator pilot |

The test suite uses a temporary SQLite database and exercises the real request handler without opening a port. Run `FLATMATE_HTTP_TEST=1 npm test` on a machine where loopback sockets are permitted to exercise the same scenario over HTTP. JavaScript syntax and the default suite were verified locally. The execution environment denied opening a loopback listener. Browser rendering, real network operation, and production deployments remain unverified.

Use synthetic data. The prototype stores profiles, moderation reasons, and chat in a local database. It lacks email ownership verification, identity-provider integration, document storage, privacy self-service, distributed operations, and public-launch controls. The moderation checkboxes record an operator decision and rely on independent review outside the app.

## Explore the marketplace

The WiseLabs Living home page provides a signed-out starter neighbourhood directory for India and Dubai. Choose a city and housing intent, then search by neighbourhood name. FlatmateWise can carry your selected city and search into room browsing after sign-in. Other housing intents currently show neighbourhoods and planned category status.
