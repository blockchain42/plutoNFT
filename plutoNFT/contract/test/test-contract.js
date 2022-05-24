// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import { assert } from '@agoric/assert';
import bundleSource from '@endo/bundle-source';
import { makeIssuerKit, AmountMath, isSetValue, AssetKind } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';

import { makeZoeKit } from '@agoric/zoe';
import { defaultAcceptanceMsg } from '@agoric/zoe/src/contractSupport/index.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contract = `${dirname}/../src/contract.js`;
const contractNFT = `${dirname}/../src/plutoNFT.js`;

test(`pluto nft mint`, async (t) => {
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  const source = await bundleSource(contract);
  const installation = await E(zoe).install(source);

  const nftSource = await bundleSource(contractNFT);
  const installationNFT = await E(zoe).install(nftSource);

  const {
    issuer: bldIssuer,
    brand: bldBrand,
    mint: bldMint,
  } = makeIssuerKit('BLD');

  const pricePerItem = AmountMath.make(bldBrand, 1n);

  const { creatorFacet } = await E(zoe).startInstance(installationNFT);

  const {
    creatorFacet: sellerCreatorFacet,
    instance: sellerInstallation,
    publicFacet: sellerPublicFacet,
  } = await creatorFacet.createInstance({
    pricePerItem,
    moneyIssuer: bldIssuer,
    sellerInstallation: installation,
  });

  const imageURI = 'pluto.agoric.nft/12332123';

  const sellerSeat = await E(sellerCreatorFacet).mintNFT({ url: imageURI });

  const buyersInvitation = await E(sellerSeat).getOfferResult();

  const buyersPurse = await E(bldIssuer).makeEmptyPurse();
  await E(buyersPurse).deposit(
    await E(bldMint).mintPayment(AmountMath.make(bldBrand, 10n)),
  );

  const nftIssuer = await E(creatorFacet).getIssuer();
  const nftBrand = nftIssuer.getBrand();

  const item = AmountMath.make(nftBrand, harden([{ url: imageURI }]));

  const buyersProposal = harden({
    give: { Money: AmountMath.make(bldBrand, 1n) },
    want: { Item: item },
  });

  const buyersPayment = buyersPurse.withdraw(AmountMath.make(bldBrand, 1n));

  const buyersPaymentKeywordRecord = harden({ Money: buyersPayment });

  const buyerSeat = await E(zoe).offer(
    buyersInvitation,
    buyersProposal,
    buyersPaymentKeywordRecord,
  );

  const offerResult = await E(buyerSeat).getOfferResult();
  t.is(
    offerResult,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );

  const buyersNft = buyerSeat.getPayout('Item');
  const buyerBoughtNftAmount = await E(nftIssuer).getAmountOf(buyersNft);

  t.deepEqual(
    buyerBoughtNftAmount.value[0],
    { url: imageURI },
    'Buyer should have received the correct nft',
  );

  const sellerPayout = sellerSeat.getPayout('Money');
  const sellerPayoutAmount = await E(bldIssuer).getAmountOf(sellerPayout);

  t.deepEqual(
    sellerPayoutAmount,
    AmountMath.make(bldBrand, 1n),
    'Seller should get 1BLD',
  );

  const sellerPurse = bldIssuer.makeEmptyPurse();

  const moneyPayment = await E(sellerSeat).getPayout('Money');
  await E(sellerPurse).deposit(moneyPayment);
  const currentPurseBalance = await E(sellerPurse).getCurrentAmount();

  t.is(currentPurseBalance.value, 1n, `Seller should get 1 bld from nft sale`);
});

test(`pluto mint second test`, async (t) => {
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  const source = await bundleSource(contract);
  const installation = await E(zoe).install(source);

  const {
    issuer: bldIssuer,
    brand: bldBrand,
    mint: bldMint,
  } = makeIssuerKit('BLD');

  const {
    issuer: nftIssuer,
    brand: nftBrand,
    mint: nftMint,
  } = makeIssuerKit('NFT', AssetKind.SET);

  const pricePerItem = AmountMath.make(bldBrand, 1n);

  const issuerKeywordRecord = harden({
    Money: bldIssuer,
    Item: nftIssuer,
  });

  const { creatorFacet } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    {
      moneyIssuer: bldIssuer,
      pricePerItem,
      issuer: nftIssuer,
      mintNft: nftMint,
    },
  );

  const imageURI = 'pluto.agoric.nft/12332123';

  // const sellerInvitation = await E(creatorFacet).createInvitation();

  // const brand = await E(creatorFacet).getBrand();
  // const mint = await E(creatorFacet).getMint();

  // const nftAmount = AmountMath.make(nftBrand, harden([{ url: imageURI }]));

  // const nftPayment = nftMint.mintPayment(nftAmount);

  // const proposal = harden({
  //   give: { Item: nftAmount },
  //   want: { Money: pricePerItem },
  // });
  // const paymentKeywordRecord = harden({ Item: nftPayment });

  // const sellerSeat = await E(zoe).offer(
  //   sellerInvitation,
  //   proposal,
  //   paymentKeywordRecord,
  // );

  const sellerSeat = await E(creatorFacet).mintNFT({ url: imageURI });

  // const nftIssuer = await E(publicFacet).getIssuer();
  // const nftBrand = await E(nftIssuer).getBrand();

  const buyersInvitation = await E(sellerSeat).getOfferResult();

  // const invitationIssuer = E(zoe).getInvitationIssuer();
  // const {
  //   value: [{ instance }],
  // } = await E(invitationIssuer).getAmountOf(buyersInvitation);
  // const publicFacet = await E(zoe).getPublicFacet(instance);

  const buyersPurse = await E(bldIssuer).makeEmptyPurse();
  await E(buyersPurse).deposit(
    await E(bldMint).mintPayment(AmountMath.make(bldBrand, 10n)),
  );

  // const nftIssuer = await E(publicFacet).getIssuer();
  // const nftBrand = await E(nftIssuer).getBrand();
  const item = AmountMath.make(nftBrand, harden([{ url: imageURI }]));

  const buyersProposal = harden({
    give: { Money: AmountMath.make(bldBrand, 1n) },
    want: { Item: item },
  });

  const buyersPayment = buyersPurse.withdraw(AmountMath.make(bldBrand, 1n));

  const buyersPaymentKeywordRecord = harden({ Money: buyersPayment });

  const buyerSeat = await E(zoe).offer(
    buyersInvitation,
    buyersProposal,
    buyersPaymentKeywordRecord,
  );

  const offerResult = await E(buyerSeat).getOfferResult();
  t.is(
    offerResult,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );

  const buyersNft = buyerSeat.getPayout('Item');
  const buyerBoughtNftAmount = await E(nftIssuer).getAmountOf(buyersNft);

  t.deepEqual(
    buyerBoughtNftAmount.value[0],
    { url: imageURI },
    'Buyer should have received the correct nft',
  );

  const sellerPayout = sellerSeat.getPayout('Money');
  const sellerPayoutAmount = await E(bldIssuer).getAmountOf(sellerPayout);

  t.deepEqual(
    sellerPayoutAmount,
    AmountMath.make(bldBrand, 1n),
    'Seller should get 1BLD',
  );

  const sellerPurse = bldIssuer.makeEmptyPurse();

  const moneyPayment = await E(sellerSeat).getPayout('Money');
  await E(sellerPurse).deposit(moneyPayment);
  const currentPurseBalance = await E(sellerPurse).getCurrentAmount();

  t.is(currentPurseBalance.value, 1n, `Seller should get 1 bld from nft sale`);
});

/*
test(`agatar mint`, async (t) => {
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  const source = await bundleSource(contract);
  const installation = await E(zoe).install(source);

  const {
    issuer: bldIssuer,
    brand: bldBrand,
    mint: bldMint,
  } = makeIssuerKit('BLD');

  const pricePerItem = AmountMath.make(bldBrand, 1n);

  const issuerKeywordRecord = harden({
    Money: bldIssuer,
  });

  const { creatorFacet, publicFacet } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    { tokenName: 'TestToken', moneyIssuer: bldIssuer, pricePerItem },
  );

  const imageURI = 'pluto.agoric.nft/12332123';

  const sellerSeat = await E(creatorFacet).mintNFT({ url: imageURI });

  const nftIssuer = await E(publicFacet).getIssuer();
  const nftBrand = await E(nftIssuer).getBrand();

  console.log(nftBrand);
  console.log('here');

  const buyersInvitation = await E(sellerSeat).getOfferResult();

  // const invitationIssuer = E(zoe).getInvitationIssuer();
  // const {
  //   value: [{ instance }],
  // } = await E(invitationIssuer).getAmountOf(buyersInvitation);
  // const publicFacet = await E(zoe).getPublicFacet(instance);

  const buyersPurse = await E(bldIssuer).makeEmptyPurse();
  await E(buyersPurse).deposit(
    await E(bldMint).mintPayment(AmountMath.make(bldBrand, 10n)),
  );

  // const nftIssuer = await E(publicFacet).getIssuer();
  // const nftBrand = await E(nftIssuer).getBrand();
  const item = AmountMath.make(nftBrand, harden([{ url: imageURI }]));

  const buyersProposal = harden({
    give: { Money: AmountMath.make(bldBrand, 1n) },
    want: { Item: item },
  });

  console.log(buyersProposal);

  const buyersPayment = buyersPurse.withdraw(AmountMath.make(bldBrand, 1n));

  const buyersPaymentKeywordRecord = harden({ Money: buyersPayment });

  const buyerSeat = await E(zoe).offer(
    buyersInvitation,
    buyersProposal,
    buyersPaymentKeywordRecord,
  );

  const offerResult = await E(buyerSeat).getOfferResult();
  t.is(
    offerResult,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );

  const buyersNft = buyerSeat.getPayout('Item');
  const buyerBoughtNftAmount = await E(nftIssuer).getAmountOf(buyersNft);

  t.is(
    buyerBoughtNftAmount.value[0].uri,
    imageURI,
    'Buyer should have received the correct image',
  );

  // const sellerPurse = bldIssuer.makeEmptyPurse();

  // const moneyPayment = await E(sellItemsCreatorSeat).getPayout('Money');
  // await E(sellerPurse).deposit(moneyPayment);
  // const currentPurseBalance = await E(sellerPurse).getCurrentAmount();

  // t.is(
  //   currentPurseBalance.value,
  //   1n,
  //   `Seller should get 1 bld from image sale`,
  // );
});
*/
