# Best Agoric NFT Implementation

## How to run the app

- Clone this repository `git clone https://github.com/blockchain42/plutoNFT.git`
- If you don't have Agoric-SDK installed, you can simply open the repository in VS Code and open it in Remote Container (ctrl+shift+p 'Open Folder In Container'). This builds the Dockerfile and installs all necessary tooling to run the app (it takes about 10 minutes).

### In a first terminal run:

- `agoric install`
- `agoric start --reset`

### In a second terminal run:

- `agoric deploy ./contract/deploy.js`
- `agoric open --repl`

### In a third terminal run:

- `cd react-ui && yarn start`

After the above process you should have two tabs open in your browser with the Agoric wallet and with the React application. After a minute or so you should see a popup in your wallet for approving the dapp. Then you will be able to mint a randomly generated NFT and confirm the purchase in the wallet.
