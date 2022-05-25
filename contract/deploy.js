// @ts-check

import fs from 'fs';
import '@agoric/zoe/exported.js';
import { E } from '@endo/eventual-send';
import bundleSource from '@endo/bundle-source';

import { makeIssuerKit, AmountMath, isSetValue, AssetKind } from '@agoric/ertp';

import { pursePetnames } from './petnames.js';

// This script takes our contract code, installs it on Zoe, and makes
// the installation publicly available. Our backend API script will
// use this installation in a later step.

/**
 * @template T
 * @typedef {import('@endo/eventual-send').ERef<T>} ERef
 */

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => string} pathResolve
 *
 * @typedef {Object} Board
 * @property {(id: string) => any} getValue
 * @property {(value: any) => string} getId
 * @property {(value: any) => boolean} has
 * @property {() => [string]} ids
 */

/**
 * @param {(path: string) => string} pathResolve
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<Board>} board
 * @returns {Promise<{ INSTALLATION_BOARD_ID: string, INSTALLATION_NFT_BOARD_ID:string, BLD_ISSUER_BOARD_ID:string }>}
 */
const installBundle = async (pathResolve, zoe, board, wallet) => {
  const bundle = await bundleSource(pathResolve(`./src/contract.js`));
  const installation = await E(zoe).install(bundle);

  const bundleNft = await bundleSource(pathResolve(`./src/plutoNFT.js`));
  const installationNft = await E(zoe).install(bundleNft);

  const INSTALLATION_BOARD_ID = await E(board).getId(installation);
  const INSTALLATION_NFT_BOARD_ID = await E(board).getId(installationNft);

  const issuersArray = await E(wallet).getIssuers();
  const issuers = new Map(issuersArray);
  const bldIssuer = issuers.get('BLD');
  const BLD_ISSUER_BOARD_ID = await E(board).getId(bldIssuer);

  console.log('- SUCCESS! contract code installed on Zoe');
  console.log(`-- Installation Board Id: ${INSTALLATION_BOARD_ID}`);
  console.log(`-- Installation NFT Board Id: ${INSTALLATION_NFT_BOARD_ID}`);
  console.log(`-- BLD Issuer Board Id: ${BLD_ISSUER_BOARD_ID}`);

  return {
    INSTALLATION_BOARD_ID,
    INSTALLATION_NFT_BOARD_ID,
    BLD_ISSUER_BOARD_ID,
  };
};

const startInstance = async (
  pathResolve,
  board,
  wallet,
  zoe,
  INSTALLATION_BOARD_ID,
  INSTALLATION_NFT_BOARD_ID,
) => {
  const installation = await E(board).getValue(INSTALLATION_BOARD_ID);

  const installationNFT = await E(board).getValue(INSTALLATION_NFT_BOARD_ID);

  const issuersArray = await E(wallet).getIssuers();
  const issuers = new Map(issuersArray);
  const bldIssuer = issuers.get('BLD');
  const bldBrand = await E(bldIssuer).getBrand();

  const pricePerItem = AmountMath.make(bldBrand, 1000000n);

  const { creatorFacet, instance } = await E(zoe).startInstance(
    installationNFT,
  );

  const {
    creatorFacet: sellerCreatorFacet,
    publicFacet: sellerPublicFacet,
    instance: sellerInstance,
  } = await E(creatorFacet).createInstance({
    pricePerItem,
    moneyIssuer: bldIssuer,
    sellerInstallation: installation,
  });

  const nftIssuer = await E(creatorFacet).getIssuer();
  const nftBrand = await E(nftIssuer).getBrand();

  const [
    INSTANCE_NFT_BOARD_ID,
    INSTANCE_BOARD_ID,
    TOKEN_BRAND_BOARD_ID,
    TOKEN_ISSUER_BOARD_ID,
    MONEY_BRAND_BOARD_ID,
    MONEY_ISSUER_BOARD_ID,
  ] = await Promise.all([
    E(board).getId(instance),
    E(board).getId(sellerInstance),
    E(board).getId(nftBrand),
    E(board).getId(nftIssuer),
    E(board).getId(bldBrand),
    E(board).getId(bldIssuer),
  ]);

  console.log(`-- INSTANCE_BOARD_ID: ${INSTANCE_BOARD_ID}`);
  console.log(`-- INSTANCE_NFT_BOARD_ID: ${INSTANCE_NFT_BOARD_ID}`);
  console.log(`-- TOKEN_ISSUER_BOARD_ID: ${TOKEN_ISSUER_BOARD_ID}`);
  console.log(`-- TOKEN_BRAND_BOARD_ID: ${TOKEN_BRAND_BOARD_ID}`);
  console.log(`-- MONEY_ISSUER_BOARD_ID: ${MONEY_ISSUER_BOARD_ID}`);
  console.log(`-- MONEY_BRAND_BOARD_ID: ${MONEY_BRAND_BOARD_ID}`);

  const invitationIssuerP = E(zoe).getInvitationIssuer();
  const invitationBrandP = E(invitationIssuerP).getBrand();

  const invitationBrand = await invitationBrandP;
  const INVITE_BRAND_BOARD_ID = await E(board).getId(invitationBrand);

  const dappConstants = {
    INSTANCE_BOARD_ID,
    INSTANCE_NFT_BOARD_ID,
    INSTALLATION_BOARD_ID,
    INSTALLATION_NFT_BOARD_ID,
    INVITE_BRAND_BOARD_ID,
    // BRIDGE_URL: 'agoric-lookup:https://local.agoric.com?append=/bridge',
    brandBoardIds: {
      Token: TOKEN_BRAND_BOARD_ID,
      Money: MONEY_BRAND_BOARD_ID,
    },
    issuerBoardIds: {
      Token: TOKEN_ISSUER_BOARD_ID,
      Money: MONEY_ISSUER_BOARD_ID,
    },
    // BRIDGE_URL: 'http://127.0.0.1:8000',
    // API_URL,
  };
  const defaultsFile = pathResolve(`../ui/public/conf/defaults.js`);
  console.log('writing', defaultsFile);
  const defaultsContents = `\
// GENERATED FROM ${pathResolve('./deploy.js')}
export default ${JSON.stringify(dappConstants, undefined, 2)};
`;
  await fs.promises.writeFile(defaultsFile, defaultsContents);
};

/**
 * @param {ERef<Object>} wallet
 * @param {ERef<Object>} faucet
 */
const sendDeposit = async (wallet, faucet) => {
  // We must first fund our "feePurse", the purse that we will use to
  // pay for our interactions with Zoe.
  const RUNPurse = E(wallet).getPurse(pursePetnames.RUN);
  const runAmount = await E(RUNPurse).getCurrentAmount();
  const feePurse = E(faucet).getFeePurse();
  const feePayment = await E(E(wallet).getPurse(pursePetnames.RUN)).withdraw(
    runAmount,
  );
  await E(feePurse).deposit(feePayment);
};

/**
 * @param {Promise<{zoe: ERef<ZoeService>, board: ERef<Board>, agoricNames:
 * Object, wallet: ERef<Object>, faucet: ERef<Object>}>} homePromise
 * @param {DeployPowers} powers
 */
const deployContract = async (homePromise, { pathResolve }) => {
  // Your off-chain machine (what we call an ag-solo) starts off with
  // a number of references, some of which are shared objects on chain, and
  // some of which are objects that only exist on your machine.

  // Let's wait for the promise to resolve.
  const home = await homePromise;

  // Unpack the references.
  const {
    // *** ON-CHAIN REFERENCES ***

    // Zoe lives on-chain and is shared by everyone who has access to
    // the chain. In this demo, that's just you, but on our testnet,
    // everyone has access to the same Zoe.
    zoe,

    // The board is an on-chain object that is used to make private
    // on-chain objects public to everyone else on-chain. These
    // objects get assigned a unique string id. Given the id, other
    // people can access the object through the board. Ids and values
    // have a one-to-one bidirectional mapping. If a value is added a
    // second time, the original id is just returned.
    board,

    // The wallet holds and manages assets for the user.
    wallet,

    // The faucet provides an initial amount of RUN for the user to use.
    faucet,
  } = home;

  //  await sendDeposit(wallet, faucet);
  const {
    INSTALLATION_BOARD_ID,
    INSTALLATION_NFT_BOARD_ID,
    BLD_ISSUER_BOARD_ID,
  } = await installBundle(pathResolve, zoe, board, wallet);

  // await startInstance(
  //   pathResolve,
  //   board,
  //   wallet,
  //   zoe,
  //   INSTALLATION_BOARD_ID,
  //   INSTALLATION_NFT_BOARD_ID,
  // );

  // Save the constants somewhere where the UI and api can find it.
  const dappConstants = {
    INSTALLATION_BOARD_ID,
    INSTALLATION_NFT_BOARD_ID,
    BLD_ISSUER_BOARD_ID,
  };
  const defaultsFolder = pathResolve(`../react-ui/public/conf`);
  const defaultsFile = pathResolve(`../react-ui/src/constants.js`);
  console.log('writing', defaultsFile);
  const defaultsContents = `\
// GENERATED FROM ${pathResolve('./deploy.js')}
export default ${JSON.stringify(dappConstants, undefined, 2)};
`;
  await fs.promises.mkdir(defaultsFolder, { recursive: true });
  await fs.promises.writeFile(defaultsFile, defaultsContents);
};

export default deployContract;
