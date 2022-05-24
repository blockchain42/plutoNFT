/* global harden */
import { E } from '@agoric/eventual-send';
import { observeNotifier } from '@agoric/notifier';

import React, { useCallback, useState } from 'react';
import { makeReactAgoricWalletConnection } from '@agoric/wallet-connection/react';
import { AmountMath } from '../../contract/node_modules/@agoric/ertp/src';

import './App.css';
import dappConstants from './constants';
import AgoricLogo from './agLogo.png';

const INSTALLATION_BOARD_ID = dappConstants.INSTALLATION_BOARD_ID;
const INSTALLATION_NFT_BOARD_ID = dappConstants.INSTALLATION_NFT_BOARD_ID;
const BLD_ISSUER_BOARD_ID = dappConstants.BLD_ISSUER_BOARD_ID;
console.log(
  'dapp ids ',
  INSTALLATION_BOARD_ID,
  INSTALLATION_NFT_BOARD_ID,
  BLD_ISSUER_BOARD_ID,
);

// Create a wrapper for agoric-wallet-connection that is specific to
// the app's instance of React.
const AgoricWalletConnection = makeReactAgoricWalletConnection(React);

const MyWalletConnection = (props) => {
  const [tokenPursePetname, setTokenPursePetname] = useState();
  const [awesomezPursePetname, setAwesomezPursePetname] = useState();
  // const [agoricInterface, setAgoricInterface] = useState();
  // const [walletOffers, setWalletOffers] = useState([]);
  const [agoricInterface, setAgoricInterface] = useState({});
  const [nft, setNft] = useState({
    id: '',
    collectionName: '',
    assetName: '',
  })

  const setupWalletConnection = async (walletConnection) => {
    // This is one of the only methods that the wallet connection facet allows.
    // It connects asynchronously, but you can use promise pipelining immediately.
    const walletBridge = E(walletConnection).getScopedBridge('dApp-NFTs');
    console.log('bridge ', walletBridge);

    // You should reconstruct all state here.
    const zoe = await E(walletBridge).getZoe();
    const board = await E(walletBridge).getBoard();

    const installation = await E(board).getValue(INSTALLATION_BOARD_ID);
    const installationNFT = await E(board).getValue(INSTALLATION_NFT_BOARD_ID);

    const { creatorFacet, instance } = await E(zoe).startInstance(
      installationNFT,
    );

    const INSTANCE_NFT_BOARD_ID = await E(board).getId(instance);

    const bldIssuer = await E(board).getValue(BLD_ISSUER_BOARD_ID);
    const bldBrand = await E(bldIssuer).getBrand();
    const pricePerItem = AmountMath.make(bldBrand, 1n);

    const {
      creatorFacet: sellerCreatorFacet,
      publicFacet: sellerPublicFacet,
      instance: sellerInstance,
    } = await E(creatorFacet).createInstance({
      pricePerItem,
      moneyIssuer: bldIssuer,
      sellerInstallation: installation,
    });
    const INSTANCE_BOARD_ID = await E(board).getId(sellerInstance);
    setAgoricInterface({
      creatorFacet: sellerCreatorFacet,
      boardId: INSTANCE_NFT_BOARD_ID,
      walletBridge: walletBridge,
    });

    const nftIssuer = await E(sellerPublicFacet).getNftIssuer();
    const nftBrand = await E(nftIssuer).getBrand();
    const NFT_ISSUER_BOARD_ID = await E(board).getId(nftIssuer);
    console.log('nftIssuerBoardId', NFT_ISSUER_BOARD_ID);

    E(walletBridge).suggestIssuer('tokenName', NFT_ISSUER_BOARD_ID);
    E(walletBridge).suggestInstallation(
      'tokenName installation',
      INSTALLATION_BOARD_ID,
    );
    E(walletBridge).suggestInstance(
      'tokenName instance',
      INSTANCE_NFT_BOARD_ID,
    );

    // setAgoricInterface({ zoe, board, walletBridge });

    const BLD_BRAND_BOARD_ID = await E(board).getId(bldBrand);
    const NFT_BRAND_BOARD_ID = await E(board).getId(nftBrand);

    console.log(`-- INSTANCE_BOARD_ID: ${INSTANCE_BOARD_ID}`);
    console.log(`-- INSTANCE_NFT_BOARD_ID: ${INSTANCE_NFT_BOARD_ID}`);
    console.log(`-- NFT_ISSUER_BOARD_ID: ${NFT_ISSUER_BOARD_ID}`);
    console.log(`-- NFT_BRAND_BOARD_ID: ${NFT_BRAND_BOARD_ID}`);
    console.log(`-- BLD_ISSUER_BOARD_ID: ${BLD_ISSUER_BOARD_ID}`);
    console.log(`-- BLD_BRAND_BOARD_ID: ${BLD_BRAND_BOARD_ID}`);

    observeNotifier(E(walletBridge).getPursesNotifier(), {
      updateState: async (purses) => {
        const tokenPurse = purses.find(
          // Does the purse's brand match our token brand?
          ({ brandBoardId }) => brandBoardId === BLD_BRAND_BOARD_ID,
        );
        if (tokenPurse && tokenPurse.pursePetname) {
          // If we got a petname for that purse, use it in the offers we create.
          console.log(`found purse name ${tokenPurse.pursePetname}`);
          setTokenPursePetname(tokenPurse.pursePetname);
        }

        const awesomezPurse = purses.find(
          // Does the purse's brand match our token brand?
          ({ brandBoardId }) => brandBoardId === NFT_BRAND_BOARD_ID,
        );
        if (awesomezPurse && awesomezPurse.pursePetname) {
          console.log(
            `found awesomez purse name ${awesomezPurse.pursePetname}`,
          );
          setAwesomezPursePetname(awesomezPurse.pursePetname);
        }
      },
    });

    observeNotifier(E(walletBridge).getOffersNotifier(), {
      updateState: (walletOffers) => {
        console.log(walletOffers);
        // setWalletOffers(walletOffers);
      },
    });
  };

  const onWalletState = useCallback(async (ev) => {
    const { walletConnection, state } = ev.detail;
    console.log('NEW onWalletState:', state);
    switch (state) {
      case 'idle': {
        console.log('Connection with wallet established, initializing dApp!');
        // ensure we have up to date agoric interface
        setupWalletConnection(walletConnection);
        break;
      }
      case 'error': {
        console.log('Wallet connection reported error', ev.detail);
        // In case of an error, reset to 'idle'.
        // Backoff or other retry strategies would go here instead of immediate reset.
        E(walletConnection).reset();
        break;
      }
      default:
    }
  }, []);

  async function mintMeNft(nft) {
    console.log('NFT to mint: ', nft)
    // const nft = {
    //   uri: 'pluto.agoric.nft/2',
    // };
    const offer = {
      proposalTemplate: {
        want: {
          Item: {
            pursePetname: awesomezPursePetname,
            value: [nft],
          },
        },

        give: {
          Money: {
            pursePetname: tokenPursePetname,
            value: 1000000,
          },
        },
      },
      dappContext: true,
    };

    const sellerSeat = await E(agoricInterface.creatorFacet).mintNFT(nft);

    const buyersInvitation = await E(sellerSeat).getOfferResult();

    const updatedOffer = {
      id: `${Date.now()}`,

      invitation: buyersInvitation,
      ...offer,
    };

    await E(agoricInterface.walletBridge).addOffer(updatedOffer);
  }

  return (
    <>
    { !agoricInterface || !tokenPursePetname || !awesomezPursePetname 
    ?
      <div id="Interface-activation">
      <div className="Loader" />
      <p>
        Waiting for Agoric interface to be activated (click <b>Accept</b> in
        your Agoric wallet)...
      </p>
    </div>
    :
      <div>
      <div id="nftform" className="nftForm">
        <div>
          <label htmlFor="nftId">ID</label>
          <input 
            type="text" 
            name="nftId" 
            id="nftId" 
            onChange={(e) => setNft({...nft, id: e.target.value})}
            value={nft.id}
          />
        </div>
        <div>
          <label htmlFor="nftId">Collection name</label>
          <input 
            type="text" 
            name="nftId" 
            id="nftId"
            onChange={(e) => setNft({...nft, collectionName: e.target.value})}
            value={nft.collectionName} 
          />
        </div>
        <div>
          <label htmlFor="nftId">Asset name</label>
          <input 
            type="text" 
            name="nftId" 
            id="nftId"
            onChange={(e) => setNft({...nft, assetName: e.target.value})}
            value={nft.assetName} 
          />
        </div>
      </div>
      <button onClick={() => mintMeNft(nft)}>MINT NFT</button>
    </div>
    }
      <AgoricWalletConnection
        style={{ display: 'none' }}
        onState={onWalletState}
      />
    </>
  );
};

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img className="Logo" src={AgoricLogo} alt="Logo" />
        <p>NFT minting demo by BLOCKCHAIN 42</p>
        <MyWalletConnection />
      </header>
    </div>
  );
}

export default App;
