// @ts-check

import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

import {
  assertIssuerKeywords,
  assertProposalShape,
  assertNatAssetKind,
  swap
} from '@agoric/zoe/src/contractSupport/index.js';

 /**
@param {ZCF<{tokenName: String, pricePerItem: Amount<'nat'>, moneyIssuer: Issuer<'nat'>}>} zcf
 */
const start = zcf => {
  const { tokenName = 'token', pricePerItem, moneyIssuer } = zcf.getTerms();
  const allKeywords = ['Money'];

  assertNatAssetKind(zcf, pricePerItem.brand);
  assertIssuerKeywords(zcf, harden(allKeywords));

  const { issuer, mint, brand: brand2 } = makeIssuerKit(tokenName, AssetKind.SET);

  const zoeService = zcf.getZoeService();

  const createNTF = async ( data )=> {

    const brand3 = await E(issuer).getBrand();
 
    const nftAmount = AmountMath.make(brand3,harden([data]));  
  
    const nftPayment = mint.mintPayment(nftAmount);
    
    const proposal = harden({
      give: { Item: nftAmount },
      want: { Money: pricePerItem}
    });
     const paymentKeywordRecord = harden({ Items: nftPayment });

     const creatorInvitation = await zcf.makeInvitation(sellerInvitation, 'creatorOffer');
    const seat = await E(zoeService).offer(creatorInvitation,proposal,paymentKeywordRecord);
     return seat;
  };

  /** @type {OfferHandler} */
  const sellerInvitation = sellerSeat =>{
    assertProposalShape(sellerSeat, {
      give: { Item: null },
      want: { Money: null },
    });
    const { want,give } = sellerSeat.getProposal();

    /** @type {OfferHandler} */
    const buyersOfferHandler = buyerSeat => {
      const result = swap(zcf, sellerSeat, buyerSeat);
      return result;
    }

    const buyersInvitation = zcf.makeInvitation(buyersOfferHandler,'buyerOffer',{
      Item: want.Item,
      Money: give.Money
    });

    return buyersInvitation;
  }

  const creatorFacet = Far('creatorFacet', {
    getIssuer: () => issuer,
    mintNFT: (data) => createNTF(data)
  });

  const publicFacet = Far('publicFacet', {
    getIssuer: () => issuer,
    getMoneyIssuer: () => moneyIssuer,
  })

  return harden({ creatorFacet, publicFacet });
};

harden(start);
export { start };