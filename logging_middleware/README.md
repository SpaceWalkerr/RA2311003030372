# Logging Middleware

## Setup

```bash
export AFFORDMED_ACCESS_TOKEN='token'
```

## Usage

```js
const { Log } = require("./index");

await Log("backend", "error", "handler", "received string, expected bool");
```
