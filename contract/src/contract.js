// @ts-check

import { AmountMath } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

import {
  assertIssuerKeywords,
  assertProposalShape,
  assertNatAssetKind,
  swap,
} from '@agoric/zoe/src/contractSupport/index.js';

/**
@param {ZCF<{pricePerItem: Amount<'nat'>, moneyIssuer: Issuer<'nat'>, issuer: Issuer<'set'>, mintNft: Mint<'set'>}>} zcf
 */
const start = (zcf) => {
  const { pricePerItem, moneyIssuer, issuer, mintNft } = zcf.getTerms();
  const allKeywords = ['Money', 'Item'];
  assertNatAssetKind(zcf, pricePerItem.brand);
  assertIssuerKeywords(zcf, harden(allKeywords));

  const zoeService = zcf.getZoeService();

  /** @type {OfferHandler} */
  const sellerInvitation = (sellerSeat) => {
    assertProposalShape(sellerSeat, {
      give: { Item: null },
      want: { Money: null },
    });
    const { want, give } = sellerSeat.getProposal();

    /** @type {OfferHandler} */
    const buyersOfferHandler = (buyerSeat) => {
      const result = swap(zcf, sellerSeat, buyerSeat);
      return result;
    };

    const buyersInvitation = zcf.makeInvitation(
      buyersOfferHandler,
      'buyerOffer',
      {
        Item: want.Item,
        Money: give.Money,
      },
    );

    return buyersInvitation;
  };

  const createNFT = async (data) => {
    const brand = zcf.getBrandForIssuer(issuer);

    const nftAmount = AmountMath.make(brand, harden([data]));

    const nftPayment = await E(mintNft).mintPayment(nftAmount);

    const proposal = harden({
      give: { Item: nftAmount },
      want: { Money: pricePerItem },
    });

    const paymentKeywordRecord = harden({ Item: nftPayment });

    const creatorInvitation = await zcf.makeInvitation(
      sellerInvitation,
      'creatorOffer',
    );

    const seat = await E(zoeService).offer(
      creatorInvitation,
      proposal,
      paymentKeywordRecord,
    );
    return seat;
  };

  const creatorFacet = Far('creatorFacet', {
    mintNFT: (data) => createNFT(data),
  });

  const publicFacet = Far('publicFacet', {
    getNftIssuer: () => issuer,
    getMoneyIssuer: () => moneyIssuer,
  });

  return harden({ creatorFacet, publicFacet });
};

harden(start);
export { start };
