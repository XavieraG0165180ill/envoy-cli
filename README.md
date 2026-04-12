# envoy-cli

> A CLI tool for managing and syncing `.env` files across multiple environments with encryption support.

---

## Installation

```bash
npm install -g envoy-cli
```

Or with npx (no install required):

```bash
npx envoy-cli <command>
```

---

## Usage

Initialize a new envoy project in your repo:

```bash
envoy init
```

Push your local `.env` to a remote environment:

```bash
envoy push --env production
```

Pull and decrypt env variables from a remote environment:

```bash
envoy pull --env staging
```

Encrypt your `.env` file before sharing:

```bash
envoy encrypt --key <secret-key>
```

**Example workflow:**

```bash
envoy init
envoy push --env production --key $ENVOY_SECRET
envoy pull --env staging --key $ENVOY_SECRET
```

---

## Configuration

Envoy reads from an `envoy.config.json` file at the root of your project. Run `envoy init` to generate one automatically.

---

## License

[MIT](./LICENSE) © envoy-cli contributors