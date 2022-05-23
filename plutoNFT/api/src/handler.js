// @ts-check
import { E } from '@endo/eventual-send';
import { makeWebSocketHandler } from './lib-http.js';
import { AmountMath } from '@agoric/ertp';

const spawnHandler = (
  {
    creatorFacet,
    board,
    http,
    invitationIssuer,
    nftBrand,
    moneyBrand,
    nftMint,
    zoe,
  },
  _invitationMaker,
) =>
  makeWebSocketHandler(http, (send, _meta) =>
    harden({
      async onMessage(obj) {
        switch (obj.type) {
          /*
          case 'fungibleFaucet/sendInvitation': {
            const { depositFacetId, offer } = obj.data;
            const depositFacet = E(board).getValue(depositFacetId);
            const invitation = await E(creatorFacet).makeBuyerInvitation();
            const invitationAmount = await E(invitationIssuer).getAmountOf(
              invitation,
            );
            const {
              value: [{ handle }],
            } = invitationAmount;
            const invitationHandleBoardId = await E(board).getId(handle);
            const updatedOffer = { ...offer, invitationHandleBoardId };
            // We need to wait for the invitation to be
            // received, or we will possibly win the race of
            // proposing the offer before the invitation is ready.
            // TODO: We should make this process more robust.
            await E(depositFacet).receive(invitation);

            send({
              type: 'fungibleFaucet/sendInvitationResponse',
              data: { offer: updatedOffer },
            });
            return true;
          }
          */

          case 'fungibleFaucet/sendInvitation': {
            const { depositFacetId, offer, nft } = obj.data;
            const depositFacet = E(board).getValue(depositFacetId);

            const invitation = await E(creatorFacet).createInvitation();
            const nftAmount = AmountMath.make(nftBrand, harden([nft]));

            const nftPayment = nftMint.mintPayment(nftAmount);

            const proposal = harden({
              give: { Item: nftAmount },
              want: { Money: AmountMath.make(moneyBrand, 1n) },
            });
            const paymentKeywordRecord = harden({ Item: nftPayment });

            const sellerSeat = await E(zoe).offer(
              invitation,
              proposal,
              paymentKeywordRecord,
            );

            // const sellerSeat = await E(creatorFacet).mintNFT({ url: imageURI });

            // const nftIssuer = await E(publicFacet).getIssuer();
            // const nftBrand = await E(nftIssuer).getBrand();

            const buyersInvitation = await E(sellerSeat).getOfferResult();

            const invitationAmount = await E(invitationIssuer).getAmountOf(
              buyersInvitation,
            );
            const {
              value: [{ handle }],
            } = invitationAmount;
            const invitationHandleBoardId = await E(board).getId(handle);
            const updatedOffer = { ...offer, invitationHandleBoardId };
            await E(depositFacet).receive(buyersInvitation);

            send({
              type: 'fungibleFaucet/sendInvitationResponse',
              data: { offer: updatedOffer },
            });
            return true;
          }

          default:
            return undefined;
        }
      },
    }),
  );

export default harden(spawnHandler);
