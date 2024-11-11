# TON Contracts

## Documentation

[Jetton (WOFR)](./docs/Wormfare%20Jetton%20Smart%20Contract.pdf) - `contracts/jetton/jetton-minter.fc` and `contracts/jetton/jetton-wallet.fc`

## Getting Started

### Available commands

```sh
# install the dependencies
yarn

# build a contract
yarn blueprint build

# run the tests
yarn blueprint test

# deploy or run another script
yarn blueprint run

# add a new contract
yarn blueprint create ContractName

# list all the available blueprint commands
yarn blueprint help
```

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

### Quick start

```sh
cp .env.example .env.testnet && cp .env.example .env.mainnet
```

```sh
yarn
```

Run the tests:

```sh
yarn blueprint test
```

### Deploy

Run a deployment script:

```sh
yarn blueprint run
```

Choose the script, network, etc. Variables from the `.env.${network}` file will be loaded. The recommended deploy wallet is Tonkeeper mobile.  

If you want to use a mnemonic wallet, you will need to create the following `.env` file:
```yml
# 24 words seed phrase
WALLET_MNEMONIC=arm north chief
# one of: v1r1, v1r2, v1r3, v2r1, v2r2, v3r1, v3r2, v4, v5r1
WALLET_VERSION=v5r1
```
