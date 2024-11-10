# TON Contracts

## Documentation

[WOFR](./docs/Wormfare%20Jetton%20Smart%20Contract.pdf) - `contracts/jetton/jetton-minter.fc` and `contracts/jetton/jetton-wallet.fc`

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
