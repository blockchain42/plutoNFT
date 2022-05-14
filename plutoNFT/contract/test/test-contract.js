// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import { assert } from '@agoric/assert';
import bundleSource from '@endo/bundle-source';
import { makeIssuerKit, AmountMath, isSetValue } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';

import { makeZoeKit } from '@agoric/zoe';
// import { defaultAcceptanceMsg } from '../../../src/contractSupport/index.js';
import { defaultAcceptanceMsg } from'@agoric/zoe/src/contractSupport/index.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const mintAndSellNFTRoot = `${dirname}/../src/contract.js`;
const sellItemsRoot = `${dirname}/../src/sellItems.js`;

test(`mint images`, async t=> {
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  const mintAndSellNFTBundle = await bundleSource(mintAndSellNFTRoot);
  vatAdminState.installBundle('pluto-nft', mintAndSellNFTBundle);
  const mintAndSellNFTInstallation = await E(zoe).installBundleID('pluto-nft');

  const sellItemsBundle = await bundleSource(sellItemsRoot);
  vatAdminState.installBundle('pluto-sell-items', sellItemsBundle);
  const sellItemsInstallation = await E(zoe).installBundleID('pluto-sell-items');

  const { issuer: bldIssuer, brand: bldBrand, mint: bldMint } = makeIssuerKit('BLD');

  const { creatorFacet: plutoMaker } = await E(zoe).startInstance(
    mintAndSellNFTInstallation,
  );

  const imageURI = 'pluto.agoric.nft/'

  const { sellItemsCreatorSeat, sellItemsInstance,sellItemsCreatorFacet } = await E(
    plutoMaker,
  ).sellTokens({
    customValueProperties: {
      uri: imageURI
    },
    count: 3,
    moneyIssuer: bldIssuer,
    sellItemsInstallation,
    pricePerItem: AmountMath.make(bldBrand, 1n),
  });

  t.is(
    await sellItemsCreatorSeat.getOfferResult(),
    defaultAcceptanceMsg,
    `escrowPlutoImagesOutcome is default acceptance message`,
  );


  const bldIssuer2 = E(plutoMaker).getIssuer();
  const bldBrand2 = await E(bldIssuer2).getBrand();
  const plutoSalesPublicFacet = await E(zoe).getPublicFacet(sellItemsInstance);
  const plutosForSale = await E(plutoSalesPublicFacet).getAvailableItems();
  t.deepEqual(
    plutosForSale,
    {
      brand: bldBrand2,
      value: [
        {
          uri: imageURI + '3',
          number: 3,
        },
        {
          uri: imageURI + '2',
          number: 2,
        },
        {
          uri: imageURI + '1',
          number: 1,
        },
      ],
    },
    `pluto images are up for sale`,
  );

  const buyersInvitation = E(sellItemsCreatorFacet).makeBuyerInvitation();
  const invitationIssuer = E(zoe).getInvitationIssuer();
  const {
    value: [{ instance }],
  } = await E(invitationIssuer).getAmountOf(buyersInvitation);
  const plutoPublicFacet = await E(zoe).getPublicFacet(instance);

  const plutoIssuer = await E(plutoPublicFacet).getItemsIssuer();
    const plutoBrand = await E(plutoIssuer).getBrand();
    const terms = await E(zoe).getTerms(instance);
    const buyersPurse = await E(bldIssuer).makeEmptyPurse();
    await E(buyersPurse).deposit( await E(bldMint).mintPayment(AmountMath.make(bldBrand, 10n)));

    const availableImages = await E(
      plutoPublicFacet,
    ).getAvailableItems();

    t.is(
      availableImages.value.length,
      3,
      'Buyer should see 3 available tickets',
    );
    assert(isSetValue(availableImages.value));
    t.truthy(
      availableImages.value.find(ticket => ticket.number === 1),
      `availableImages contains ticket number 1`,
    );
    t.truthy(
      availableImages.value.find(ticket => ticket.number === 2),
      `availableImages contains ticket number 2`,
    );
    t.truthy(
      availableImages.value.find(ticket => ticket.number === 3),
      `availableImages contains ticket number 3`,
    );

    const image1Value = availableImages.value.find(
      image => image.number === 1,
    );
    // make the corresponding amount
    const image1Amount = AmountMath.make(plutoBrand, harden([image1Value]));

    console.log(image1Amount);

    const buyersProposal = harden({
      give: { Money: terms.pricePerItem },
      want: { Items: image1Amount },
    });

    const buyersPaymentForTicket = buyersPurse.withdraw(terms.pricePerItem);

    const buyersPaymentKeywordRecord = harden({ Money: buyersPaymentForTicket });

    const seat = await E(zoe).offer(
      buyersInvitation,
      buyersProposal,
      buyersPaymentKeywordRecord,
    );

    const offerResult = await E(seat).getOfferResult();
    t.is(
      offerResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    const buyersImages = seat.getPayout('Items');
    const buyerBoughtTicketAmount = await E(plutoIssuer).getAmountOf(
      buyersImages,
    );

    t.is(
      buyerBoughtTicketAmount.value[0].uri,
      imageURI + '1',
      'Buyer should have received the correct image',
    );
    t.is(
      buyerBoughtTicketAmount.value[0].number,
      1,
      'Buyer should have received the image for the correct number',
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

})
/*
test(`mint and sell tickets for multiple shows`, async t => {
  // Setup initial conditions
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  const mintAndSellNFTBundle = await bundleSource(mintAndSellNFTRoot);
  vatAdminState.installBundle('b1-nft', mintAndSellNFTBundle);
  const mintAndSellNFTInstallation = await E(zoe).installBundleID('b1-nft');

  const sellItemsBundle = await bundleSource(sellItemsRoot);
  vatAdminState.installBundle('b1-sell-items', sellItemsBundle);
  const sellItemsInstallation = await E(zoe).installBundleID('b1-sell-items');

  const { issuer: moolaIssuer, brand: moolaBrand } = makeIssuerKit('moola');

  const { creatorFacet: ticketMaker } = await E(zoe).startInstance(
    mintAndSellNFTInstallation,
  );
  const { sellItemsCreatorSeat, sellItemsInstance } = await E(
    ticketMaker,
  ).sellTokens({
    customValueProperties: {
      show: 'Steven Universe, the Opera',
      start: 'Wed, March 25th 2020 at 8pm',
    },
    count: 3,
    moneyIssuer: moolaIssuer,
    sellItemsInstallation,
    pricePerItem: AmountMath.make(moolaBrand, 20n),
  });
  t.is(
    await sellItemsCreatorSeat.getOfferResult(),
    defaultAcceptanceMsg,
    `escrowTicketsOutcome is default acceptance message`,
  );

  const ticketIssuerP = E(ticketMaker).getIssuer();
  const ticketBrand = await E(ticketIssuerP).getBrand();
  const ticketSalesPublicFacet = await E(zoe).getPublicFacet(sellItemsInstance);
  const ticketsForSale = await E(ticketSalesPublicFacet).getAvailableItems();
  t.deepEqual(
    ticketsForSale,
    {
      brand: ticketBrand,
      value: [
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 3,
          uri: NaN
        },
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 2,
          uri: NaN
        },
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 1,
          uri: NaN
        },
      ],
    },
    `the tickets are up for sale`,
  );

  const { sellItemsInstance: sellItemsInstance2 } = await E(
    ticketMaker,
  ).sellTokens({
    customValueProperties: {
      show: 'Reserved for private party',
      start: 'Tues May 12, 2020 at 8pm',
    },
    count: 2,
    moneyIssuer: moolaIssuer,
    sellItemsInstallation,
    pricePerItem: AmountMath.make(moolaBrand, 20n),
  });
  const sellItemsPublicFacet2 = await E(zoe).getPublicFacet(sellItemsInstance2);
  const ticketsForSale2 = await E(sellItemsPublicFacet2).getAvailableItems();
  t.deepEqual(
    ticketsForSale2,
    {
      brand: ticketBrand,
      value: [
        {
          show: 'Reserved for private party',
          start: 'Tues May 12, 2020 at 8pm',
          number: 2,
          uri: NaN
        },
        {
          show: 'Reserved for private party',
          start: 'Tues May 12, 2020 at 8pm',
          number: 1,
          uri: NaN
        },
      ],
    },
    `we can reuse the mint to make more tickets and sell them in a different instance`,
  );
});

// __Test Scenario__

// The Opera de Bordeaux plays the contract creator and the auditorium
// It creates the contract for a show ("Steven Universe, the Opera", Wed, March
// 25th 2020 at 8pm, 3 tickets)
// The Opera wants 22 moolas per ticket

// Alice buys ticket #1

// Then, the Joker tries malicious things:
// - they try to buy ticket #1 (and will fail because Alice already
//   bought it)
// - they try to buy to buy ticket #2 for 1 moola (and will fail)

// Then, Bob buys ticket #2 and #3

// The Opera is told about the show being sold out. It gets all the moolas from
// the sale

test(`mint and sell opera tickets`, async t => {
  // Setup initial conditions
  const {
    mint: moolaMint,
    issuer: moolaIssuer,
    brand: moolaBrand,
  } = makeIssuerKit('moola');

  const moola = value => AmountMath.make(moolaBrand, value);

  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  const mintAndSellNFTBundle = await bundleSource(mintAndSellNFTRoot);
  vatAdminState.installBundle('b1-nft', mintAndSellNFTBundle);
  const mintAndSellNFTInstallation = await E(zoe).installBundleID('b1-nft');

  const sellItemsBundle = await bundleSource(sellItemsRoot);
  vatAdminState.installBundle('b1-sell-items', sellItemsBundle);
  const sellItemsInstallation = await E(zoe).installBundleID('b1-sell-items');

  // === Initial Opera de Bordeaux part ===

  // create an instance of the venue contract
  const mintTickets = async () => {
    const { creatorFacet: ticketSeller } = await E(zoe).startInstance(
      mintAndSellNFTInstallation,
    );

    const {
      sellItemsCreatorSeat,
      sellItemsCreatorFacet,
      sellItemsPublicFacet,
    } = await E(ticketSeller).sellTokens({
      customValueProperties: {
        show: 'Steven Universe, the Opera',
        start: 'Wed, March 25th 2020 at 8pm',
      },
      count: 3,
      moneyIssuer: moolaIssuer,
      sellItemsInstallation,
      pricePerItem: moola(22n),
    });

    const ticketsForSale = await E(sellItemsPublicFacet).getAvailableItems();

    t.is(ticketsForSale.value.length, 3, `3 tickets for sale`);

    return harden({
      sellItemsCreatorSeat,
      sellItemsCreatorFacet,
    });
  };

  // === Alice part ===
  // Alice is given an invitation for the ticket sales instance
  // and she has 100 moola
  const aliceBuysTicket1 = async (invitation, moola100Payment) => {
    const invitationIssuer = E(zoe).getInvitationIssuer();
    const {
      value: [{ instance }],
    } = await E(invitationIssuer).getAmountOf(invitation);
    const ticketSalesPublicFacet = await E(zoe).getPublicFacet(instance);
    const terms = await E(zoe).getTerms(instance);
    const ticketIssuer = await E(ticketSalesPublicFacet).getItemsIssuer();
    const ticketBrand = await E(ticketIssuer).getBrand();

    const alicePurse = await E(moolaIssuer).makeEmptyPurse();
    await E(alicePurse).deposit(moola100Payment);

    t.deepEqual(terms.pricePerItem, moola(22n), `pricePerItem is 22 moola`);

    const availableTickets = await E(
      ticketSalesPublicFacet,
    ).getAvailableItems();

    t.is(
      availableTickets.value.length,
      3,
      'Alice should see 3 available tickets',
    );
    assert(isSetValue(availableTickets.value));
    t.truthy(
      availableTickets.value.find(ticket => ticket.number === 1),
      `availableTickets contains ticket number 1`,
    );
    t.truthy(
      availableTickets.value.find(ticket => ticket.number === 2),
      `availableTickets contains ticket number 2`,
    );
    t.truthy(
      availableTickets.value.find(ticket => ticket.number === 3),
      `availableTickets contains ticket number 3`,
    );

    // find the value corresponding to ticket #1
    const ticket1Value = availableTickets.value.find(
      ticket => ticket.number === 1,
    );
    // make the corresponding amount
    const ticket1Amount = AmountMath.make(ticketBrand, harden([ticket1Value]));

    const aliceProposal = harden({
      give: { Money: terms.pricePerItem },
      want: { Items: ticket1Amount },
    });

    const alicePaymentForTicket = alicePurse.withdraw(terms.pricePerItem);

    const alicePaymentKeywordRecord = harden({ Money: alicePaymentForTicket });

    const seat = await E(zoe).offer(
      invitation,
      aliceProposal,
      alicePaymentKeywordRecord,
    );

    const offerResult = await E(seat).getOfferResult();
    t.is(
      offerResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    const aliceTickets = seat.getPayout('Items');
    const aliceBoughtTicketAmount = await E(ticketIssuer).getAmountOf(
      aliceTickets,
    );

    t.is(
      aliceBoughtTicketAmount.value[0].show,
      'Steven Universe, the Opera',
      'Alice should have received the ticket for the correct show',
    );
    t.is(
      aliceBoughtTicketAmount.value[0].number,
      1,
      'Alice should have received the ticket for the correct number',
    );
  };

  // === Joker part ===
  // Joker starts with 100 moolas
  // Joker attempts to buy ticket 1 (and should fail)
  const jokerBuysTicket1 = async (untrustedInvitation, moola100Payment) => {
    const invitationIssuer = E(zoe).getInvitationIssuer();
    const invitation = await E(invitationIssuer).claim(untrustedInvitation);
    const {
      value: [{ instance: ticketSalesInstance }],
    } = await E(invitationIssuer).getAmountOf(invitation);
    const ticketSalesPublicFacet = await E(zoe).getPublicFacet(
      ticketSalesInstance,
    );
    const ticketIssuer = await E(ticketSalesPublicFacet).getItemsIssuer();
    const ticketBrand = await E(ticketIssuer).getBrand();

    const jokerPurse = await E(moolaIssuer).makeEmptyPurse();
    await E(jokerPurse).deposit(moola100Payment);

    const { pricePerItem } = await E(zoe).getTerms(ticketSalesInstance);

    // Joker does NOT check available tickets and tries to buy the ticket
    // number 1(already bought by Alice, but he doesn't know)
    const ticket1Amount = AmountMath.make(
      ticketBrand,
      harden([
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 1,
          uri: NaN
        },
      ]),
    );

    const jokerProposal = harden({
      give: { Money: pricePerItem },
      want: { Items: ticket1Amount },
    });

    const jokerPaymentForTicket = jokerPurse.withdraw(pricePerItem);

    const seat = await E(zoe).offer(
      invitation,
      jokerProposal,
      harden({
        Money: jokerPaymentForTicket,
      }),
    );

    await t.throwsAsync(
      seat.getOfferResult(),
      { message: /Some of the wanted items were not available for sale/ },
      'ticket 1 is no longer available',
    );

    const jokerTicketPayoutAmount = await ticketIssuer.getAmountOf(
      seat.getPayout('Items'),
    );
    const jokerMoneyPayoutAmount = await moolaIssuer.getAmountOf(
      seat.getPayout('Money'),
    );

    t.truthy(
      AmountMath.isEmpty(jokerTicketPayoutAmount),
      'Joker should not receive ticket #1',
    );
    t.deepEqual(
      jokerMoneyPayoutAmount,
      moola(22n),
      'Joker should get a refund after trying to get ticket #1',
    );
  };

  // Joker attempts to buy ticket 2 for 1 moola (and should fail)
  const jokerTriesToBuyTicket2 = async (
    untrustedInvitation,
    moola100Payment,
  ) => {
    const invitationIssuer = E(zoe).getInvitationIssuer();
    const invitation = await E(invitationIssuer).claim(untrustedInvitation);
    const {
      value: [{ instance: ticketSalesInstance }],
    } = await E(invitationIssuer).getAmountOf(invitation);
    const ticketSalesPublicFacet = await E(zoe).getPublicFacet(
      ticketSalesInstance,
    );
    const ticketIssuer = await E(ticketSalesPublicFacet).getItemsIssuer();
    const ticketBrand = await E(ticketIssuer).getBrand();

    const jokerPurse = await E(moolaIssuer).makeEmptyPurse();
    await E(jokerPurse).deposit(moola100Payment);

    const ticket2Amount = AmountMath.make(
      ticketBrand,
      harden([
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 2,
          uri: NaN
        },
      ]),
    );

    const insufficientAmount = moola(1n);
    const jokerProposal = harden({
      give: { Money: insufficientAmount },
      want: { Items: ticket2Amount },
    });

    const jokerInsufficientPaymentForTicket =
      jokerPurse.withdraw(insufficientAmount);

    const seat = await E(zoe).offer(
      invitation,
      jokerProposal,
      harden({
        Money: jokerInsufficientPaymentForTicket,
      }),
    );

    await t.throwsAsync(
      seat.getOfferResult(),
      { message: /More money.*is required to buy these items/ },
      'outcome from Joker should throw when trying to buy a ticket for 1 moola',
    );

    const jokerTicketPayoutAmount = await ticketIssuer.getAmountOf(
      seat.getPayout('Items'),
    );
    const jokerMoneyPayoutAmount = await moolaIssuer.getAmountOf(
      seat.getPayout('Money'),
    );

    t.truthy(
      AmountMath.isEmpty(jokerTicketPayoutAmount),
      'Joker should not receive ticket #2',
    );
    t.deepEqual(
      jokerMoneyPayoutAmount,
      insufficientAmount,
      'Joker should get a refund after trying to get ticket #2 for 1 moola',
    );
  };

  const bobBuysTicket2And3 = async (untrustedInvitation, moola100Payment) => {
    const invitationIssuer = E(zoe).getInvitationIssuer();
    const invitation = await E(invitationIssuer).claim(untrustedInvitation);
    const {
      value: [{ instance: ticketSalesInstance }],
    } = await E(invitationIssuer).getAmountOf(invitation);
    const ticketSalesPublicFacet = await E(zoe).getPublicFacet(
      ticketSalesInstance,
    );
    const terms = await E(zoe).getTerms(ticketSalesInstance);
    const ticketIssuer = await E(ticketSalesPublicFacet).getItemsIssuer();
    const ticketBrand = await E(ticketIssuer).getBrand();

    const bobPurse = await E(moolaIssuer).makeEmptyPurse();
    await E(bobPurse).deposit(moola100Payment);

   
    const availableTickets = await E(
      ticketSalesPublicFacet,
    ).getAvailableItems();

    assert(isSetValue(availableTickets.value));
    // Bob sees the currently available tickets
    t.is(
      availableTickets.value.length,
      2,
      'Bob should see 2 available tickets',
    );
    t.truthy(
      !availableTickets.value.find(ticket => ticket.number === 1),
      `availableTickets should NOT contain ticket number 1`,
    );
    t.truthy(
      availableTickets.value.find(ticket => ticket.number === 2),
      `availableTickets should still contain ticket number 2`,
    );
    t.truthy(
      availableTickets.value.find(ticket => ticket.number === 3),
      `availableTickets should still contain ticket number 3`,
    );

    // Bob buys tickets 2 and 3
    const ticket2and3Amount = AmountMath.make(
      ticketBrand,
      harden([
        availableTickets.value.find(ticket => ticket.number === 2),
        availableTickets.value.find(ticket => ticket.number === 3),
      ]),
    );

    const totalCost = moola(2n * terms.pricePerItem.value);

    const bobProposal = harden({
      give: { Money: totalCost },
      want: { Items: ticket2and3Amount },
    });
    const bobPaymentForTicket = await E(bobPurse).withdraw(totalCost);
    const paymentKeywordRecord = harden({
      Money: bobPaymentForTicket,
    });

    const seat = await E(zoe).offer(
      invitation,
      bobProposal,
      paymentKeywordRecord,
    );

    const bobTicketAmount = await E(ticketIssuer).getAmountOf(
      seat.getPayout('Items'),
    );
    t.is(bobTicketAmount.value.length, 2, 'Bob should have received 2 tickets');
    t.truthy(
      bobTicketAmount.value.find(ticket => ticket.number === 2),
      'Bob should have received tickets #2',
    );
    t.truthy(
      bobTicketAmount.value.find(ticket => ticket.number === 3),
      'Bob should have received tickets #3',
    );
  };

  // === Final Opera part ===
  const ticketSellerClosesContract = async sellItemsCreatorSeat => {
    const operaPurse = moolaIssuer.makeEmptyPurse();

    const moneyPayment = await E(sellItemsCreatorSeat).getPayout('Money');
    await E(operaPurse).deposit(moneyPayment);
    const currentPurseBalance = await E(operaPurse).getCurrentAmount();

    t.is(
      currentPurseBalance.value,
      3n * 22n,
      `The Opera should get ${3 * 22} moolas from ticket sales`,
    );
  };

  const { sellItemsCreatorSeat, sellItemsCreatorFacet } = await mintTickets();
  const ticketSalesInvitation1 = E(sellItemsCreatorFacet).makeBuyerInvitation();
  await aliceBuysTicket1(
    ticketSalesInvitation1,
    moolaMint.mintPayment(moola(100n)),
  );
  const ticketSalesInvitation2 = E(sellItemsCreatorFacet).makeBuyerInvitation();
  await jokerBuysTicket1(
    ticketSalesInvitation2,
    moolaMint.mintPayment(moola(100n)),
  );
  const ticketSalesInvitation3 = E(sellItemsCreatorFacet).makeBuyerInvitation();
  await jokerTriesToBuyTicket2(
    ticketSalesInvitation3,
    moolaMint.mintPayment(moola(100n)),
  );
  const ticketSalesInvitation4 = E(sellItemsCreatorFacet).makeBuyerInvitation();
  await bobBuysTicket2And3(
    ticketSalesInvitation4,
    moolaMint.mintPayment(moola(100n)),
  );
  await ticketSellerClosesContract(sellItemsCreatorSeat);
});

//
test('Testing publicFacet.getAvailableItemsNotifier()', async t => {
  // Setup initial conditions
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  const mintAndSellNFTBundle = await bundleSource(mintAndSellNFTRoot);
  vatAdminState.installBundle('b1-nft', mintAndSellNFTBundle);
  const mintAndSellNFTInstallation = await E(zoe).installBundleID('b1-nft');

  const sellItemsBundle = await bundleSource(sellItemsRoot);
  vatAdminState.installBundle('b1-sell-items', sellItemsBundle);
  const sellItemsInstallation = await E(zoe).installBundleID('b1-sell-items');

  const { issuer: moolaIssuer, brand: moolaBrand } = makeIssuerKit('moola');

  const { creatorFacet: goldenBirdsMaker } = await E(zoe).startInstance(
    mintAndSellNFTInstallation,
  );
  const { sellItemsCreatorSeat, sellItemsInstance } = await E(
    goldenBirdsMaker,
  ).sellTokens({
    customValueProperties: {
      description: ''.concat(
        'A small golden bird, often considered',
        ' a good luck charm in some cultures. ',
        ' Manufactured by casting.',
      ),
    },
    count: 23,
    moneyIssuer: moolaIssuer,
    sellItemsInstallation,
    pricePerItem: AmountMath.make(moolaBrand, 634n),
  });
  t.is(
    await sellItemsCreatorSeat.getOfferResult(),
    defaultAcceptanceMsg,
    `escrowBirdsOutcome is default acceptance message`,
  );

  const birdIssuerP = E(goldenBirdsMaker).getIssuer();
  const birdBrand = await E(birdIssuerP).getBrand();
  const birdSalesPublicFacet = E(zoe).getPublicFacet(sellItemsInstance);
  const birdsForSale = await E(birdSalesPublicFacet).getAvailableItems();
  const birdsForSaleNotifier =
    E(birdSalesPublicFacet).getAvailableItemsNotifier();

  const birdsForSalePresolved = await E(birdsForSaleNotifier).getUpdateSince();
  t.is(birdsForSale, birdsForSalePresolved.value);
  t.is(birdsForSale.brand, birdBrand);
  t.is(birdsForSalePresolved.value.brand, birdBrand);
});
*/