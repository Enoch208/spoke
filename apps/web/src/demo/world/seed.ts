import { campaigns } from "./campaigns";
import { merchants, products, tokens } from "./catalog";
import { buildNodes } from "./graph";
import { buyerPersona, distributors, merchantOwners, operator } from "./people";
import { createRandom } from "./random";
import { buildSales } from "./sales";
import { buildSettlement } from "./settlement";
import type { DemoCore, DemoPerson } from "./types";

export const WORLD_SEED = 20_261_012;

const first = (person: DemoPerson) => {
  const address = person.addresses[0];
  if (!address) throw new RangeError(`${person.id} has no address.`);
  return address;
};

export const seedCore = (anchor: number): DemoCore => {
  const random = createRandom(WORLD_SEED);
  const sellers = merchantOwners(anchor);
  const sharers = distributors(anchor);
  const buyer = buyerPersona(anchor);
  const ops = operator(anchor);
  const merchantList = merchants(anchor);
  const productList = products();
  const campaignList = campaigns(anchor);
  const nodes = buildNodes(anchor, { distributors: sharers, buyer }, random);
  const sales = buildSales({
    anchor,
    campaigns: campaignList,
    products: productList,
    nodes,
    buyerPersona: first(buyer),
    random,
  });
  const persona = sharers[0];
  const merchantPersona = sellers[0];
  if (!persona || !merchantPersona) throw new RangeError("The sample world needs its personas.");
  const { claims, fundings } = buildSettlement({
    anchor,
    campaigns: campaignList,
    merchants: merchantList,
    sales,
    personaAddress: first(persona),
    random,
  });
  return {
    anchor,
    tokens,
    people: [...sharers, ...sellers, buyer, ops],
    merchants: merchantList,
    products: productList,
    campaigns: campaignList,
    nodes,
    sales,
    claims,
    fundings,
    personas: { merchant: merchantPersona.id, distributor: persona.id, buyer: buyer.id },
    operatorId: ops.id,
  };
};
