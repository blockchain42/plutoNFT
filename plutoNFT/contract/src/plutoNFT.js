// @ts-check

import { AmountMath } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

import { AssetKind, makeIssuerKit } from '@agoric/ertp';

const start = (zcf) => {
  const { tokenName = 'tokenName' } = zcf.getTerms();

  const {
    brand,
    issuer,
    mint: mintNft,
  } = makeIssuerKit(tokenName, AssetKind.SET);

  const zoeService = zcf.getZoeService();

  const createInstance = async ({
    pricePerItem,
    moneyIssuer,
    sellerInstallation,
  }) => {
    const issuerKeywordRecord = harden({
      Item: issuer,
      Money: moneyIssuer,
    });

    const terms = {
      pricePerItem,
      moneyIssuer,
      issuer,
      mintNft,
    };

    const instanceRecordP = E(zoeService).startInstance(
      sellerInstallation,
      issuerKeywordRecord,
      terms,
    );

    const { creatorFacet, instance, publicFacet } = await instanceRecordP;

    console.log('after installation');
    console.log(creatorFacet);
    assert(instance);

    return harden({ creatorFacet, instance, publicFacet });
  };

  const creatorFacet = Far('creatorFacet', {
    createInstance,
    getIssuer: () => issuer,
  });

  return harden({ creatorFacet });
};

harden(start);
export { start };
